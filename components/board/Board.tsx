"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  positionBetween,
  updateTask,
} from "@/lib/supabase/tasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Column } from "./Column";
import { SetupNotice } from "./SetupNotice";
import { TaskDialog, type TaskDialogState, type TaskDraft } from "./TaskDialog";

type LoadState = "idle" | "loading" | "ready" | "error";

export function Board() {
  const { status: authStatus, userId, error: authError, retry } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const data = await listTasks();
      setTasks(data);
      setLoadState("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (authStatus === "ready" && userId) {
      void fetchTasks();
    }
  }, [authStatus, userId, fetchTasks]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const task of tasks) groups[task.status].push(task);
    for (const key of Object.keys(groups) as TaskStatus[]) {
      groups[key].sort((a, b) => a.position - b.position);
    }
    return groups;
  }, [tasks]);

  const handleNewTask = useCallback((status?: TaskStatus) => {
    setDialog({ mode: "create", defaultStatus: status });
  }, []);

  const handleOpenTask = useCallback((task: Task) => {
    setDialog({ mode: "edit", task });
  }, []);

  const handleCreate = useCallback(async (draft: TaskDraft) => {
    const created = await createTask({
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      status: draft.status,
      due_date: draft.due_date || null,
    });
    setTasks((prev) => [...prev, created]);
  }, []);

  const handleUpdate = useCallback(
    async (id: string, draft: TaskDraft) => {
      let result = await updateTask(id, {
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        due_date: draft.due_date || null,
      });

      // If the status was changed from the dialog, move the card to the
      // bottom of the target column.
      if (draft.status !== result.status) {
        const columnTasks = tasks
          .filter((t) => t.status === draft.status && t.id !== id)
          .sort((a, b) => a.position - b.position);
        const last = columnTasks[columnTasks.length - 1];
        const position = positionBetween(last?.position ?? null, null);
        result = await moveTask(id, draft.status, position);
      }

      setTasks((prev) => prev.map((t) => (t.id === id ? result : t)));
    },
    [tasks],
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (authStatus === "unconfigured") {
    return (
      <Shell>
        <SetupNotice />
      </Shell>
    );
  }

  return (
    <>
      <Shell
        onNewTask={() => handleNewTask()}
        newTaskDisabled={authStatus !== "ready"}
      >
        {authStatus === "error" ? (
          <ErrorState
            message={authError?.message ?? "Could not start your session."}
            onRetry={retry}
          />
        ) : loadState === "error" ? (
          <ErrorState
            message={loadError?.message ?? "Could not load your tasks."}
            onRetry={() => void fetchTasks()}
          />
        ) : (
          <BoardColumns
            tasksByStatus={tasksByStatus}
            onOpenTask={handleOpenTask}
            onAddTask={handleNewTask}
          />
        )}
      </Shell>

      <TaskDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}

function Shell({
  children,
  onNewTask,
  newTaskDisabled,
}: {
  children: React.ReactNode;
  onNewTask?: () => void;
  newTaskDisabled?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader onNewTask={onNewTask} newTaskDisabled={newTaskDisabled} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

function BoardColumns({
  tasksByStatus,
  onOpenTask,
  onAddTask,
}: {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onOpenTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  return (
    <div className="dp-scroll flex-1 overflow-x-auto">
      <div className="mx-auto flex h-full min-h-[70vh] w-full max-w-[1600px] gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {TASK_STATUSES.map((col, i) => (
          <div
            key={col.id}
            className="dp-column-in h-full"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Column
              status={col.id}
              label={col.label}
              tasks={tasksByStatus[col.id]}
              onOpenTask={onOpenTask}
              onAddTask={onAddTask}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
      <p className="text-sm text-ink-soft">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
