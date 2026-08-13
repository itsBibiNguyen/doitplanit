"use client";

import { getSupabaseClient } from "./client";
import type { Label } from "@/lib/types";
import { sortLabels } from "@/lib/types";

const LABELS = "labels";
const TASK_LABELS = "task_labels";

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Every label the current user has created, A–Z. */
export async function listLabels(): Promise<Label[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(LABELS)
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return sortLabels((data ?? []) as Label[]);
}

/** Create a board-level label. Name is trimmed; color must be #RRGGBB. */
export async function createLabel(
  name: string,
  color: string,
): Promise<Label> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 32) {
    throw new Error("Label names must be between 1 and 32 characters.");
  }
  if (!HEX.test(color)) {
    throw new Error("Pick a color from the palette.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(LABELS)
    .insert({ name: trimmed, color: color.toUpperCase() })
    .select("*")
    .single();

  if (error) throw error;
  return data as Label;
}

/**
 * Sync the labels on a task by inserting/deleting only the rows that changed.
 * Returns the labels that are now attached, in name order. Empty `labelIds`
 * clears every label on the task.
 */
export async function setTaskLabels(
  taskId: string,
  labelIds: string[],
): Promise<Label[]> {
  const supabase = getSupabaseClient();
  const unique = [...new Set(labelIds)];

  const { data: existing, error: existingError } = await supabase
    .from(TASK_LABELS)
    .select("label_id")
    .eq("task_id", taskId);
  if (existingError) throw existingError;

  const current = new Set(
    (existing ?? []).map((row) => row.label_id as string),
  );
  const next = new Set(unique);
  const toRemove = [...current].filter((id) => !next.has(id));
  const toAdd = unique.filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from(TASK_LABELS)
      .delete()
      .eq("task_id", taskId)
      .in("label_id", toRemove);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from(TASK_LABELS).insert(
      toAdd.map((label_id) => ({ task_id: taskId, label_id })),
    );
    if (error) throw error;
  }

  if (unique.length === 0) return [];

  const { data, error } = await supabase
    .from(LABELS)
    .select("*")
    .in("id", unique);

  if (error) throw error;
  return sortLabels((data ?? []) as Label[]);
}
