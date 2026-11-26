import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  getGuestSaveData,
  saveGuestSaveData,
  hasLocalGuestProgress,
  EldoriaGuestSaveData,
  SAVE_SCHEMA_VERSION,
  RoleSaveData,
} from './guestSaveManager';
import { CharacterClass } from '../../types/game';

export type CloudSyncStatus = 'guest' | 'synced' | 'syncing' | 'offline' | 'error';

export interface CloudUser {
  id: string;
  email: string;
  displayName?: string;
  createdAt?: string;
}

export interface PlayerCloudSaveRecord {
  id?: string;
  user_id: string;
  save_version: number;
  profile_name: string;
  save_data: EldoriaGuestSaveData;
  updated_at: string;
}

export interface MigrationDialogData {
  isOpen: boolean;
  userEmail: string;
  localRoles: CharacterClass[];
  cloudHasData: boolean;
  onMigrateLocalToCloud: () => Promise<void>;
  onUseCloudData: () => Promise<void>;
  onDismiss: () => void;
}

class CloudSyncManager {
  private user: CloudUser | null = null;
  private syncStatus: CloudSyncStatus = 'guest';
  private lastSyncedAt: number | null = null;
  private isDirty = false;
  private autoSyncIntervalId: number | null = null;
  private isSyncing = false;
  private migrationHandler: ((data: MigrationDialogData) => void) | null = null;
  private statusListeners: Set<(status: CloudSyncStatus) => void> = new Set();
  private userListeners: Set<(user: CloudUser | null) => void> = new Set();

  constructor() {
    this.init();
  }

  /**
   * Inisialisasi Auth Listener dan Session Check
   */
  public async init(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      this.setStatus('guest');
      return;
    }

    try {
      // 1. Cek sesi yang ada saat ini
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.warn('[CloudSync] Error getSession:', error.message);
      }

      if (session?.user) {
        this.setUser({
          id: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.display_name ||
            session.user.email?.split('@')[0] ||
            'Pahlawan Eldoria',
          createdAt: session.user.created_at,
        });
        // Unduh data cloud setelah login terdeteksi
        await this.syncOnStartup();
      } else {
        this.setUser(null);
        this.setStatus('guest');
      }

