"use client";

import { useState } from "react";
import type { Label, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { toAppError, type AppError } from "@/lib/errors";
import { AlertIcon, TrashIcon } from "@/components/icons";
import { DueDateChip } from "@/components/board/DueDateChip";
import { LabelPicker } from "@/components/board/LabelPicker";
import { CommentThread } from "@/components/board/CommentThread";

export interface TaskDialogState {
  mode: "create" | "edit";
  task?: Task;
  defaultStatus?: TaskStatus;
}

export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  labelIds: string[];
}

interface TaskDialogProps {
  state: TaskDialogState | null;
  labels: Label[];
  onClose: () => void;
  onCreate: (draft: TaskDraft) => Promise<void>;
  onUpdate: (id: string, draft: TaskDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
}

function draftFromState(state: TaskDialogState | null): TaskDraft {
  if (state?.mode === "edit" && state.task) {
    const t = state.task;
    return {
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      status: t.status,
      due_date: t.due_date ?? "",
      labelIds: (t.labels ?? []).map((l) => l.id),
    };
  }
  return {
    title: "",
    description: "",
    priority: "normal",
    status: state?.defaultStatus ?? "todo",
    due_date: "",
    labelIds: [],
  };
}

/**
 * Identity of the dialog's contents. Callers pass this as `key` so opening a
 * different task mounts a fresh form instead of carrying over a stale draft.
 */
export function taskDialogKey(state: TaskDialogState | null): string {
  if (!state) return "closed";
  return state.mode === "edit"
    ? `edit-${state.task?.id}`
    : `create-${state.defaultStatus ?? "todo"}`;
}

export function TaskDialog({
  state,
  labels,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onCreateLabel,
}: TaskDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromState(state));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const isEdit = state?.mode === "edit";
  const titleValid = draft.title.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titleValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && state?.task) {
        await onUpdate(state.task.id, draft);
      } else {
        await onCreate(draft);
      }
      onClose();
    } catch (err) {
      // The dialog stays open with the draft intact so the save can be retried.
      setError(toAppError(err));
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!state?.task || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(state.task.id);
      onClose();
    } catch (err) {
      setError(toAppError(err));
      setDeleting(false);
    }
  }

  const busy = submitting || deleting;

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      title={isEdit ? "Task details" : "New task"}
      size={isEdit ? "xl" : "lg"}
      footer={
        <div className="flex items-center justify-between gap-3">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-dialog-form"
              disabled={!titleValid || busy}
              className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create task"}
            </button>
          </div>
        </div>
      }
    >
      <form id="task-dialog-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" required>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="What needs doing?"
            maxLength={200}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            placeholder="Add more detail…"
            rows={3}
            className={cn(inputClass, "resize-none")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as TaskStatus })
              }
              className={inputClass}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priority: e.target.value as TaskPriority,
                })
              }
              className={inputClass}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due date">
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) =>
                setDraft({ ...draft, due_date: e.target.value })
              }
              className={inputClass}
            />
            {draft.due_date ? (
              <DueDateChip dueDate={draft.due_date} className="mt-1.5" />
            ) : null}
          </Field>
        </div>

        <LabelPicker
          labels={labels}
          selectedIds={draft.labelIds}
          onChange={(labelIds) => setDraft({ ...draft, labelIds })}
          onCreateLabel={onCreateLabel}
          disabled={busy}
        />

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--radius-sm)] bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{error.message}</p>
              {error.hint ? (
                <p className="mt-0.5 leading-relaxed text-danger/80">
                  {error.hint}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>

      {isEdit && state?.task ? (
        <CommentThread
          taskId={state.task.id}
          disabled={busy}
          onError={(err) => setError(err)}
        />
      ) : null}
    </Modal>
  );
}

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
