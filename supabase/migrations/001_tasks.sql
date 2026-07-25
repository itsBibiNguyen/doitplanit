-- DoitPlanit — tasks schema + Row Level Security
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- 1. Table --------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  title       text        not null check (char_length(title) between 1 and 200),
  description text,
  status      text        not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text        not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  position    numeric     not null default 1000,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Indexes ------------------------------------------------------------------
-- Fast per-user board fetches ordered within each column.
create index if not exists tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

-- 3. keep updated_at fresh ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- 4. Row Level Security -------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
