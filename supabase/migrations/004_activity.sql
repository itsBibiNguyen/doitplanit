-- DoitPlanit — task_activity
-- Run AFTER 003_comments.sql in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE guards.
--
-- Rows are written only by SECURITY DEFINER triggers (task create/update and
-- label attach/detach). Clients may SELECT their own rows; INSERT/UPDATE/DELETE
-- are revoked from anon and authenticated so drag-and-drop is logged without
-- extra client writes.

-- 1. task_activity ------------------------------------------------------------
create table if not exists public.task_activity (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks (id) on delete cascade,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  action      text        not null
              check (action in (
                'created',
                'status_changed',
                'title_changed',
                'priority_changed',
                'due_date_changed',
                'label_added',
                'label_removed'
              )),
  from_value  text,
  to_value    text,
  created_at  timestamptz not null default now()
);

create index if not exists task_activity_task_created_idx
  on public.task_activity (task_id, created_at desc);

-- 2. Row Level Security: select own rows, no client writes -------------------
alter table public.task_activity enable row level security;

drop policy if exists "task_activity_select_own" on public.task_activity;
create policy "task_activity_select_own"
  on public.task_activity for select
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.task_activity from anon, authenticated;
grant select on table public.task_activity to anon, authenticated;

-- 3. Triggers on tasks --------------------------------------------------------
create or replace function public.log_task_row_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, user_id, action, from_value, to_value)
    values (new.id, new.user_id, 'created', null, new.title);
    return new;
  end if;

  if old.title is distinct from new.title then
    insert into public.task_activity (task_id, user_id, action, from_value, to_value)
    values (new.id, new.user_id, 'title_changed', old.title, new.title);
  end if;

  if old.status is distinct from new.status then
    insert into public.task_activity (task_id, user_id, action, from_value, to_value)
    values (new.id, new.user_id, 'status_changed', old.status, new.status);
  end if;

  if old.priority is distinct from new.priority then
    insert into public.task_activity (task_id, user_id, action, from_value, to_value)
    values (new.id, new.user_id, 'priority_changed', old.priority, new.priority);
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.task_activity (task_id, user_id, action, from_value, to_value)
    values (
      new.id,
      new.user_id,
      'due_date_changed',
      old.due_date::text,
      new.due_date::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_log_insert_activity on public.tasks;
create trigger tasks_log_insert_activity
  after insert on public.tasks
  for each row
  execute function public.log_task_row_activity();

drop trigger if exists tasks_log_update_activity on public.tasks;
create trigger tasks_log_update_activity
  after update on public.tasks
  for each row
  when (
    old.title is distinct from new.title
    or old.status is distinct from new.status
    or old.priority is distinct from new.priority
    or old.due_date is distinct from new.due_date
  )
  execute function public.log_task_row_activity();

-- 4. Triggers on task_labels --------------------------------------------------
create or replace function public.log_task_label_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_task uuid;
  v_user uuid;
  v_label uuid;
begin
  if tg_op = 'INSERT' then
    v_task := new.task_id;
    v_user := new.user_id;
    v_label := new.label_id;
  else
    v_task := old.task_id;
    v_user := old.user_id;
    v_label := old.label_id;
  end if;

  select name into v_name from public.labels where id = v_label;

  insert into public.task_activity (task_id, user_id, action, from_value, to_value)
  values (
    v_task,
    v_user,
    case when tg_op = 'INSERT' then 'label_added' else 'label_removed' end,
    case when tg_op = 'DELETE' then v_name else null end,
    case when tg_op = 'INSERT' then v_name else null end
  );

  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists task_labels_log_activity on public.task_labels;
create trigger task_labels_log_activity
  after insert or delete on public.task_labels
  for each row
  execute function public.log_task_label_activity();
