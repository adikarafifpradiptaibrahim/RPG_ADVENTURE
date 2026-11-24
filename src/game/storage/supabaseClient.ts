import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Baca environment variables Vite
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl === 'YOUR_SUPABASE_URL' ||
    supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY' ||
    !supabaseUrl.startsWith('http')
  ) {
    return false;
  }
  return true;
};

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[SupabaseClient] Gagal inisialisasi Supabase client:', err);
    clientInstance = null;
  }
} else {
  // Petunjuk ramah di console tanpa menghentikan game
  if (typeof window !== 'undefined') {
    console.info(
      '%c[CloudSync]%c VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY belum dikonfigurasi di .env.\nGame berjalan aman dalam mode Guest (Lokal Browser). Untuk mengaktifkan Cross-Device Cloud Save, isi konfigurasi Supabase di file .env',
      'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'color: #94a3b8;'
    );
  }
}

export const supabase = clientInstance;
