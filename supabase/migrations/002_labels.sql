-- DoitPlanit — labels + task_labels
-- Run AFTER 001_tasks.sql in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- 1. labels -------------------------------------------------------------------
create table if not exists public.labels (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name        text        not null check (char_length(name) between 1 and 32),
  color       text        not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now()
);

-- Unique per user, case-insensitive.
create unique index if not exists labels_user_lower_name_idx
  on public.labels (user_id, lower(name));

create index if not exists labels_user_id_idx
  on public.labels (user_id);

-- 2. task_labels --------------------------------------------------------------
create table if not exists public.task_labels (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (task_id, label_id)
);

create index if not exists task_labels_label_id_idx
  on public.task_labels (label_id);

-- 3. Row Level Security: labels ----------------------------------------------
alter table public.labels enable row level security;

drop policy if exists "labels_select_own" on public.labels;
create policy "labels_select_own"
  on public.labels for select
  using (auth.uid() = user_id);

drop policy if exists "labels_insert_own" on public.labels;
create policy "labels_insert_own"
  on public.labels for insert
  with check (auth.uid() = user_id);

drop policy if exists "labels_update_own" on public.labels;
create policy "labels_update_own"
  on public.labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "labels_delete_own" on public.labels;
create policy "labels_delete_own"
  on public.labels for delete
  using (auth.uid() = user_id);

-- 4. Row Level Security: task_labels -----------------------------------------
-- Insert/delete only when the caller owns both the task and the label.
alter table public.task_labels enable row level security;

drop policy if exists "task_labels_select_own" on public.task_labels;
create policy "task_labels_select_own"
  on public.task_labels for select
  using (auth.uid() = user_id);

drop policy if exists "task_labels_insert_own" on public.task_labels;
create policy "task_labels_insert_own"
  on public.task_labels for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.labels l
      where l.id = label_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "task_labels_delete_own" on public.task_labels;
create policy "task_labels_delete_own"
  on public.task_labels for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.labels l
      where l.id = label_id and l.user_id = auth.uid()
    )
  );
