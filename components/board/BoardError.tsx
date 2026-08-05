"use client";

import { AlertIcon, RefreshIcon } from "@/components/icons";
import type { AppError } from "@/lib/errors";

interface BoardErrorProps {
  error: AppError;
  onRetry: () => void;
}

/**
 * Takes over the board area when there's nothing to show — a failed sign-in or
 * a first fetch that never landed. Always offers a way back.
 */
export function BoardError({ error, onRetry }: BoardErrorProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="dp-fade-in w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertIcon className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-base font-semibold text-ink">{error.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          {error.message}
        </p>
        {error.hint ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            {error.hint}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-2">
          {error.retryable ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <RefreshIcon className="h-4 w-4" />
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
