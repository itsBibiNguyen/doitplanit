"use client";

import { useEffect } from "react";
import { AlertIcon, CheckIcon, CloseIcon } from "@/components/icons";
import type { Toast, ToastTone } from "@/lib/hooks/useToasts";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<ToastTone, { badge: string; ring: string }> = {
  error: { badge: "bg-danger-soft text-danger", ring: "border-danger/25" },
  info: { badge: "bg-accent-soft text-accent", ring: "border-border" },
  success: { badge: "bg-accent-soft text-accent", ring: "border-border" },
};

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/** Bottom-centred stack of transient messages, newest at the bottom. */
export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast } & Pick<ToasterProps, "onDismiss">) {
  const { id, duration } = toast;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const tone = TONE_STYLES[toast.tone];

  return (
    <div
      className={cn(
        "dp-toast-in pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border bg-surface px-4 py-3 shadow-[var(--shadow-panel)]",
        tone.ring,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          tone.badge,
        )}
      >
        {toast.tone === "success" ? (
          <CheckIcon className="h-3.5 w-3.5" />
        ) : (
          <AlertIcon className="h-3.5 w-3.5" />
        )}
      </span>

      <div className="flex-1 text-sm">
        <p className="font-medium text-ink">{toast.title}</p>
        {toast.message ? (
          <p className="mt-0.5 leading-relaxed text-ink-soft">
            {toast.message}
          </p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              onDismiss(id);
              toast.action?.onClick();
            }}
            className="mt-2 rounded-[var(--radius-sm)] bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
