"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase replaced the legacy `anon` key with the publishable key; projects
// created after 2025-11-01 only have the latter. Both names are spelled out in
// full because Next.js inlines NEXT_PUBLIC_* vars by static text replacement,
// so a computed lookup would come back undefined in the browser.
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when both Supabase env vars are present. The UI uses this to show a
 * friendly setup banner instead of crashing when the project isn't configured.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey);

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase browser client. Sessions persist to
 * localStorage and refresh automatically, so the anonymous guest identity
 * survives reloads.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.local.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!browserClient) {
    browserClient = createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}
