import { GripIcon, PencilIcon, PlusIcon } from "@/components/icons";

/**
 * Shown once the board has loaded with no tasks at all. Replaces the four
 * identical empty columns with a single, clear starting point.
 */
export function EmptyBoard({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="dp-fade-in flex w-full max-w-lg flex-col items-center text-center">
        <BoardPreview />

        <h2 className="mt-8 font-display text-2xl font-semibold tracking-tight text-ink">
          Your board is a blank slate
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Add the first task, then drag it from To Do through to Done as the
          work moves. Everything saves to your guest session as you go.
        </p>

        <button
          type="button"
          onClick={onCreateTask}
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <PlusIcon className="h-4 w-4" />
          Create your first task
        </button>

        <ul className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
          <Tip icon={<PlusIcon className="h-4 w-4" />}>
            Add straight to a column with the + in its header
          </Tip>
          <Tip icon={<GripIcon className="h-4 w-4" />}>
            Drag a card between columns to change its status
          </Tip>
          <Tip icon={<PencilIcon className="h-4 w-4" />}>
            Click a card to edit its details or delete it
          </Tip>
        </ul>
      </div>
    </div>
  );
}

function Tip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface/70 p-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="text-xs leading-relaxed text-ink-soft">{children}</span>
    </li>
  );
}

/** Ghost cards per preview column; the first is the tilted accent card. */
const PREVIEW_COLUMNS = [2, 1, 1, 0];

function BoardPreview() {
  return (
    <div
      aria-hidden
      className="flex w-full max-w-[300px] gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
    >
      {PREVIEW_COLUMNS.map((cards, col) => (
        <div
          key={col}
          className="flex flex-1 flex-col gap-1.5 rounded-[var(--radius-sm)] bg-surface-2 p-1.5"
        >
          <span className="block h-1.5 w-2/3 rounded-full bg-border-strong" />
          {Array.from({ length: cards }, (_, row) =>
            col === 0 && row === 0 ? (
              <span
                key={row}
                className="block h-5 -rotate-2 rounded-[6px] bg-accent shadow-[var(--shadow-card)]"
              />
            ) : (
              <span
                key={row}
                className="block h-5 rounded-[6px] border border-border bg-surface"
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
