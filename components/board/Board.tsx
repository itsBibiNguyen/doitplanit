"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";
import {
  STATUS_LABEL,
  containerOf,
  dragStatus,
  dragTitle,
  groupByStatus,
  isPlacedAfter,
  planPlacement,
  positionBetween,
} from "@/lib/board";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  updateTask,
} from "@/lib/supabase/tasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AlertIcon, CloseIcon } from "@/components/icons";
import { Column } from "./Column";
import { SetupNotice } from "./SetupNotice";
import { TaskCard } from "./TaskCard";
import { TaskDialog, type TaskDialogState, type TaskDraft } from "./TaskDialog";

type LoadState = "idle" | "loading" | "ready" | "error";

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

export function Board() {
  const { status: authStatus, userId, error: authError, retry } = useAuth();

  const [tasks, setTasksState] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);

  // Drag handlers fire between renders, so they read the board from a ref that
  // `setTasks` keeps in step with state.
  const tasksRef = useRef<Task[]>([]);
  const setTasks = useCallback(
    (update: Task[] | ((prev: Task[]) => Task[])) => {
      const next =
        typeof update === "function" ? update(tasksRef.current) : update;
      tasksRef.current = next;
      setTasksState(next);
    },
    [],
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  /** Board as it looked when the drag began, so a failed move can be undone. */
  const dragSnapshot = useRef<Task[] | null>(null);

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
  }, [setTasks]);

  useEffect(() => {
    if (authStatus === "ready" && userId) {
      void fetchTasks();
    }
  }, [authStatus, userId, fetchTasks]);

  useEffect(() => {
    document.body.classList.toggle("dp-dragging", activeTask !== null);
    return () => document.body.classList.remove("dp-dragging");
  }, [activeTask]);

  const tasksByStatus = useMemo(() => groupByStatus(tasks), [tasks]);

  const handleNewTask = useCallback((status?: TaskStatus) => {
    setDialog({ mode: "create", defaultStatus: status });
  }, []);

  const handleOpenTask = useCallback((task: Task) => {
    setDialog({ mode: "edit", task });
  }, []);

  const handleCreate = useCallback(
    async (draft: TaskDraft) => {
      const created = await createTask({
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        status: draft.status,
        due_date: draft.due_date || null,
      });
      setTasks((prev) => [...prev, created]);
    },
    [setTasks],
  );

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
        const columnTasks = tasksRef.current
          .filter((t) => t.status === draft.status && t.id !== id)
          .sort((a, b) => a.position - b.position);
        const last = columnTasks[columnTasks.length - 1];
        const position = positionBetween(last?.position ?? null, null);
        result = await moveTask(id, draft.status, position);
      }

      setTasks((prev) => prev.map((t) => (t.id === id ? result : t)));
    },
    [setTasks],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [setTasks],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasksRef.current.find((t) => t.id === event.active.id);
    if (!task) return;
    dragSnapshot.current = tasksRef.current;
    setActiveTask(task);
    setOverStatus(task.status);
    setMoveError(null);
  }, []);

  // Cross-column hops are applied while dragging so the card previews in its
  // new column; reordering inside a column is resolved on drop.
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setOverStatus(null);
        return;
      }

      const activeId = String(active.id);
      const from = containerOf(activeId, tasksRef.current);
      const to = containerOf(String(over.id), tasksRef.current);
      if (!from || !to) return;

      setOverStatus(to);
      if (from === to) return;

      const placement = planPlacement(
        tasksRef.current,
        activeId,
        String(over.id),
        isPlacedAfter(event),
      );
      if (!placement) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, ...placement } : t)),
      );
    },
    [setTasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const snapshot = dragSnapshot.current;
      dragSnapshot.current = null;
      setActiveTask(null);
      setOverStatus(null);
      if (!snapshot) return;

      const activeId = String(active.id);
      const original = snapshot.find((t) => t.id === activeId);
      const placement = over
        ? planPlacement(
            tasksRef.current,
            activeId,
            String(over.id),
            isPlacedAfter(event),
          )
        : null;

      // Dropped outside a column, or back where it started — undo any preview.
      if (!original || !placement) {
        setTasks(snapshot);
        return;
      }
      if (
        placement.status === original.status &&
        placement.position === original.position
      ) {
        setTasks(snapshot);
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, ...placement } : t)),
      );

      try {
        const saved = await moveTask(
          activeId,
          placement.status,
          placement.position,
        );
        setTasks((prev) => prev.map((t) => (t.id === activeId ? saved : t)));
      } catch (err) {
        setTasks(snapshot);
        setMoveError(
          err instanceof Error ? err.message : "Could not move that task.",
        );
      }
    },
    [setTasks],
  );

  const handleDragCancel = useCallback(() => {
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;
    setActiveTask(null);
    setOverStatus(null);
    if (snapshot) setTasks(snapshot);
  }, [setTasks]);

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) =>
        `Picked up ${dragTitle(active)}. Use the arrow keys to move it, space to drop, escape to cancel.`,
      onDragOver: ({ active, over }) => {
        const status = dragStatus(over);
        return status
          ? `${dragTitle(active)} is over ${STATUS_LABEL[status]}.`
          : `${dragTitle(active)} is no longer over a column.`;
      },
      onDragEnd: ({ active, over }) => {
        const status = dragStatus(over);
        return status
          ? `${dragTitle(active)} was dropped in ${STATUS_LABEL[status]}.`
          : `${dragTitle(active)} was returned to where it started.`;
      },
      onDragCancel: ({ active }) =>
        `Move cancelled. ${dragTitle(active)} was returned to where it started.`,
    }),
    [],
  );

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            accessibility={{ announcements }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(event) => void handleDragEnd(event)}
            onDragCancel={handleDragCancel}
          >
            <BoardColumns
              tasksByStatus={tasksByStatus}
              overStatus={overStatus}
              onOpenTask={handleOpenTask}
              onAddTask={handleNewTask}
            />
            <DragOverlay dropAnimation={dropAnimation}>
              {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </Shell>

      {moveError ? (
        <MoveErrorToast
          message={moveError}
          onDismiss={() => setMoveError(null)}
        />
      ) : null}

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
  overStatus,
  onOpenTask,
  onAddTask,
}: {
  tasksByStatus: Record<TaskStatus, Task[]>;
  overStatus: TaskStatus | null;
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
              isDropTarget={overStatus === col.id}
              onOpenTask={onOpenTask}
              onAddTask={onAddTask}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MoveErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="dp-fade-in fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-[var(--radius-card)] border border-prio-high/30 bg-surface px-4 py-3 shadow-[var(--shadow-panel)]"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-prio-high" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-ink">Move didn&apos;t stick</p>
        <p className="mt-0.5 text-ink-soft">
          {message} The card was put back.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
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
