"use client";

import { getSupabaseClient } from "./client";
import type { Comment } from "@/lib/types";

const TABLE = "comments";

const MAX_BODY = 2000;

/** Oldest-first thread for one task. Loaded when the edit dialog opens. */
export async function listComments(taskId: string): Promise<Comment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Comment[];
}

/** Post a comment. Body is trimmed; 1–2000 characters. */
export async function addComment(
  taskId: string,
  body: string,
): Promise<Comment> {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_BODY) {
    throw new Error("Comments must be between 1 and 2000 characters.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ task_id: taskId, body: trimmed })
    .select("*")
    .single();

  if (error) throw error;
  return data as Comment;
}
