-- ============================================================
-- M.A.G.I. TASK IMPORTANCE — Run in Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS importance integer NOT NULL DEFAULT 0;