      // 2. Pasang Auth State Change listener
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          const cloudUser: CloudUser = {
            id: newSession.user.id,
            email: newSession.user.email || '',
            displayName:
              newSession.user.user_metadata?.display_name ||
              newSession.user.email?.split('@')[0] ||
              'Pahlawan Eldoria',
            createdAt: newSession.user.created_at,
          };
          this.setUser(cloudUser);
          await this.handlePostLoginCheck();
        } else if (event === 'SIGNED_OUT') {
          this.setUser(null);
          this.setStatus('guest');
          this.stopAutoSync();
        }
      });
    } catch (err) {
      console.warn('[CloudSync] Exception during init:', err);
      this.setStatus('guest');
    }
  }

  /**
   * Daftarkan handler UI untuk modal migrasi data guest ke cloud
   */
  public setMigrationHandler(handler: (data: MigrationDialogData) => void): void {
    this.migrationHandler = handler;
  }

  public subscribeStatus(listener: (status: CloudSyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.syncStatus);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeUser(listener: (user: CloudUser | null) => void): () => void {
    this.userListeners.add(listener);
    listener(this.user);
    return () => this.userListeners.delete(listener);
  }

  public getUser(): CloudUser | null {
    return this.user;
  }

  public getStatus(): CloudSyncStatus {
    return this.syncStatus;
  }

  public getLastSyncedAt(): number | null {
    return this.lastSyncedAt;
  }

  public getLastSyncedTimeString(): string {
    if (!this.lastSyncedAt) return 'Belum tersinkron';
    const now = Date.now();
    const diffSec = Math.floor((now - this.lastSyncedAt) / 1000);
    if (diffSec < 10) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} detik lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours} jam lalu`;
  }

  private setStatus(status: CloudSyncStatus): void {
    this.syncStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('eldoria_cloud_sync_status', {
          detail: { status, lastSyncedAt: this.lastSyncedAt },
        })
      );
    }
  }

  private setUser(user: CloudUser | null): void {
    this.user = user;
    this.userListeners.forEach((fn) => fn(user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eldoria_cloud_user_changed', { detail: user }));
    }
    if (user) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Tandai bahwa terdapat data baru yang perlu dikirim ke cloud
   */
  public markDirty(): void {
    this.isDirty = true;
    if (this.user && this.syncStatus === 'synced') {
      // Tetap synced di cache, auto-sync akan mengirimkan dalam interval
    }
  }

  /**
   * Pemicu instan pada momen penting (naik level, selesai quest, transaksi toko, ganti role)
   */
  public async triggerMilestoneSync(reason: string = 'milestone'): Promise<void> {
    if (!this.user) return;
    this.isDirty = true;
    console.info(`[CloudSync] Instan sync dipicu oleh: ${reason}`);
    await this.syncLocalToCloud(true);
  }

  /**
   * Loop Auto-Sync Background setiap 20 detik (Anti-Spam)
   */
  private startAutoSync(): void {
    this.stopAutoSync();
    this.autoSyncIntervalId = window.setInterval(async () => {
      if (this.user && this.isDirty && !this.isSyncing) {
        await this.syncLocalToCloud(false);
      }
    }, 20000);
  }

  private stopAutoSync(): void {
    if (this.autoSyncIntervalId !== null) {
      clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
  }

  /**
   * Unduh save data dari Cloud database
   */
  public async fetchCloudSave(): Promise<PlayerCloudSaveRecord | null> {
    if (!supabase || !this.user) return null;

    try {
      const { data, error } = await supabase
        .from('player_saves')
        .select('*')
        .eq('user_id', this.user.id)
        .maybeSingle();

      if (error) {
        console.warn('[CloudSync] Gagal mengambil cloud save:', error.message);
        return null;
      }

      return data as PlayerCloudSaveRecord | null;
    } catch (err) {
      console.warn('[CloudSync] Error fetchCloudSave:', err);
      return null;
    }
  }

  /**
   * Jalankan pengecekan setelah Login / Registrasi:
   * 1. Cek apakah ada data lokal di guestSaveManager
   * 2. Tampilkan dialog konfirmasi jika ada progres guest lokal
   */
  private async handlePostLoginCheck(): Promise<void> {
    if (!this.user) return;

    const hasLocal = hasLocalGuestProgress();
    const cloudRecord = await this.fetchCloudSave();

    const localData = getGuestSaveData();
    const localRoles = Object.keys(localData.roleSaves || {}) as CharacterClass[];

    // Jika ada progres lokal dan ada handler dialog migrasi
    if (hasLocal && this.migrationHandler) {
      this.migrationHandler({
        isOpen: true,
        userEmail: this.user.email,
        localRoles,
        cloudHasData: !!cloudRecord,
        onMigrateLocalToCloud: async () => {
          await this.migrateGuestToCloud();
        },
        onUseCloudData: async () => {
          if (cloudRecord) {
            await this.applyCloudSaveToLocal(cloudRecord);
          }
        },
        onDismiss: () => {
          if (cloudRecord) {
            this.applyCloudSaveToLocal(cloudRecord);
          }
        },
      });
      return;
    }

    // Jika tidak ada progres guest lokal tetapi cloud memiliki data, langsung muat
    if (cloudRecord) {
      await this.applyCloudSaveToLocal(cloudRecord);
    } else if (hasLocal) {
      // Tidak ada dialog tapi ada data lokal: langsung upload ke cloud
      await this.migrateGuestToCloud();
    } else {
      this.setStatus('synced');
      this.lastSyncedAt = Date.now();
    }
  }

  /**
   * Pengecekan saat halaman pertama kali dimuat dengan sesi login aktif
   */
  private async syncOnStartup(): Promise<void> {
    if (!this.user) return;
    this.setStatus('syncing');

    try {
      const cloudRecord = await this.fetchCloudSave();
      if (cloudRecord && cloudRecord.save_data) {
        const localData = getGuestSaveData();
        const cloudUpdatedAt = new Date(cloudRecord.updated_at).getTime();
        const localSavedAt = this.getLatestLocalSaveTimestamp(localData);

        // Jika data cloud lebih baru daripada data lokal, muat data cloud
        if (cloudUpdatedAt >= localSavedAt) {
          await this.applyCloudSaveToLocal(cloudRecord);
        } else {
          // Data lokal lebih baru (misal dimainkan offline sebelum connect), sinkronkan ke cloud
          await this.syncLocalToCloud(true);
        }
      } else {
        // Akun cloud baru, simpan data saat ini ke cloud
        await this.syncLocalToCloud(true);
      }
    } catch (err) {
      console.warn('[CloudSync] Error syncOnStartup:', err);
      this.setStatus('offline');
    }
  }

  private getLatestLocalSaveTimestamp(data: EldoriaGuestSaveData): number {
    let latest = data.guestProfile.createdAt || 0;
    if (data.roleSaves) {
      for (const key of Object.keys(data.roleSaves) as CharacterClass[]) {
        const role = data.roleSaves[key];
        if (role?.savedAt && role.savedAt > latest) {
          latest = role.savedAt;
        }
      }
    }
    return latest;
  }

  /**
   * Pastikan pengaturan cache lokal (browser-only) tidak pernah terbawa ke/dari payload cloud.
   */
  private cloneWithoutLocalOnlyFlags(data: EldoriaGuestSaveData): EldoriaGuestSaveData {
    const cloned = JSON.parse(JSON.stringify(data)) as EldoriaGuestSaveData & {
      deviceSettings: Record<string, unknown>;
    };
    if (cloned.deviceSettings && typeof cloned.deviceSettings === 'object') {
      delete cloned.deviceSettings.enableWorldCache;
      delete cloned.deviceSettings.worldCacheEnabled;
      delete cloned.deviceSettings.eldoria_local_world_cache_enabled;
      delete cloned.deviceSettings.devTestingSettings;
      delete cloned.deviceSettings.devModeEnabled;
      delete cloned.deviceSettings.eldoria_dev_testing_settings_v1;
    }
    return cloned;
  }

  /**
   * Muat data cloud ke dalam localStorage perangkat dan picu event reaktif
   */
  public async applyCloudSaveToLocal(cloudRecord: PlayerCloudSaveRecord): Promise<void> {
    try {
      const cloudSaveData = cloudRecord.save_data;
      if (cloudSaveData && typeof cloudSaveData === 'object') {
        const sanitized = this.cloneWithoutLocalOnlyFlags(cloudSaveData);
        saveGuestSaveData(sanitized);
        this.lastSyncedAt = new Date(cloudRecord.updated_at).getTime() || Date.now();
        this.isDirty = false;
        this.setStatus('synced');

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('eldoria_cloud_save_loaded', { detail: sanitized })
          );
        }
        console.info('[CloudSync] Save data cloud berhasil dimuat ke cache perangkat.');
      }
    } catch (err) {
      console.error('[CloudSync] Gagal menerapkan cloud save:', err);
      this.setStatus('error');
    }
  }

  /**
   * Pindahkan & gabungkan progres akun Guest lokal ke akun Cloud pemain
   */
  public async migrateGuestToCloud(): Promise<void> {
    if (!this.user || !supabase) return;
    this.setStatus('syncing');

    try {
      const localData = this.cloneWithoutLocalOnlyFlags(getGuestSaveData());
      // Perbarui nama profil guest jika pemain login
      if (this.user.displayName) {
        localData.guestProfile.displayName = this.user.displayName;
      }

      saveGuestSaveData(localData);

      const payload = {
        user_id: this.user.id,
        save_version: SAVE_SCHEMA_VERSION,
        profile_name: this.user.displayName || localData.guestProfile.displayName,
        save_data: localData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('player_saves').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) {
        throw error;
      }

      this.lastSyncedAt = Date.now();
      this.isDirty = false;
      this.setStatus('synced');
      console.info('[CloudSync] Progres Guest berhasil dimigrasikan ke Cloud!');
    } catch (err) {
      console.error('[CloudSync] Gagal migrasi data Guest:', err);
      this.setStatus('error');
    }
  }

  /**
   * Sinkronisasi data lokal ke Cloud Database
   */
  public async syncLocalToCloud(forceInstant = false): Promise<boolean> {
    if (!this.user || !supabase) {
      this.setStatus('guest');
      return false;
    }

    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.setStatus('syncing');

    try {
      const currentLocal = this.cloneWithoutLocalOnlyFlags(getGuestSaveData());
      const payload = {
        user_id: this.user.id,
        save_version: SAVE_SCHEMA_VERSION,
        profile_name: this.user.displayName || currentLocal.guestProfile.displayName,
        save_data: currentLocal,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('player_saves').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) {
        console.warn('[CloudSync] Upsert error:', error.message);
        this.setStatus('offline');
        this.isSyncing = false;
        return false;
      }

      this.lastSyncedAt = Date.now();
      this.isDirty = false;
      this.setStatus('synced');
      this.isSyncing = false;
      return true;
    } catch (err) {
      console.warn('[CloudSync] Network/offline sync error:', err);
      this.setStatus('offline');
      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Autentikasi: Login dengan Email & Password
   */
  public async loginWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Layanan Supabase Cloud belum dikonfigurasi. Periksa file .env untuk mengisi VITE_SUPABASE_URL.',
      };
    }

    try {
      this.setStatus('syncing');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        this.setStatus('guest');
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.setUser({
          id: data.user.id,
          email: data.user.email || email,
          displayName:
            data.user.user_metadata?.display_name ||
            email.split('@')[0] ||
            'Pahlawan Eldoria',
        });
        await this.handlePostLoginCheck();
        return { success: true };
      }

      return { success: false, error: 'User tidak ditemukan' };
    } catch (err: any) {
      this.setStatus('guest');
      return { success: false, error: err.message || 'Terjadi kesalahan jaringan' };
    }
  }

  /**
   * Autentikasi: Daftar Akun Baru (Register)
   */
  public async registerWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Layanan Supabase Cloud belum dikonfigurasi. Periksa file .env untuk mengisi VITE_SUPABASE_URL.',
      };
    }

    try {
      this.setStatus('syncing');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName?.trim() || email.split('@')[0],
          },
        },
      });

      if (error) {
        this.setStatus('guest');
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Jika auto-confirm aktif atau ada session langsung
        if (data.session) {
          this.setUser({
            id: data.user.id,
            email: data.user.email || email,
            displayName: displayName?.trim() || email.split('@')[0],
          });
          await this.handlePostLoginCheck();
          return { success: true };
        } else {
          this.setStatus('guest');
          return {
            success: true,
            message: 'Registrasi berhasil! Silakan periksa email Anda untuk tautan verifikasi akun.',
          };
        }
      }

      return { success: false, error: 'Pendaftaran gagal' };
    } catch (err: any) {
      this.setStatus('guest');
      return { success: false, error: err.message || 'Terjadi kesalahan sistem' };
    }
  }

  /**
   * Autentikasi: Login dengan Google OAuth
   */
  public async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Layanan Supabase Cloud belum dikonfigurasi di file .env.',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'OAuth error' };
    }
  }

  /**
   * Logout dari Akun Cloud
   */
  public async logout(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[CloudSync] Error signOut:', err);
      }
    }
    this.setUser(null);
    this.setStatus('guest');
    this.lastSyncedAt = null;
    this.isDirty = false;
    console.info('[CloudSync] Berhasil logout. Game kembali ke mode Guest.');
  }
}

export const cloudSyncManager = new CloudSyncManager();
