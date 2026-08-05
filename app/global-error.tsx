"use client";

import "./globals.css";

/**
 * Last resort: the root layout itself failed, so this renders its own
 * document. Kept dependency-free (no fonts, no shared components) because the
 * usual providers may be what broke.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <title>DoitPlanit — something went wrong</title>
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center shadow-[var(--shadow-card)]">
            <h1 className="text-base font-semibold text-ink">
              DoitPlanit couldn&apos;t start
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              The app crashed before the board could load. Trying again usually
              clears it.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-ink-muted">
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-5 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
