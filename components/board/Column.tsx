"use client";

import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { PlusIcon, InboxIcon } from "@/components/icons";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onOpenTask?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function Column({
  status,
  label,
  tasks,
  onOpenTask,
  onAddTask,
}: ColumnProps) {
  return (
    <section className="flex h-full w-[300px] shrink-0 flex-col rounded-[var(--radius-card)] bg-surface-2/70">
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

      <div className="dp-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tasks.length === 0 ? (
          <EmptyColumn label={label} onAddTask={() => onAddTask?.(status)} />
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))
        )}
      </div>
    </section>
  );
}

function EmptyColumn({
  label,
  onAddTask,
}: {
  label: string;
  onAddTask: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAddTask}
      className="mt-1 flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border-strong/70 bg-surface/40 px-3 py-8 text-center text-ink-muted transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
    >
      <InboxIcon className="h-6 w-6" />
      <span className="text-xs font-medium">
        Nothing in {label.toLowerCase()} yet
      </span>
      <span className="text-xs">Click to add a task</span>
    </button>
  );
}
