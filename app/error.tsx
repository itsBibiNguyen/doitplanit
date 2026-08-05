"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BoardError } from "@/components/board/BoardError";
import { toAppError } from "@/lib/errors";

/**
 * Catches render-time crashes in the board so a bug shows a recoverable panel
 * instead of a blank page. Event-handler and fetch failures are handled where
 * they happen; this is the net under everything else.
 */
export default function BoardErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const appError = toAppError(error);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader newTaskDisabled />
      <main className="flex flex-1 flex-col">
        <BoardError
          error={{
            ...appError,
            title: "The board hit a snag",
            retryable: true,
          }}
          onRetry={() => unstable_retry()}
        />
      </main>
    </div>
  );
}
