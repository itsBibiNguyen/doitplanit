import { SearchIcon } from "@/components/icons";

/**
 * Shown when the board has tasks but the active search / priority filter
 * hides every card. Distinct from EmptyBoard — the data is still there.
 */
export function NoMatchingTasks({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="dp-fade-in flex w-full max-w-sm flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
          <SearchIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
          No matching tasks
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Nothing on the board matches this search or priority. Clear the
          filters to see every card again.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-6 inline-flex items-center rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
