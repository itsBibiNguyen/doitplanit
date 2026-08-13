/**
 * Turns whatever Supabase (or the network) throws into something a person can
 * act on. PostgREST errors, auth errors and fetch failures all have different
 * shapes and none of their raw messages belong in the UI.
 */

export type ErrorKind =
  | "offline"
  | "network"
  | "auth"
  | "config"
  | "permission"
  | "missing"
  | "rate-limit"
  | "unknown";

export interface AppError {
  kind: ErrorKind;
  /** Short headline for a banner or toast. */
  title: string;
  /** One sentence on what happened, in plain language. */
  message: string;
  /** What the user can do about it, when there is a concrete next step. */
  hint?: string;
  /** Whether repeating the same action stands a chance of working. */
  retryable: boolean;
}

const TITLES: Record<ErrorKind, string> = {
  offline: "You're offline",
  network: "Can't reach the server",
  auth: "Session problem",
  config: "Setup needed",
  permission: "Not allowed",
  missing: "Already gone",
  "rate-limit": "Too many requests",
  unknown: "Something went wrong",
};

/** Network failures surface as opaque fetch errors with browser-specific text. */
const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export function toAppError(err: unknown): AppError {
  const code = readString(err, "code");
  const status = readNumber(err, "status");
  const name = readString(err, "name");
  const raw = readString(err, "message") ?? "";
  const details = readString(err, "details") ?? "";

  if (NETWORK_MESSAGE.test(raw) || name === "AuthRetryableFetchError") {
    return isOnline()
      ? build("network", "The request couldn't reach Supabase.", {
          hint: "Check your connection, then try again.",
        })
      : offlineError();
  }

  if (!isOnline()) return offlineError();

  if (raw.startsWith("Supabase is not configured")) {
    return build("config", "This app isn't connected to a Supabase project.", {
      hint: "Add your project URL and publishable key to .env.local.",
      retryable: false,
    });
  }

  switch (code) {
    // PostgREST: a table (or relationship) hasn't been created yet.
    case "42P01":
    case "PGRST200":
    case "PGRST205": {
      const missing = missingSchema(raw, details);
      return build("config", missing.message, {
        hint: missing.hint,
        retryable: false,
      });
    }

    // Row-level security rejected the write, or the JWT no longer passes it.
    case "42501":
    case "PGRST301":
      return build("auth", "Your guest session is no longer valid.", {
        hint: "Reload the page to start a fresh session.",
        retryable: false,
      });

    // `.single()` matched no rows — the task was deleted elsewhere.
    case "PGRST116":
      return build("missing", "That task isn't on the board anymore.", {
        hint: "Refresh to see the latest state.",
        retryable: false,
      });

    case "anonymous_provider_disabled":
      return build("config", "Anonymous sign-in is turned off for this project.", {
        hint: "Enable it under Authentication → Providers in Supabase.",
        retryable: false,
      });

    case "session_not_found":
    case "refresh_token_not_found":
      return build("auth", "Your guest session expired.", {
        hint: "Reload the page to start a fresh session.",
        retryable: false,
      });

    case "over_request_rate_limit":
      return build("rate-limit", "Supabase is rate-limiting this project.", {
        hint: "Wait a moment before trying again.",
      });

    case "23505":
      if (mentionsLabels(raw, details)) {
        return build("unknown", "A label with that name already exists.", {
          hint: "Pick a different name, or use the existing label.",
          retryable: false,
        });
      }
      return build("unknown", "That task conflicts with one already saved.", {
        hint: "Refresh the board and try again.",
      });

    case "23502":
    case "23514":
      return build("unknown", "Supabase rejected those values.", {
        retryable: false,
      });
  }

  if (status === 401 || status === 403) {
    return build("permission", "Supabase turned down that request.", {
      hint: "Reload the page to start a fresh session.",
      retryable: false,
    });
  }

  if (status === 429) {
    return build("rate-limit", "Supabase is rate-limiting this project.", {
      hint: "Wait a moment before trying again.",
    });
  }

  if (status !== null && status >= 500) {
    return build("network", "Supabase had trouble handling that request.", {
      hint: "It's usually temporary — try again in a moment.",
    });
  }

  return build("unknown", raw || "That didn't work, and we're not sure why.");
}

/** Convenience for the common "title: message hint" one-liner. */
export function errorSummary(err: unknown): string {
  const { message, hint } = toAppError(err);
  return hint ? `${message} ${hint}` : message;
}

function mentionsLabels(raw: string, details: string): boolean {
  return /\blabels\b|\btask_labels\b/i.test(`${raw} ${details}`);
}

function mentionsComments(raw: string, details: string): boolean {
  return /\bcomments\b/i.test(`${raw} ${details}`);
}

function missingSchema(
  raw: string,
  details: string,
): { message: string; hint: string } {
  if (mentionsComments(raw, details)) {
    return {
      message: "The comments table doesn't exist yet.",
      hint: "Run supabase/migrations/003_comments.sql in the Supabase SQL editor.",
    };
  }
  if (mentionsLabels(raw, details)) {
    return {
      message: "The labels tables don't exist yet.",
      hint: "Run supabase/migrations/002_labels.sql in the Supabase SQL editor.",
    };
  }
  return {
    message: "The tasks table doesn't exist yet.",
    hint: "Run supabase/migrations/001_tasks.sql in the Supabase SQL editor.",
  };
}

function offlineError(): AppError {
  return build("offline", "Your device isn't connected to the internet.", {
    hint: "Reconnect and the board will catch up.",
  });
}

function build(
  kind: ErrorKind,
  message: string,
  options: { hint?: string; retryable?: boolean } = {},
): AppError {
  return {
    kind,
    title: TITLES[kind],
    message,
    hint: options.hint,
    retryable: options.retryable ?? true,
  };
}

function readString(source: unknown, key: string): string | null {
  if (typeof source !== "object" || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(source: unknown, key: string): number | null {
  if (typeof source !== "object" || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}
