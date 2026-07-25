import { PlusIcon } from "@/components/icons";

interface AppHeaderProps {
  onNewTask?: () => void;
  newTaskDisabled?: boolean;
  /** Optional right-aligned status slot (e.g. guest badge). */
  statusSlot?: React.ReactNode;
}

export function AppHeader({
  onNewTask,
  newTaskDisabled,
  statusSlot,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-3">
          {statusSlot}
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
    </header>
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
