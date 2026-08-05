"use client";

import { useCallback, useRef, useState } from "react";

export type ToastTone = "error" | "success" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
  action?: ToastAction;
  /** Milliseconds on screen; 0 pins the toast until it's dismissed. */
  duration?: number;
  /** Pushing again with the same key replaces the toast instead of stacking. */
  key?: string;
}

export interface Toast extends ToastInput {
  id: number;
  tone: ToastTone;
  duration: number;
}

const MAX_VISIBLE = 3;

const DEFAULT_DURATION: Record<ToastTone, number> = {
  error: 9000,
  info: 6000,
  success: 4000,
};

/** A small queue of transient messages, newest last. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const tone = input.tone ?? "info";
    const toast: Toast = {
      ...input,
      tone,
      id: nextId.current++,
      duration: input.duration ?? DEFAULT_DURATION[tone],
    };
    setToasts((prev) =>
      [...prev.filter((t) => !toast.key || t.key !== toast.key), toast].slice(
        -MAX_VISIBLE,
      ),
    );
    return toast.id;
  }, []);

  return { toasts, push, dismiss };
}
