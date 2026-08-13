"use client";

import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GripIcon } from "@/components/icons";
import { DueDateChip } from "@/components/board/DueDateChip";

const PRIORITY_META: Record<Task["priority"], { label: string; dot: string }> = {
  high: { label: "High", dot: "bg-prio-high" },
  normal: { label: "Normal", dot: "bg-prio-normal" },
  low: { label: "Low", dot: "bg-prio-low" },
};

interface TaskCardProps {
  task: Task;
  onOpen?: (task: Task) => void;
  /** Drag handle listeners/attributes injected by dnd-kit. */
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({
  task,
  onOpen,
  dragHandleProps,
  dragHandleRef,
  isDragging,
  isOverlay,
}: TaskCardProps) {
  const prio = PRIORITY_META[task.priority];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => {
        // Let the drag handle keep Enter/Space for starting a keyboard drag.
        if (e.target !== e.currentTarget) return;
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
          aria-label={`Drag ${task.title}`}
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps}
          ref={dragHandleRef}
          className={cn(
            "-mr-1.5 -mt-1.5 shrink-0 cursor-grab touch-none rounded-md p-1.5 text-ink-muted/70 transition-colors",
            "hover:bg-surface-2 hover:text-ink-soft active:cursor-grabbing",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          )}
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
        <DueDateChip dueDate={task.due_date} />
      </div>
    </div>
  );
}
