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
import type { Label, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { TASK_STATUSES, sortLabels } from "@/lib/types";
import {
  STATUS_LABEL,
  containerOf,
  dragStatus,
  dragTitle,
  filterTasks,
  groupByStatus,
  isPlacedAfter,
  planPlacement,
  positionBetween,
  summarizeBoard,
  type BoardSummaryCounts,
  type Placement,
} from "@/lib/board";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  updateTask,
} from "@/lib/supabase/tasks";
import { createLabel, listLabels, setTaskLabels } from "@/lib/supabase/labels";
import { isOnline, toAppError, type AppError } from "@/lib/errors";
import { useAuth } from "@/lib/hooks/useAuth";
import { useOnline } from "@/lib/hooks/useOnline";
import { useToasts } from "@/lib/hooks/useToasts";
import { AppHeader, type BoardFilters } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/Toaster";
import { BoardCanvas } from "./BoardCanvas";
import { BoardError } from "./BoardError";
import { BoardSkeleton } from "./BoardSkeleton";
import { BoardSummary } from "./BoardSummary";
import { Column } from "./Column";
import { ConnectionBanner } from "./ConnectionBanner";
import { EmptyBoard } from "./EmptyBoard";
import { NoMatchingTasks } from "./NoMatchingTasks";
import { SetupNotice } from "./SetupNotice";
import { TaskCard } from "./TaskCard";
import {
  TaskDialog,
  taskDialogKey,
  type TaskDialogState,
  type TaskDraft,
} from "./TaskDialog";

type LoadState = "idle" | "loading" | "ready" | "error";

interface FetchOptions {
  /** Refresh in place: keep the current board up and report failures as a toast. */
  background?: boolean;
}

/** Resolves to whether the board is now showing fresh data. */
type FetchTasks = (options?: FetchOptions) => Promise<boolean>;

type CommitMove = (
  id: string,
  placement: Placement,
  revertTo: Task[],
) => Promise<void>;

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

