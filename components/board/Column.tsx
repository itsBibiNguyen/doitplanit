"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SortableTaskCard } from "./SortableTaskCard";
import { PlusIcon, InboxIcon } from "@/components/icons";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isDropTarget?: boolean;
  /** True while any card on the board is being dragged. */
  isDragActive?: boolean;
  /** True when a search/priority filter is hiding some cards. */
  filtersActive?: boolean;
  onOpenTask?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function Column({
  status,
  label,
  tasks,
  isDropTarget,
  isDragActive,
  filtersActive,
  onOpenTask,
  onAddTask,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <section
      className={cn(
        "flex h-full w-[300px] shrink-0 flex-col rounded-[var(--radius-card)] bg-surface-2/70 transition-colors",
        isDropTarget && "bg-accent-soft/70 ring-1 ring-[var(--accent-ring)]",
      )}
    >
      <header className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">{label}</h2>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask?.(status)}
          aria-label={`Add task to ${label}`}
          className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="dp-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
        >
          {tasks.length === 0 ? (
            <EmptyColumn
              status={status}
              label={label}
              isDragActive={isDragActive}
              isDropTarget={isDropTarget}
              filtersActive={filtersActive}
              onAddTask={() => onAddTask?.(status)}
            />
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

const EMPTY_HEADLINE: Record<TaskStatus, string> = {
  todo: "Nothing queued up",
  in_progress: "Nothing in flight",
  in_review: "Nothing waiting on review",
  done: "Nothing finished yet",
};

const placeholderClass =
  "mt-1 flex min-h-[140px] flex-1 flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed px-3 py-8 text-center transition-colors";

function EmptyColumn({
  status,
  label,
  isDragActive,
  isDropTarget,
  filtersActive,
  onAddTask,
}: {
  status: TaskStatus;
  label: string;
  isDragActive?: boolean;
  isDropTarget?: boolean;
  filtersActive?: boolean;
  onAddTask: () => void;
}) {
  // Mid-drag the slot reads as a landing zone instead of a button, so the
  // card in flight has an obvious place to go.
  if (isDragActive) {
    return (
      <div
        className={cn(
          placeholderClass,
          isDropTarget
            ? "border-accent bg-accent-soft/60 text-accent"
            : "border-border-strong/70 text-ink-muted",
        )}
      >
        <InboxIcon className="h-6 w-6" />
        <span className="text-xs font-medium">
          {isDropTarget ? `Drop into ${label}` : "Drop a card here"}
        </span>
      </div>
    );
  }

  if (filtersActive) {
    return (
      <div
        className={cn(
          placeholderClass,
          "border-border-strong/70 text-ink-muted",
        )}
      >
        <InboxIcon className="h-6 w-6" />
        <span className="text-xs font-medium">No matching tasks</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAddTask}
      aria-label={`Add a task to ${label}`}
      className={cn(
        placeholderClass,
        "border-border-strong/70 bg-surface/40 text-ink-muted hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
      )}
    >
      <InboxIcon className="h-6 w-6" />
      <span className="text-xs font-medium">{EMPTY_HEADLINE[status]}</span>
      <span className="text-xs">Click to add a task</span>
    </button>
  );
}
