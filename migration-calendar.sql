-- ============================================================
-- M.A.G.I. CALENDAR EVENTS — Run in Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  event_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_user_id_idx   ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_date_idx       ON public.events(event_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_all_own" ON public.events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
