"use client";

import { useEffect, useRef, useState } from "react";
import type { Comment } from "@/lib/types";
import { addComment, listComments } from "@/lib/supabase/comments";
import { toAppError, type AppError } from "@/lib/errors";
import { formatRelativeTime } from "@/lib/utils";

const MAX_BODY = 2000;

interface CommentThreadProps {
  taskId: string;
  disabled?: boolean;
  onError: (error: AppError | null) => void;
}

export function CommentThread({
  taskId,
  disabled,
  onError,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(taskId)
      .then((rows) => {
        if (cancelled) return;
        setComments(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        onErrorRef.current(toAppError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const trimmed = body.trim();
  const canPost =
    trimmed.length >= 1 && trimmed.length <= MAX_BODY && !posting && !disabled;

  async function handlePost() {
    if (!canPost) return;
    setPosting(true);
    onError(null);
    try {
      const created = await addComment(taskId, trimmed);
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch (err) {
      onError(toAppError(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <section>
      {loading ? (
        <p className="mb-3 text-sm text-ink-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-sm text-ink-muted">
          No comments yet. Add the first note on this task.
        </p>
      ) : (
        <ol className="mb-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="min-w-0">
              <p className="whitespace-pre-wrap break-words text-sm text-ink">
                {comment.body}
              </p>
              <time
                dateTime={comment.created_at}
                className="mt-0.5 block text-xs text-ink-muted"
              >
                {formatRelativeTime(comment.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          maxLength={MAX_BODY}
          disabled={disabled || posting || loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handlePost();
            }
          }}
          className="w-full resize-none rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] disabled:opacity-50"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!canPost || loading}
            className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {posting ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </section>
  );
}
