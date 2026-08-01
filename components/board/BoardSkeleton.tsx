import { TASK_STATUSES } from "@/lib/types";
import { BoardCanvas } from "./BoardCanvas";

/**
 * Placeholder shapes per column. Fixed rather than random so the server and
 * client render the same markup and the board doesn't reshuffle mid-load.
 */
const COLUMNS: { cards: { title: string; lines: number; due: boolean }[] }[] = [
  {
    cards: [
      { title: "86%", lines: 2, due: true },
      { title: "64%", lines: 0, due: false },
      { title: "78%", lines: 1, due: true },
    ],
  },
  {
    cards: [
      { title: "72%", lines: 1, due: true },
      { title: "90%", lines: 0, due: false },
    ],
  },
  {
    cards: [
      { title: "68%", lines: 2, due: false },
      { title: "80%", lines: 0, due: true },
    ],
  },
  {
    cards: [{ title: "74%", lines: 1, due: false }],
  },
];

export function BoardSkeleton() {
  return (
    <BoardCanvas>
      <span className="sr-only" role="status" aria-live="polite">
        Loading your board…
      </span>
      {TASK_STATUSES.map((col, i) => (
        <section
          key={col.id}
          aria-hidden
          className="dp-fade-in flex h-full w-[300px] shrink-0 flex-col rounded-[var(--radius-card)] bg-surface-2/70"
        >
          <header className="flex items-center justify-between px-3 pb-2 pt-3">
            <div className="flex items-center gap-2">
              <span className="dp-skeleton block h-4 w-24" />
              <span className="dp-skeleton block h-5 w-6 rounded-full" />
            </div>
            <span className="dp-skeleton block h-4 w-4 rounded-md" />
          </header>

          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {COLUMNS[i].cards.map((card, j) => (
              <CardSkeleton key={j} {...card} />
            ))}
          </div>
        </section>
      ))}
    </BoardCanvas>
  );
}

function CardSkeleton({
  title,
  lines,
  due,
}: {
  title: string;
  lines: number;
  due: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <span className="dp-skeleton block h-4" style={{ width: title }} />
        </div>
        <span className="dp-skeleton -mr-1.5 -mt-1.5 block h-4 w-4 shrink-0 rounded-md" />
      </div>

      {lines > 0 ? (
        <div className="mt-2.5 space-y-1.5">
          <span className="dp-skeleton block h-3 w-full" />
          {lines > 1 ? <span className="dp-skeleton block h-3 w-3/5" /> : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <span className="dp-skeleton block h-3 w-14" />
        {due ? <span className="dp-skeleton block h-3 w-20" /> : null}
      </div>
    </div>
  );
}
