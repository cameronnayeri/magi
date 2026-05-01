-- ============================================================
-- M.A.G.I. TASK SYSTEM — SUPABASE SCHEMA
-- ============================================================
-- Paste this entire file into Supabase Dashboard > SQL Editor
-- and click "Run". This creates the tables and Row Level
-- Security policies that scope every row to its owning user.
-- ============================================================

-- ---------- LISTS ----------
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists lists_user_id_idx on public.lists(user_id);

alter table public.lists enable row level security;

drop policy if exists "lists_select_own" on public.lists;
create policy "lists_select_own" on public.lists
  for select using (auth.uid() = user_id);

drop policy if exists "lists_insert_own" on public.lists;
create policy "lists_insert_own" on public.lists
  for insert with check (auth.uid() = user_id);

drop policy if exists "lists_update_own" on public.lists;
create policy "lists_update_own" on public.lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lists_delete_own" on public.lists;
create policy "lists_delete_own" on public.lists
  for delete using (auth.uid() = user_id);

-- ---------- TASKS ----------
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  list_id         uuid not null references public.lists(id) on delete cascade,
  text            text not null,
  deadline_days   int  not null default 0,
  due_at          timestamptz,
  completed       boolean not null default false,
  completed_at    timestamptz,
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_list_id_idx on public.tasks(list_id);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);
