-- DoitPlanit — comments
-- Run AFTER 002_labels.sql in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- 1. comments -----------------------------------------------------------------
create table if not exists public.comments (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks (id) on delete cascade,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  body        text        not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists comments_task_created_idx
  on public.comments (task_id, created_at);

-- 2. Row Level Security -------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments_select_own" on public.comments;
create policy "comments_select_own"
  on public.comments for select
  using (auth.uid() = user_id);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );
