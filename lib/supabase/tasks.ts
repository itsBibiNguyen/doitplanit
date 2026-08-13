"use client";

import { getSupabaseClient } from "./client";
import type { Label, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { sortLabels } from "@/lib/types";
import { POSITION_STEP } from "@/lib/board";

const TABLE = "tasks";

const TASK_SELECT = "*, task_labels ( labels (*) )";

interface TaskRow extends Omit<Task, "labels"> {
  task_labels?: Array<{ labels: Label | Label[] | null }>;
}

function asLabel(value: Label | Label[] | null | undefined): Label | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function flattenTask(row: TaskRow): Task {
  const labels: Label[] = [];
  for (const link of row.task_labels ?? []) {
    const label = asLabel(link.labels);
    if (label) labels.push(label);
  }
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    labels: sortLabels(labels),
  };
}

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
    .select(TASK_SELECT)
    .order("status", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(flattenTask);
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
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return flattenTask(data as TaskRow);
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
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return flattenTask(data as TaskRow);
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
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return flattenTask(data as TaskRow);
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
