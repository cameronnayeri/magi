-- ============================================================
-- M.A.G.I. PROJECT TRACKER — run in Supabase Dashboard > SQL Editor
-- Adds per-list project tracking with delivery dates and task linking.
-- Run AFTER migration-shared.sql (requires list_members table).
-- ============================================================

-- ---------- LIST_PROJECTS ----------
CREATE TABLE IF NOT EXISTS public.list_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id       uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  status        text NOT NULL DEFAULT 'QUEUED',
  delivery_date date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS list_projects_list_id_idx ON public.list_projects(list_id);
ALTER TABLE public.list_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "list_projects_select" ON public.list_projects;
CREATE POLICY "list_projects_select" ON public.list_projects
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "list_projects_insert" ON public.list_projects;
CREATE POLICY "list_projects_insert" ON public.list_projects
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

DROP POLICY IF EXISTS "list_projects_update" ON public.list_projects;
CREATE POLICY "list_projects_update" ON public.list_projects
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

DROP POLICY IF EXISTS "list_projects_delete" ON public.list_projects;
CREATE POLICY "list_projects_delete" ON public.list_projects
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM public.lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM public.list_members WHERE user_email = auth.email()
    )
  );

-- ---------- TASK_PROJECTS ----------
CREATE TABLE IF NOT EXISTS public.task_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.list_projects(id) ON DELETE CASCADE,
  for_delivery  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, project_id)
);

CREATE INDEX IF NOT EXISTS task_projects_task_id_idx    ON public.task_projects(task_id);
CREATE INDEX IF NOT EXISTS task_projects_project_id_idx ON public.task_projects(project_id);
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_projects_select" ON public.task_projects;
CREATE POLICY "task_projects_select" ON public.task_projects
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tasks WHERE list_id IN (
        SELECT id FROM public.lists WHERE user_id = auth.uid()
        UNION
        SELECT list_id FROM public.list_members WHERE user_email = auth.email()
      )
    )
  );

DROP POLICY IF EXISTS "task_projects_insert" ON public.task_projects;
CREATE POLICY "task_projects_insert" ON public.task_projects
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM public.tasks WHERE list_id IN (
        SELECT id FROM public.lists WHERE user_id = auth.uid()
        UNION
        SELECT list_id FROM public.list_members WHERE user_email = auth.email()
      )
    )
  );

DROP POLICY IF EXISTS "task_projects_update" ON public.task_projects;
CREATE POLICY "task_projects_update" ON public.task_projects
  FOR UPDATE USING (
    task_id IN (
      SELECT id FROM public.tasks WHERE list_id IN (
        SELECT id FROM public.lists WHERE user_id = auth.uid()
        UNION
        SELECT list_id FROM public.list_members WHERE user_email = auth.email()
      )
    )
  ) WITH CHECK (
    task_id IN (
      SELECT id FROM public.tasks WHERE list_id IN (
        SELECT id FROM public.lists WHERE user_id = auth.uid()
        UNION
        SELECT list_id FROM public.list_members WHERE user_email = auth.email()
      )
    )
  );

DROP POLICY IF EXISTS "task_projects_delete" ON public.task_projects;
CREATE POLICY "task_projects_delete" ON public.task_projects
  FOR DELETE USING (
    task_id IN (
      SELECT id FROM public.tasks WHERE list_id IN (
        SELECT id FROM public.lists WHERE user_id = auth.uid()
        UNION
        SELECT list_id FROM public.list_members WHERE user_email = auth.email()
      )
    )
  );
