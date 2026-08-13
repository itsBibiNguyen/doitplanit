"use client";

import type { TaskPriority } from "@/lib/types";
import { TASK_PRIORITIES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChartIcon, PlusIcon, SearchIcon } from "@/components/icons";

export interface BoardFilters {
  query: string;
  priorityFilter: TaskPriority | "all";
  onQueryChange: (query: string) => void;
  onPriorityChange: (priority: TaskPriority | "all") => void;
  onClear: () => void;
  /** Reserved for label chips in 6b.1. */
  extras?: React.ReactNode;
}

interface AppHeaderProps {
  onNewTask?: () => void;
  newTaskDisabled?: boolean;
  /** Optional right-aligned status slot (e.g. guest badge). */
  statusSlot?: React.ReactNode;
  filters?: BoardFilters;
  /** Shown once the board has tasks. Toggles the summary slide-over. */
  summaryAvailable?: boolean;
  summaryOpen?: boolean;
  onToggleSummary?: () => void;
}

export function AppHeader({
  onNewTask,
  newTaskDisabled,
  statusSlot,
  filters,
  summaryAvailable,
  summaryOpen,
  onToggleSummary,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex shrink-0 items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <span className="font-display text-xl font-semibold tracking-tight text-ink">
                DoitPlanit
              </span>
              <p className="hidden text-xs text-ink-muted sm:block">
                Plan it, then do it.
              </p>
            </div>
          </div>

          {filters ? (
            <div className="hidden min-w-0 flex-1 justify-center lg:flex">
              <FilterBar filters={filters} />
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {statusSlot}
            {summaryAvailable ? (
              <button
                type="button"
                onClick={onToggleSummary}
                aria-expanded={summaryOpen}
                aria-controls="board-summary"
                aria-label="Board summary"
                className={cn(
                  "inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  summaryOpen
                    ? "bg-accent-soft text-accent"
                    : "border border-border bg-surface text-ink-soft hover:bg-surface-2 hover:text-ink",
                )}
              >
                <ChartIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Summary</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onNewTask}
              disabled={newTaskDisabled}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">New task</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {filters ? (
          <div className="pb-3 lg:hidden">
            <FilterBar filters={filters} />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function FilterBar({ filters }: { filters: BoardFilters }) {
  const filtersActive =
    filters.query.trim().length > 0 || filters.priorityFilter !== "all";

  return (
    <div className="flex w-full min-w-0 items-center gap-2 lg:max-w-xl">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search tasks</span>
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => filters.onQueryChange(e.target.value)}
          placeholder="Search tasks"
          autoComplete="off"
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface py-1.5 pl-8 pr-3 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      <div className="flex shrink-0 items-center gap-1">
        {TASK_PRIORITIES.map((p) => {
          const selected = filters.priorityFilter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                filters.onPriorityChange(selected ? "all" : p.id)
              }
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-2 text-ink-soft hover:bg-border",
              )}
            >
              {p.label}
            </button>
          );
        })}
        {filters.extras}
      </div>

      {filtersActive ? (
        <button
          type="button"
          onClick={filters.onClear}
          className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function BrandMark() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-white shadow-sm"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12.5l4.5 4.5L20 6" />
      </svg>
    </span>
  );
}