export function Board() {
  const { status: authStatus, userId, error: authError, retry } = useAuth();
  const online = useOnline();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const [tasks, setTasksState] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  );
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

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
  /** Board as it looked when the drag began, so a failed move can be undone. */
  const dragSnapshot = useRef<Task[] | null>(null);

  const warnOffline = useCallback(
    (action: string) => {
      pushToast({
        key: "offline-action",
        tone: "error",
        title: "You're offline",
        message: `Reconnect to ${action}.`,
      });
    },
    [pushToast],
  );

  const fetchTasks: FetchTasks = useCallback(
    (options: FetchOptions = {}) => {
      // A named declaration so the failure toast can offer a retry that runs
      // the very same attempt.
      async function attempt({
        background = false,
      }: FetchOptions): Promise<boolean> {
        if (!background) {
          setLoadState("loading");
          setLoadError(null);
        }
        try {
          const [data, boardLabels] = await Promise.all([
            listTasks(),
            listLabels(),
          ]);
          setTasks(data);
          setLabels(boardLabels);
          setLoadState("ready");
          setLoadError(null);
          return true;
        } catch (err) {
          const error = toAppError(err);
          if (!background) {
            setLoadError(error);
            setLoadState("error");
            return false;
          }
          pushToast({
            key: "refresh",
            tone: "error",
            title: "Couldn't refresh the board",
            message: [error.message, error.hint].filter(Boolean).join(" "),
            action: error.retryable
              ? {
                  label: "Try again",
                  onClick: () => void attempt({ background: true }),
                }
              : undefined,
          });
          return false;
        }
      }

      return attempt(options);
    },
    [pushToast, setTasks],
  );

  useEffect(() => {
    if (authStatus === "ready" && userId) {
      void fetchTasks();
    }
  }, [authStatus, userId, fetchTasks]);

  // Coming back from an outage: pull the board up to date without throwing the
  // reader back to a skeleton unless there was nothing on screen to begin with.
  useEffect(() => {
    if (authStatus !== "ready") return;

    const onReconnect = () => {
      const hadBoard = loadState === "ready";
      void fetchTasks({ background: hadBoard }).then((fresh) => {
        if (fresh && hadBoard) {
          pushToast({
            key: "connection",
            tone: "success",
            title: "Back online",
            message: "The board is up to date.",
          });
        }
      });
    };

    window.addEventListener("online", onReconnect);
    return () => window.removeEventListener("online", onReconnect);
  }, [authStatus, loadState, fetchTasks, pushToast]);

  useEffect(() => {
    document.body.classList.toggle("dp-dragging", activeTask !== null);
    return () => document.body.classList.remove("dp-dragging");
  }, [activeTask]);

  const visibleTasks = useMemo(
    () => filterTasks(tasks, query, priorityFilter, labelFilter),
    [tasks, query, priorityFilter, labelFilter],
  );
  const tasksByStatus = useMemo(
    () => groupByStatus(visibleTasks),
    [visibleTasks],
  );
  const filtersActive =
    query.trim().length > 0 ||
    priorityFilter !== "all" ||
    labelFilter.length > 0;

  const clearFilters = useCallback(() => {
    setQuery("");
    setPriorityFilter("all");
    setLabelFilter([]);
  }, []);

  const toggleLabelFilter = useCallback((id: string) => {
    setLabelFilter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const filters: BoardFilters = useMemo(
    () => ({
      query,
      priorityFilter,
      labelFilter,
      labels,
      onQueryChange: setQuery,
      onPriorityChange: setPriorityFilter,
      onLabelToggle: toggleLabelFilter,
      onClear: clearFilters,
    }),
    [query, priorityFilter, labelFilter, labels, toggleLabelFilter, clearFilters],
  );

  const summary = useMemo(
    () =>
      summaryOpen && tasks.length > 0 ? summarizeBoard(tasks) : null,
    [summaryOpen, tasks],
  );

  const closeSummary = useCallback(() => setSummaryOpen(false), []);
  const toggleSummary = useCallback(
    () => setSummaryOpen((open) => !open),
    [],
  );

  const handleNewTask = useCallback(
    (status?: TaskStatus) => {
      if (!isOnline()) {
        warnOffline("add tasks");
        return;
      }
      setDialog({ mode: "create", defaultStatus: status });
    },
    [warnOffline],
  );

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
      const attached =
        draft.labelIds.length > 0
          ? await setTaskLabels(created.id, draft.labelIds)
          : [];
      setTasks((prev) => [...prev, { ...created, labels: attached }]);
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

      const currentIds = (result.labels ?? []).map((l) => l.id);
      const attached = sameIdSet(currentIds, draft.labelIds)
        ? result.labels
        : await setTaskLabels(id, draft.labelIds);

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...result, labels: attached } : t)),
      );
    },
    [setTasks],
  );

  const handleCreateLabel = useCallback(
    async (name: string, color: string) => {
      const created = await createLabel(name, color);
      setLabels((prev) =>
        prev.some((l) => l.id === created.id)
          ? prev
          : sortLabels([...prev, created]),
      );
      return created;
    },
    [],
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

  /**
   * Save a drop. The card is already where the user dropped it, so a failure
   * has to put the board back the way it was and say so.
   */
  const commitMove: CommitMove = useCallback(
    (id: string, placement: Placement, revertTo: Task[]) => {
      // `revertTo` is re-read on each attempt: a retry has to undo against the
      // board as it stands now, not as it stood when the drag started.
      async function attempt(previous: Task[]): Promise<void> {
        if (!isOnline()) {
          setTasks(previous);
          warnOffline("move cards");
          return;
        }

        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...placement } : t)),
        );

        try {
          const saved = await moveTask(
            id,
            placement.status,
            placement.position,
          );
          setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
        } catch (err) {
          setTasks(previous);
          const error = toAppError(err);
          pushToast({
            key: "move",
            tone: "error",
            title: "That move didn't stick",
            message: `${error.message} The card is back where it started.`,
            action: error.retryable
              ? {
                  label: "Try again",
                  onClick: () => void attempt(tasksRef.current),
                }
              : {
                  label: "Refresh board",
                  onClick: () => void fetchTasks({ background: true }),
                },
          });
        }
      }

      return attempt(revertTo);
    },
    [fetchTasks, pushToast, setTasks, warnOffline],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasksRef.current.find((t) => t.id === event.active.id);
    if (!task) return;
    dragSnapshot.current = tasksRef.current;
    setActiveTask(task);
    setOverStatus(task.status);
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

      await commitMove(activeId, placement, snapshot);
    },
    [commitMove, setTasks],
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

  // The board stays in skeleton form from first paint until the guest session
  // is up *and* the first fetch has landed, so columns never flash empty.
  const isBooting =
    authStatus === "loading" || loadState === "idle" || loadState === "loading";

  const summaryAvailable =
    !isBooting &&
    authStatus !== "error" &&
    loadState !== "error" &&
    tasks.length > 0;

  if (!summaryAvailable && summaryOpen) {
    setSummaryOpen(false);
  }

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
        offline={!online}
        onNewTask={() => handleNewTask()}
        newTaskDisabled={authStatus !== "ready" || !online}
        filters={filters}
        summaryAvailable={summaryAvailable}
        summaryOpen={summaryOpen}
        summary={summary}
        onToggleSummary={toggleSummary}
        onCloseSummary={closeSummary}
      >
        {authStatus === "error" ? (
          <BoardError error={toAppError(authError)} onRetry={retry} />
        ) : loadState === "error" && loadError ? (
          <BoardError error={loadError} onRetry={() => void fetchTasks()} />
        ) : isBooting ? (
          <BoardSkeleton />
        ) : tasks.length === 0 ? (
          <EmptyBoard onCreateTask={() => handleNewTask("todo")} />
        ) : visibleTasks.length === 0 ? (
          <NoMatchingTasks onClear={clearFilters} />
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
              isDragActive={activeTask !== null}
              filtersActive={filtersActive}
              onOpenTask={handleOpenTask}
              onAddTask={handleNewTask}
            />
            <DragOverlay dropAnimation={dropAnimation}>
              {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </Shell>

      <Toaster toasts={toasts} onDismiss={dismissToast} />

      <TaskDialog
        key={taskDialogKey(dialog)}
        state={dialog}
        labels={labels}
        onClose={() => setDialog(null)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreateLabel={handleCreateLabel}
      />
    </>
  );
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function Shell({
  children,
  offline,
  onNewTask,
  newTaskDisabled,
  filters,
  summaryAvailable,
  summaryOpen,
  summary,
  onToggleSummary,
  onCloseSummary,
}: {
  children: React.ReactNode;
  offline?: boolean;
  onNewTask?: () => void;
  newTaskDisabled?: boolean;
  filters?: BoardFilters;
  summaryAvailable?: boolean;
  summaryOpen?: boolean;
  summary?: BoardSummaryCounts | null;
  onToggleSummary?: () => void;
  onCloseSummary?: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        onNewTask={onNewTask}
        newTaskDisabled={newTaskDisabled}
        filters={filters}
        summaryAvailable={summaryAvailable}
        summaryOpen={summaryOpen}
        onToggleSummary={onToggleSummary}
      />
      {offline ? <ConnectionBanner /> : null}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        {summaryAvailable && summaryOpen && summary && onCloseSummary ? (
          <BoardSummary {...summary} onClose={onCloseSummary} />
        ) : null}
      </div>
    </div>
  );
}

function BoardColumns({
  tasksByStatus,
  overStatus,
  isDragActive,
  filtersActive,
  onOpenTask,
  onAddTask,
}: {
  tasksByStatus: Record<TaskStatus, Task[]>;
  overStatus: TaskStatus | null;
  isDragActive: boolean;
  filtersActive: boolean;
  onOpenTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  return (
    <BoardCanvas>
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
            isDragActive={isDragActive}
            filtersActive={filtersActive}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        </div>
      ))}
    </BoardCanvas>
  );
}
