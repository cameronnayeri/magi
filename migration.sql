-- Run this in Supabase Dashboard > SQL Editor if your tables already exist
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'cyan';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE public.tasks ALTER COLUMN deadline_days TYPE numeric;
