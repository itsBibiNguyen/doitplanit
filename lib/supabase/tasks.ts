"use client";

import { getSupabaseClient } from "./client";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { POSITION_STEP } from "@/lib/board";

const TABLE = "tasks";

export interface NewTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
}

/** Fetch every task for the current user, ordered for board rendering. */
export async function listTasks(): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("status", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Task[];
}

/**
 * Create a task. It lands at the bottom of the target column (default "todo").
 * `user_id` defaults to auth.uid() in the DB, so we don't set it here.
 */
export async function createTask(input: NewTaskInput): Promise<Task> {
  const supabase = getSupabaseClient();
  const status: TaskStatus = input.status ?? "todo";
  const position = await nextPositionForStatus(status);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? "normal",
      due_date: input.due_date || null,
      status,
      position,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

/** Update editable content fields on a task. */
export async function updateTask(
  id: string,
  patch: UpdateTaskInput,
): Promise<Task> {
  const supabase = getSupabaseClient();
  const normalized: Record<string, unknown> = { ...patch };
  if (typeof patch.title === "string") normalized.title = patch.title.trim();
  if (patch.description !== undefined) {
    normalized.description = patch.description?.trim() || null;
  }
  if (patch.due_date !== undefined) {
    normalized.due_date = patch.due_date || null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(normalized)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

/** Move a task to a new column and/or position (used by drag-and-drop). */
export async function moveTask(
  id: string,
  status: TaskStatus,
  position: number,
): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, position })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

/** Permanently delete a task. */
export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/** Compute the next position value at the bottom of a column. */
async function nextPositionForStatus(status: TaskStatus): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1);

  if (error) throw error;
  const max = data?.[0]?.position ?? 0;
  return Number(max) + POSITION_STEP;
}
