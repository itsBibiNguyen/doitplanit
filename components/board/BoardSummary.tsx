"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskStatus } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";
import type {
  BoardSummaryCounts,
  BoardSummaryRecentTask,
} from "@/lib/board";
import { STATUS_LABEL } from "@/lib/board";
import { CloseIcon } from "@/components/icons";
import { cn, formatRelativeTime } from "@/lib/utils";

const BOARD_SUMMARY_ID = "board-summary";

const STATUS_FILL: Record<TaskStatus, string> = {
  todo: "bg-status-todo",
  in_progress: "bg-status-progress",
  in_review: "bg-status-review",
  done: "bg-status-done",
};

interface BoardSummaryProps extends BoardSummaryCounts {
  onClose: () => void;
}

/**
 * On-demand insights slide-over. Counts always come from the unfiltered board.
 * Unmount when closed so drags do not keep laying out the chart.
 */
export function BoardSummary({
  total,
  done,
  overdue,
  byStatus,
  recentByStatus,
  onClose,
}: BoardSummaryProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div
        className="dp-fade-in absolute inset-0 z-20 bg-ink/20"
        onMouseDown={onClose}
        aria-hidden
      />
      <aside
        id={BOARD_SUMMARY_ID}
        aria-labelledby="board-summary-title"
        className="dp-slide-in-right absolute inset-y-0 right-0 z-30 flex w-[280px] flex-col border-l border-border bg-surface shadow-[var(--shadow-panel)]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2
            id="board-summary-title"
            className="text-sm font-semibold text-ink"
          >
            Summary
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close summary"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div
          role="status"
          className="dp-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
        >
          <div className="flex flex-col gap-2">
            <MetricCard
              label="Total"
              value={total}
              hint={total === 1 ? "task" : "tasks"}
              className="bg-surface-2 text-ink"
              pipClassName="bg-ink"
            />
            <MetricCard
              label="Done"
              value={done}
              className="bg-accent-soft text-accent"
              pipClassName="bg-accent"
            />
            <MetricCard
              label="Overdue"
              value={overdue}
              className="bg-danger-soft text-danger"
              pipClassName="bg-danger"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <p className="font-medium text-ink">
                Done · {done} of {total}
              </p>
              <p className="tabular-nums text-ink-muted">{percent}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-ink">By status</p>
            <StatusChart byStatus={byStatus} recentByStatus={recentByStatus} />
            <ul className="mt-3 space-y-1.5">
              {TASK_STATUSES.map((col) => {
                const count = byStatus[col.id];
                const empty = count === 0;
                return (
                  <li
                    key={col.id}
                    className={cn(
                      "flex items-center justify-between text-xs",
                      empty ? "text-ink-muted" : "text-ink-soft",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          STATUS_FILL[col.id],
                          empty && "opacity-40",
                        )}
                      />
                      {col.label}
                    </span>
                    <span className="tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusChart({
  byStatus,
  recentByStatus,
}: {
  byStatus: BoardSummaryCounts["byStatus"];
  recentByStatus: BoardSummaryCounts["recentByStatus"];
}) {
  const [active, setActive] = useState<TaskStatus | null>(null);

  return (
    <div
      className="mt-2"
      onMouseLeave={() => setActive(null)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setActive(null);
        }
      }}
    >
      <div className="flex h-3.5 items-stretch gap-0.5 rounded-full bg-surface-2 p-0.5">
        {TASK_STATUSES.map((col) => {
          const count = byStatus[col.id];
          if (count === 0) return null;
          const selected = active === col.id;
          return (
            <button
              key={col.id}
              type="button"
              aria-expanded={selected}
              aria-controls={
                selected ? `status-recent-${col.id}` : undefined
              }
              aria-label={`${col.label}: ${count}`}
              onMouseEnter={() => setActive(col.id)}
              onFocus={() => setActive(col.id)}
              onClick={() =>
                setActive((current) => (current === col.id ? null : col.id))
              }
              className={cn(
                "min-w-2.5 cursor-pointer rounded-full transition-[box-shadow,transform] duration-150",
                STATUS_FILL[col.id],
                selected &&
                  "relative z-10 scale-y-125 shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink-soft)]",
              )}
              style={{ flexGrow: count, flexBasis: 0 }}
            />
          );
        })}
      </div>
      {active ? (
        <RecentTasksDropdown
          status={active}
          tasks={recentByStatus[active]}
        />
      ) : null}
    </div>
  );
}

function RecentTasksDropdown({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: BoardSummaryRecentTask[];
}) {
  const label = STATUS_LABEL[status];

  return (
    <div
      id={`status-recent-${status}`}
      role="region"
      aria-label={`Newest tasks in ${label}`}
      className="dp-fade-in mt-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2"
    >
      <p className="text-[11px] font-medium text-ink-muted">
        Newest in {label}
      </p>
      {tasks.length === 0 ? (
        <p className="mt-1 text-xs text-ink-muted">No tasks yet</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {tasks.map((task) => (
            <li key={task.id} className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">
                {task.title}
              </p>
              <p className="text-[11px] text-ink-muted">
                {formatRelativeTime(task.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  className,
  pipClassName,
}: {
  label: string;
  value: number;
  hint?: string;
  className?: string;
  pipClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-[var(--radius-sm)] px-3 py-2.5",
        className,
      )}
    >
      <span
        className={cn("w-1 shrink-0 self-stretch rounded-full", pipClassName)}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="font-display text-2xl font-semibold leading-tight tabular-nums">
          {value}
          {hint ? (
            <span className="ml-1.5 text-sm font-medium opacity-70">
              {hint}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
