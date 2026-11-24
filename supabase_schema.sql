-- ============================================================================
-- ELDORIA: RPG ADVENTURE - SUPABASE CLOUD SAVE SCHEMA
-- Tabel: player_saves (Penyimpanan Progres Lintas Perangkat / Cross-Device Save)
-- ============================================================================

-- 1. Buat Tabel player_saves jika belum ada
CREATE TABLE IF NOT EXISTS public.player_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    save_version INTEGER NOT NULL DEFAULT 1,
    profile_name TEXT,
    save_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT player_saves_user_id_key UNIQUE (user_id)
);

-- 2. Index untuk performa query cepat berdasarkan user_id
CREATE INDEX IF NOT EXISTS idx_player_saves_user_id ON public.player_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_player_saves_updated_at ON public.player_saves(updated_at DESC);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.player_saves ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan RLS (Row Level Security Policies)
-- Memastikan pemain HANYA dapat membaca, menulis, memperbarui, dan menghapus data miliknya sendiri

-- Policy SELECT: Pemain hanya boleh membaca save data miliknya sendiri
CREATE POLICY "Pemain hanya bisa membaca save miliknya sendiri"
ON public.player_saves
FOR SELECT
USING (auth.uid() = user_id);

-- Policy INSERT: Pemain hanya boleh memasukkan save data dengan user_id miliknya
CREATE POLICY "Pemain hanya bisa menambah save miliknya sendiri"
ON public.player_saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: Pemain hanya boleh memperbarui save data miliknya sendiri
CREATE POLICY "Pemain hanya bisa memperbarui save miliknya sendiri"
ON public.player_saves
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy DELETE: Pemain hanya boleh menghapus save data miliknya sendiri
CREATE POLICY "Pemain hanya bisa menghapus save miliknya sendiri"
ON public.player_saves
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Trigger Otomatis untuk memperbarui kolom updated_at setiap ada perubahan data
CREATE OR REPLACE FUNCTION public.handle_player_save_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_player_save_timestamp ON public.player_saves;
CREATE TRIGGER trigger_player_save_timestamp
BEFORE UPDATE ON public.player_saves
FOR EACH ROW
EXECUTE FUNCTION public.handle_player_save_timestamp();
