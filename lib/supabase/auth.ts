"use client";

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

/**
 * Ensures there is an authenticated session, creating an anonymous guest
 * identity on first launch. Returns the active session.
 *
 * Anonymous sign-in must be enabled in the Supabase dashboard:
 * Authentication → Providers → Anonymous sign-ins.
 */
export async function ensureSession(): Promise<Session> {
  const supabase = getSupabaseClient();

  const {
    data: { session },
    error: getError,
  } = await supabase.auth.getSession();

  if (getError) throw getError;
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) {
    throw new Error("Anonymous sign-in returned no session.");
  }

  return data.session;
}
