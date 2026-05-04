-- ============================================================
-- M.A.G.I. SHARED LISTS — DEFINITIVE RLS FIX
-- Run this in Supabase Dashboard > SQL Editor
--
-- Root cause: members_select queried lists, lists_select queried
-- list_members → infinite loop. Fix: members_select only checks
-- the user's own email, no table cross-reference.
-- ============================================================

-- Drop everything from both previous migrations cleanly
DROP POLICY IF EXISTS "lists_select_own"  ON public.lists;
DROP POLICY IF EXISTS "lists_update_own"  ON public.lists;
DROP POLICY IF EXISTS "members_select"    ON public.list_members;
DROP POLICY IF EXISTS "members_insert"    ON public.list_members;
DROP POLICY IF EXISTS "members_delete"    ON public.list_members;
DROP POLICY IF EXISTS "tasks_select_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own"  ON public.tasks;

-- Drop the security definer function if it was created
DROP FUNCTION IF EXISTS public.is_list_member(uuid);

-- ── LISTS ────────────────────────────────────────────────────
-- lists_select: own lists + lists shared to me via email
-- (queries list_members, but list_members policy below does NOT
--  query lists back, so no cycle)
CREATE POLICY "lists_select_own" ON public.lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR id IN (
      SELECT list_id FROM public.list_members
      WHERE user_email = auth.email()
    )
  );

CREATE POLICY "lists_update_own" ON public.lists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR id IN (
      SELECT list_id FROM public.list_members
      WHERE user_email = auth.email()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    OR id IN (
      SELECT list_id FROM public.list_members
      WHERE user_email = auth.email()
    )
  );

-- ── LIST_MEMBERS ─────────────────────────────────────────────
-- SELECT: each user sees only rows where their email matches.
-- No reference to lists table → no recursion.
CREATE POLICY "members_select" ON public.list_members
  FOR SELECT USING (auth.email() = user_email);

-- INSERT / DELETE: only the list owner can manage members.
-- Queries lists, but lists_select_own → queries list_members
-- with the simple email check above → no further recursion.
CREATE POLICY "members_insert" ON public.list_members
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_delete" ON public.list_members
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
    )
  );

-- ── TASKS ────────────────────────────────────────────────────
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

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

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );
