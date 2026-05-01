-- ============================================================
-- M.A.G.I. SHARED LISTS — run in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Shared list membership table
CREATE TABLE IF NOT EXISTS public.list_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_email)
);

CREATE INDEX IF NOT EXISTS list_members_list_id_idx ON public.list_members(list_id);
CREATE INDEX IF NOT EXISTS list_members_email_idx   ON public.list_members(user_email);

ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own memberships; owners can see all members of their lists
DROP POLICY IF EXISTS "members_select" ON public.list_members;
CREATE POLICY "members_select" ON public.list_members
  FOR SELECT USING (
    auth.email() = user_email
    OR list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
  );

-- Only the list owner can add/remove members
DROP POLICY IF EXISTS "members_insert" ON public.list_members;
CREATE POLICY "members_insert" ON public.list_members
  FOR INSERT WITH CHECK (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete" ON public.list_members;
CREATE POLICY "members_delete" ON public.list_members
  FOR DELETE USING (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
  );

-- 2. Update lists RLS — shared members can select + update, only owner can delete
DROP POLICY IF EXISTS "lists_select_own" ON public.lists;
CREATE POLICY "lists_select_own" ON public.lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (SELECT list_id FROM public.list_members WHERE user_email = auth.email())
  );

DROP POLICY IF EXISTS "lists_update_own" ON public.lists;
CREATE POLICY "lists_update_own" ON public.lists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR id IN (SELECT list_id FROM public.list_members WHERE user_email = auth.email())
  ) WITH CHECK (
    auth.uid() = user_id
    OR id IN (SELECT list_id FROM public.list_members WHERE user_email = auth.email())
  );

-- 3. Update tasks RLS — access follows list membership
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  ) WITH CHECK (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );
