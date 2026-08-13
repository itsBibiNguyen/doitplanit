"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional footer rendered with a top divider. */
  footer?: React.ReactNode;
  /** Default `lg` (max-w-lg). Use `xl` for the edit dialog so the thread fits. */
  size?: "lg" | "xl";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Focus the first focusable field for keyboard users.
      const first = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button",
      );
      first?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="dp-fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-panel)] sm:rounded-2xl",
          size === "xl" ? "max-w-xl" : "max-w-lg",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="dp-scroll flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-border px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
