"use client";

import { useEffect, useRef, useState } from "react";
import type { Label, TaskActivity, TaskStatus } from "@/lib/types";
import { listActivity } from "@/lib/supabase/activity";
import {
  formatActivityCopy,
  isStatusId,
  prettyStatus,
} from "@/lib/board";
import { toAppError, type AppError } from "@/lib/errors";
import {
  cn,
  dueState,
  formatDueDate,
  formatRelativeTime,
  type DueState,
} from "@/lib/utils";
import { LabelChip } from "@/components/board/LabelChip";

interface ActivityFeedProps {
  taskId: string;
  labels: Label[];
  onError: (error: AppError | null) => void;
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-status-todo",
  in_progress: "bg-status-progress",
  in_review: "bg-status-review",
  done: "bg-status-done",
};

const DUE_CHIP: Record<Exclude<DueState, null>, string> = {
  overdue: "bg-danger-soft text-danger",
  today: "bg-accent-soft text-accent",
  soon: "bg-warn-soft text-warn",
  upcoming: "bg-surface-2 text-ink",
};

export function ActivityFeed({ taskId, labels, onError }: ActivityFeedProps) {
  const [rows, setRows] = useState<TaskActivity[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    listActivity(taskId)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setLoadedFor(taskId);
      })
      .catch((err) => {
        if (cancelled) return;
        onErrorRef.current(toAppError(err));
        setLoadedFor(taskId);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const loading = loadedFor !== taskId;

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading activity…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No activity yet. Moves, edits, and label changes will show up here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-ink"
        >
          <ActivityCopy row={row} labels={labels} />
          <span className="text-ink-muted">·</span>
          <time dateTime={row.created_at} className="text-ink-muted">
            {formatRelativeTime(row.created_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}

function ActivityCopy({
  row,
  labels,
}: {
  row: TaskActivity;
  labels: Label[];
}) {
  if (row.action === "label_added" || row.action === "label_removed") {
    const name =
      row.action === "label_added" ? row.to_value : row.from_value;
    const label = name
      ? labels.find((l) => l.name.toLowerCase() === name.toLowerCase())
      : null;
    const verb = row.action === "label_added" ? "Added" : "Removed";

    return (
      <>
        <span>{verb}</span>
        {label ? (
          <LabelChip label={label} />
        ) : (
          <span className="font-medium">{name ?? "a"}</span>
        )}
        <span>label</span>
      </>
    );
  }

  if (row.action === "status_changed") {
    return (
      <>
        <span>Moved from</span>
        <StatusChip value={row.from_value} />
        <span className="text-ink-muted">→</span>
        <StatusChip value={row.to_value} />
      </>
    );
  }

  if (row.action === "due_date_changed") {
    const from = formatDueDate(row.from_value);
    const to = formatDueDate(row.to_value);
    if (from && to) {
      return (
        <>
          <span>Due date changed from</span>
          <DateChip iso={row.from_value} />
          <span className="text-ink-muted">→</span>
          <DateChip iso={row.to_value} />
        </>
      );
    }
    if (to) {
      return (
        <>
          <span>Due date set to</span>
          <DateChip iso={row.to_value} />
        </>
      );
    }
    if (from) {
      return (
        <>
          <span>Due date cleared (was</span>
          <DateChip iso={row.from_value} />
          <span>)</span>
        </>
      );
    }
    return <span>Due date cleared</span>;
  }

  return <span>{formatActivityCopy(row)}</span>;
}

function StatusChip({ value }: { value: string | null }) {
  const status = value && isStatusId(value) ? value : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink">
      {status ? (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
        />
      ) : null}
      {prettyStatus(value)}
    </span>
  );
}

function DateChip({ iso }: { iso: string | null }) {
  const formatted = formatDueDate(iso);
  const state = dueState(iso);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        state ? DUE_CHIP[state] : "bg-surface-2 text-ink",
      )}
    >
      {formatted ?? "None"}
    </span>
  );
}
