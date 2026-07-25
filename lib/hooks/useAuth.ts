"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/auth";

export type AuthStatus = "loading" | "ready" | "unconfigured" | "error";

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  error: Error | null;
  retry: () => void;
}

/**
 * Bootstraps an anonymous guest session on first launch and keeps it in sync
 * with Supabase auth state changes.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    ensureSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [attempt]);

  return {
    status,
    session,
    userId: session?.user?.id ?? null,
    error,
    retry: () => setAttempt((n) => n + 1),
  };
}
