import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Mail,
  Lock,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  Globe,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import {
  cloudSyncManager,
  CloudUser,
  MigrationDialogData,
} from '../game/storage/cloudSyncManager';
import { isSupabaseConfigured } from '../game/storage/supabaseClient';
import { soundManager } from '../game/audio';
import { CharacterClass } from '../types/game';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  migrationData?: MigrationDialogData | null;
  onResolveMigration?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  migrationData,
  onResolveMigration,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured] = useState(() => isSupabaseConfigured());

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsLoading(false);
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Mohon isi email dan kata sandi dengan lengkap.');
      return;
    }

    setIsLoading(true);
    soundManager.playChestOpen();

    const res = await cloudSyncManager.loginWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      soundManager.playLevelUp();
      setSuccessMsg('Berhasil masuk ke akun Cloud!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      soundManager.playPlayerHurt();
      setErrorMsg(res.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Mohon isi email dan kata sandi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    soundManager.playChestOpen();

    const res = await cloudSyncManager.registerWithEmail(email, password, displayName);
    setIsLoading(false);

    if (res.success) {
      soundManager.playLevelUp();
      if (res.message) {
        setSuccessMsg(res.message);
      } else {
        setSuccessMsg('Akun berhasil dibuat dan siap digunakan!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      }
    } else {
      soundManager.playPlayerHurt();
      setErrorMsg(res.error || 'Pendaftaran gagal. Silakan coba lagi.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    const res = await cloudSyncManager.loginWithGoogle();
    setIsLoading(false);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const getRoleBadge = (role: CharacterClass) => {
    switch (role) {
      case 'warrior':
        return <span key={role} className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-[11px] text-amber-300 font-bold">⚔️ Knight</span>;
      case 'mage':
        return <span key={role} className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-600/50 text-[11px] text-blue-300 font-bold">🔮 Mage</span>;
      case 'rogue':
        return <span key={role} className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-[11px] text-emerald-300 font-bold">🗡️ Assassin</span>;
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // TAMPILAN MODAL KONFIRMASI MIGRASI DATA GUEST KE CLOUD
  // --------------------------------------------------------------------------
  if (migrationData && migrationData.isOpen) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
        <div
          className="relative w-full max-w-lg rounded-2xl border-2 border-amber-500/70 p-6 sm:p-7 shadow-2xl text-stone-100 space-y-5"
          style={{
            background: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
            boxShadow: '0 0 50px rgba(245, 158, 11, 0.25), 0 20px 40px rgba(0,0,0,0.9)',
          }}
        >
          {/* Header Migrasi */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 text-2xl shadow-inner">
              ☁️
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide font-serif">
              Sinkronkan Progres Guest?
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md mx-auto">
              Ditemukan data progres bermain lokal dari perangkat ini. Apakah Anda ingin memindahkan data ini ke akun Cloud (<span className="text-amber-300 font-bold">{migrationData.userEmail}</span>)?
            </p>
          </div>

          {/* Ringkasan Data Progres Lokal */}
          <div className="p-4 rounded-xl border border-stone-800 bg-stone-950/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5 font-semibold text-stone-200">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Data Karakter Tersimpan di Browser:
              </span>
              <span className="text-emerald-400 font-bold text-[11px]">Siap Diunggah</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {migrationData.localRoles.length > 0 ? (
                migrationData.localRoles.map((r) => getRoleBadge(r))
              ) : (
                <span className="text-xs text-stone-500 italic">Pengaturan & Progres Profil Guest</span>
              )}
            </div>
            {migrationData.cloudHasData && (
              <p className="text-[11px] text-amber-400/90 pt-1 border-t border-stone-800/80">
                ⚠️ <span className="font-semibold">Catatan:</span> Akun cloud ini sudah memiliki save data sebelumnya. Memilih sinkronisasi akan menggabungkan & memperbarui data cloud dengan versi terbaru Anda.
              </p>
            )}
          </div>

          {/* Tombol Tindakan */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                soundManager.playChestOpen();
                await migrationData.onMigrateLocalToCloud();
                setIsLoading(false);
                soundManager.playLevelUp();
                onResolveMigration?.();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base tracking-wide uppercase transition-all duration-200 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg text-stone-950"
              style={{
                background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                border: '1px solid #fde047',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
              }}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>Ya, Pindahkan Progres ke Akun Cloud</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                await migrationData.onUseCloudData();
                setIsLoading(false);
                onResolveMigration?.();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white font-semibold text-xs transition cursor-pointer text-center"
            >
              {migrationData.cloudHasData
                ? 'Gunakan Data Cloud yang Sudah Ada (Abaikan Progres Lokal)'
                : 'Mulai Baru (Jangan Pindahkan Progres Lokal)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // TAMPILAN UTAMA MODAL LOGIN / REGISTER
  // --------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="relative w-full max-w-md rounded-2xl border border-stone-700/80 p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4"
        style={{
          background: 'linear-gradient(180deg, #181513 0%, #0e0d0c 100%)',
          boxShadow: '0 0 35px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.9)',
        }}
      >
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/60 transition cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold shadow">
            <Cloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cross-Device Cloud Save</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide font-serif">
            {tab === 'login' ? 'Masuk ke Akun Cloud' : 'Buat Akun Eldoria'}
          </h2>
          <p className="text-xs text-stone-400">
            {tab === 'login'
              ? 'Sinkronkan semua progres karakter dan mainkan di perangkat manapun.'
              : 'Daftar gratis untuk mengamankan data dan bermain lintas perangkat.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-950 border border-stone-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all duration-150 cursor-pointer ${
              tab === 'login'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all duration-150 cursor-pointer ${
              tab === 'register'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Peringatan Fallback jika Supabase belum di-setup di .env */}
        {!isConfigured && (
          <div className="p-3 rounded-xl border border-amber-600/40 bg-amber-950/40 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Konfigurasi Supabase Belum Terhubung</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Variabel <code className="bg-stone-900 px-1 py-0.5 rounded text-amber-300">VITE_SUPABASE_URL</code> belum disetel di file <code className="bg-stone-900 px-1 py-0.5 rounded text-amber-300">.env</code>. Anda tetap dapat bermain 100% aman menggunakan mode Guest lokal browser.
            </p>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl border border-red-500/50 bg-red-950/50 text-red-200 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/50 text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {/* Form Auth */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Nama Pahlawan (Display Name)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  maxLength={24}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Arthur_Pendragon"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950/90 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hero@eldoria.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950/90 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950/90 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 outline-none transition"
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950/90 border border-stone-700 focus:border-amber-400 text-xs text-stone-100 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-sm tracking-wide transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-stone-950 shadow-md"
            style={{
              background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
              border: '1px solid #fde047',
            }}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {tab === 'login' ? 'Masuk ke Akun Cloud' : 'Buat Akun & Simpan Progres'}
            </span>
          </button>
        </form>

        {/* Separator / Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="w-full border-t border-stone-800" />
          <span className="absolute bg-[#12100f] px-2 text-[10.5px] text-stone-500 font-semibold uppercase">
            Atau
          </span>
        </div>

        {/* Google OAuth Button */}
        {isConfigured && (
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Lanjutkan dengan Akun Google</span>
          </button>
        )}

        {/* Lanjutkan sebagai Guest Button */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-stone-200 underline underline-offset-4 transition cursor-pointer"
          >
            Lanjutkan sebagai Mode Guest (Offline / Lokal Browser)
          </button>
        </div>
      </div>
    </div>
  );
};
