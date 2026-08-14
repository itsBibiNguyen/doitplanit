import { describe, expect, it } from "vitest";
import { errorSummary, toAppError } from "@/lib/errors";

describe("toAppError", () => {
  it("maps missing-table codes to a config error with the tasks migration hint", () => {
    const error = toAppError({
      code: "42P01",
      message: "relation tasks does not exist",
    });
    expect(error.kind).toBe("config");
    expect(error.retryable).toBe(false);
    expect(error.hint).toContain("001_tasks.sql");
  });

  it("points at the labels migration when the missing relation is labels", () => {
    const error = toAppError({
      code: "PGRST205",
      message: "Could not find the table public.labels in the schema cache",
    });
    expect(error.kind).toBe("config");
    expect(error.hint).toContain("002_labels.sql");
  });

  it("treats RLS / JWT failures as an expired guest session", () => {
    const error = toAppError({ code: "PGRST301", message: "JWT expired" });
    expect(error.kind).toBe("auth");
    expect(error.hint).toMatch(/Reload/);
  });

  it("treats .single() missing rows as a gone task", () => {
    const error = toAppError({ code: "PGRST116", message: "0 rows" });
    expect(error.kind).toBe("missing");
    expect(error.retryable).toBe(false);
  });

  it("explains when anonymous sign-in is disabled", () => {
    const error = toAppError({
      code: "anonymous_provider_disabled",
      message: "Anonymous sign-ins are disabled",
    });
    expect(error.kind).toBe("config");
    expect(error.message).toMatch(/Anonymous sign-in/);
    expect(error.hint).toMatch(/Providers/);
  });

  it("surfaces duplicate label names distinctly from other unique conflicts", () => {
    const labelClash = toAppError({
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (user_id, lower(name)) already exists on labels",
    });
    expect(labelClash.message).toMatch(/label/i);

    const otherClash = toAppError({
      code: "23505",
      message: "duplicate key value",
    });
    expect(otherClash.message).toMatch(/task conflicts/i);
  });

  it("maps HTTP 401/403 to permission and 429 to rate-limit", () => {
    expect(toAppError({ status: 403, message: "forbidden" }).kind).toBe(
      "permission",
    );
    expect(toAppError({ status: 429, message: "slow down" }).kind).toBe(
      "rate-limit",
    );
    expect(toAppError({ status: 503, message: "unavailable" }).kind).toBe(
      "network",
    );
  });

  it("detects fetch failures as a network error while online", () => {
    const error = toAppError(new TypeError("Failed to fetch"));
    expect(error.kind).toBe("network");
    expect(error.retryable).toBe(true);
  });

  it("recognises a missing local Supabase config", () => {
    const error = toAppError(
      new Error("Supabase is not configured. Copy .env.local.example."),
    );
    expect(error.kind).toBe("config");
    expect(error.retryable).toBe(false);
  });

  it("falls back to a generic unknown error", () => {
    const error = toAppError({ message: "weird boom" });
    expect(error.kind).toBe("unknown");
    expect(error.message).toBe("weird boom");
  });
});

describe("errorSummary", () => {
  it("joins the message and hint into one line", () => {
    expect(
      errorSummary({ code: "PGRST116", message: "0 rows" }),
    ).toBe(
      "That task isn't on the board anymore. Refresh to see the latest state.",
    );
  });
});
