"use client";

import { getSupabaseClient } from "./client";
import type { TaskActivity } from "@/lib/types";

const TABLE = "task_activity";

/** Newest-first history for one task. Loaded when the Activity tab opens. */
export async function listActivity(taskId: string): Promise<TaskActivity[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TaskActivity[];
}
