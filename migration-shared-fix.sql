-- ============================================================
-- M.A.G.I. SHARED LISTS — RLS FIX
-- Run this in Supabase Dashboard > SQL Editor
--
-- The original migration caused infinite recursion:
--   lists policy → queries list_members
--   list_members policy → queries lists → infinite loop
--
-- Fix: use a SECURITY DEFINER function that checks membership
-- directly, bypassing RLS on list_members entirely.
-- ============================================================

-- 1. Membership check function (runs without RLS on list_members)
CREATE OR REPLACE FUNCTION public.is_list_member(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.list_members
    WHERE list_id = p_list_id AND user_email = auth.email()
  );
$$;

-- 2. Fix lists policies
DROP POLICY IF EXISTS "lists_select_own" ON public.lists;
CREATE POLICY "lists_select_own" ON public.lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_list_member(id)
  );

DROP POLICY IF EXISTS "lists_update_own" ON public.lists;
CREATE POLICY "lists_update_own" ON public.lists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR public.is_list_member(id)
  ) WITH CHECK (
    auth.uid() = user_id
    OR public.is_list_member(id)
  );

-- 3. Fix tasks policies
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
    OR public.is_list_member(list_id)
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
      OR public.is_list_member(list_id)
    )
  );

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
    OR public.is_list_member(list_id)
  ) WITH CHECK (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
    OR public.is_list_member(list_id)
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (
    list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid())
    OR public.is_list_member(list_id)
  );
