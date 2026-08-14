import type { Active, Over } from "@dnd-kit/core";
import type {
  Task,
  TaskActivity,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";
import { dueState, formatDueDate } from "@/lib/utils";

/** Gap between task positions; leaves room to insert between neighbours. */
export const POSITION_STEP = 1000;

export const STATUS_IDS = TASK_STATUSES.map((s) => s.id);

export const STATUS_LABEL = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.id, s.label]),
) as Record<TaskStatus, string>;

export const PRIORITY_LABEL = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.id, p.label]),
) as Record<TaskPriority, string>;

export function isStatusId(value: string): value is TaskStatus {
  return (STATUS_IDS as string[]).includes(value);
}

export function prettyStatus(value: string | null): string {
  if (!value) return "None";
  return isStatusId(value) ? STATUS_LABEL[value] : value;
}

function prettyPriority(value: string | null): string {
  if (!value) return "None";
  return value in PRIORITY_LABEL
    ? PRIORITY_LABEL[value as TaskPriority]
    : value;
}

/** One-line copy for an activity row, without the relative timestamp. */
export function formatActivityCopy(row: TaskActivity): string {
  switch (row.action) {
    case "created":
      return "Created";
    case "status_changed":
      return `Moved from ${prettyStatus(row.from_value)} → ${prettyStatus(row.to_value)}`;
    case "title_changed":
      return `Title changed from “${row.from_value ?? ""}” → “${row.to_value ?? ""}”`;
    case "priority_changed":
      return `Priority changed from ${prettyPriority(row.from_value)} → ${prettyPriority(row.to_value)}`;
    case "due_date_changed": {
      const from = formatDueDate(row.from_value);
      const to = formatDueDate(row.to_value);
      if (from && to) return `Due date changed from ${from} → ${to}`;
      if (to) return `Due date set to ${to}`;
      if (from) return `Due date cleared (was ${from})`;
      return "Due date cleared";
    }
    case "label_added":
      return row.to_value ? `Added label ${row.to_value}` : "Added a label";
    case "label_removed":
      return row.from_value
        ? `Removed label ${row.from_value}`
        : "Removed a label";
    default: {
      const _exhaustive: never = row.action;
      return _exhaustive;
    }
  }
}

const byPosition = (a: Task, b: Task) => a.position - b.position;

/** Split a flat task list into board columns, each sorted top-to-bottom. */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };
  for (const task of tasks) groups[task.status]?.push(task);
  for (const id of STATUS_IDS) groups[id].sort(byPosition);
  return groups;
}

/**
 * Client-side title + priority + label filter. DnD still runs on the
 * unfiltered list. Multiple selected labels are an intersection (has all).
 */
export function filterTasks(
  tasks: Task[],
  query: string,
  priority: TaskPriority | "all",
  labelIds: string[] = [],
): Task[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (needle && !task.title.toLowerCase().includes(needle)) return false;
    if (priority !== "all" && task.priority !== priority) return false;
    if (labelIds.length > 0) {
      const have = new Set((task.labels ?? []).map((l) => l.id));
      if (!labelIds.every((id) => have.has(id))) return false;
    }
    return true;
  });
}

export interface BoardSummaryRecentTask {
  id: string;
  title: string;
  updated_at: string;
}

export interface BoardSummaryCounts {
  total: number;
  done: number;
  overdue: number;
  byStatus: Record<TaskStatus, number>;
  /** Newest three tasks currently in each column, by last update (moves bump this). */
  recentByStatus: Record<TaskStatus, BoardSummaryRecentTask[]>;
}

const RECENT_PER_STATUS = 3;

const emptyStatusCounts = (): Record<TaskStatus, number> => ({
  todo: 0,
  in_progress: 0,
  in_review: 0,
  done: 0,
});

const emptyStatusTasks = (): Record<TaskStatus, Task[]> => ({
  todo: [],
  in_progress: [],
  in_review: [],
  done: [],
});

function recentInStatus(
  buckets: Record<TaskStatus, Task[]>,
): Record<TaskStatus, BoardSummaryRecentTask[]> {
  const recent = {} as Record<TaskStatus, BoardSummaryRecentTask[]>;
  for (const id of STATUS_IDS) {
    recent[id] = buckets[id]
      .sort((a, b) => {
        const byTime = b.updated_at.localeCompare(a.updated_at);
        return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
      })
      .slice(0, RECENT_PER_STATUS)
      .map((task) => ({
        id: task.id,
        title: task.title,
        updated_at: task.updated_at,
      }));
  }
  return recent;
}

/** Totals from the full task list — filters must not change these numbers. */
export function summarizeBoard(tasks: Task[]): BoardSummaryCounts {
  const byStatus = emptyStatusCounts();
  const buckets = emptyStatusTasks();
  let overdue = 0;
  for (const task of tasks) {
    byStatus[task.status] += 1;
    buckets[task.status].push(task);
    if (task.status !== "done" && dueState(task.due_date) === "overdue") {
      overdue += 1;
    }
  }
  return {
    total: tasks.length,
    done: byStatus.done,
    overdue,
    byStatus,
    recentByStatus: recentInStatus(buckets),
  };
}

/**
 * Resolve the column an id belongs to. Ids are either a column id (the column
 * droppable) or a task id (a sortable card).
 */
export function containerOf(id: string, tasks: Task[]): TaskStatus | null {
  if (isStatusId(id)) return id;
  return tasks.find((t) => t.id === id)?.status ?? null;
}

/**
 * Compute a fractional position that places a card between two neighbours in a
 * column. Pass the position of the card that will sit above / below the drop
 * slot (or null when dropping at an edge).
 */
export function positionBetween(
  before: number | null,
  after: number | null,
): number {
  if (before == null && after == null) return POSITION_STEP;
  if (before == null) return (after as number) - POSITION_STEP;
  if (after == null) return before + POSITION_STEP;
  return (before + after) / 2;
}

export interface Placement {
  status: TaskStatus;
  position: number;
}

/**
 * Where `activeId` lands when dropped on `overId`. `placeAfter` picks the side
 * of a hovered card the slot opens on; it is ignored when hovering a column's
 * empty space, which always appends. Returns null if the column can't be
 * resolved.
 */
export function planPlacement(
  tasks: Task[],
  activeId: string,
  overId: string,
  placeAfter: boolean,
): Placement | null {
  const status = containerOf(overId, tasks);
  if (!status) return null;

  const column = tasks
    .filter((t) => t.status === status && t.id !== activeId)
    .sort(byPosition);

  let index = column.length;
  if (!isStatusId(overId)) {
    const overIndex = column.findIndex((t) => t.id === overId);
    if (overIndex >= 0) index = overIndex + (placeAfter ? 1 : 0);
  }

  return {
    status,
    position: positionBetween(
      column[index - 1]?.position ?? null,
      column[index]?.position ?? null,
    ),
  };
}

/** True when the dragged card's centre sits past the centre of what it's over. */
export function isPlacedAfter(event: {
  active: Active;
  over: Over | null;
}): boolean {
  const activeRect = event.active.rect.current.translated;
  const overRect = event.over?.rect;
  if (!activeRect || !overRect) return false;
  return (
    activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
  );
}

/** Task title stashed on the draggable, for screen-reader announcements. */
export function dragTitle(active: Active): string {
  const title = active.data.current?.title;
  return typeof title === "string" ? `"${title}"` : "Task";
}

/** Column that a drop target belongs to, read from its dnd-kit data payload. */
export function dragStatus(over: Over | null): TaskStatus | null {
  const status = over?.data.current?.status;
  return typeof status === "string" && isStatusId(status) ? status : null;
}
