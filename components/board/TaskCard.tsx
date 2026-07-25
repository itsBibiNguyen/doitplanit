"use client";

import type { Task } from "@/lib/types";
import { cn, dueState, formatDueDate } from "@/lib/utils";
import { CalendarIcon, GripIcon } from "@/components/icons";

const PRIORITY_META: Record<Task["priority"], { label: string; dot: string }> = {
  high: { label: "High", dot: "bg-prio-high" },
  normal: { label: "Normal", dot: "bg-prio-normal" },
  low: { label: "Low", dot: "bg-prio-low" },
};

const DUE_STYLES: Record<string, string> = {
  overdue: "text-prio-high",
  today: "text-accent",
  upcoming: "text-ink-muted",
};

interface TaskCardProps {
  task: Task;
  onOpen?: (task: Task) => void;
  /** Drag handle listeners/attributes injected by dnd-kit (Phase 3d). */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({
  task,
  onOpen,
  dragHandleProps,
  isDragging,
  isOverlay,
}: TaskCardProps) {
  const prio = PRIORITY_META[task.priority];
  const due = formatDueDate(task.due_date);
  const state = dueState(task.due_date);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(task);
        }
      }}
      className={cn(
        "group relative w-full cursor-pointer rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left shadow-[var(--shadow-card)] transition-all",
        "hover:border-border-strong hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "rotate-[1.5deg] scale-[1.02] shadow-[var(--shadow-lift)]",
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium leading-snug text-ink">
          {task.title}
        </p>
        <button
          type="button"
          aria-label="Drag task"
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps}
          className="-mr-1 -mt-1 shrink-0 cursor-grab touch-none rounded-md p-1 text-ink-muted opacity-0 transition-opacity hover:bg-surface-2 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripIcon className="h-4 w-4" />
        </button>
      </div>

      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          {task.description}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <span className={cn("h-2 w-2 rounded-full", prio.dot)} />
          {prio.label}
        </span>
        {due ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              DUE_STYLES[state ?? "upcoming"],
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {due}
          </span>
        ) : null}
      </div>
    </div>
  );
}
