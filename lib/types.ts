export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "normal" | "high";

/** Palette offered when creating a label. Stored as #RRGGBB. */
export const LABEL_COLORS = [
  "#0D9488",
  "#0284C7",
  "#7C3AED",
  "#DB2777",
  "#E11D48",
  "#B45309",
  "#059669",
  "#64748B",
] as const;

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function sortLabels(labels: Label[]): Label[] {
  return [...labels].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  labels: Label[];
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type TaskActivityAction =
  | "created"
  | "status_changed"
  | "title_changed"
  | "priority_changed"
  | "due_date_changed"
  | "label_added"
  | "label_removed";

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: TaskActivityAction;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

export const TASK_PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
];
