import { describe, expect, it } from "vitest";
import {
  cn,
  contrastOn,
  dueState,
  formatDueChip,
  formatDueDate,
  formatRelativeTime,
} from "@/lib/utils";

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
    expect(cn()).toBe("");
  });
});

describe("formatDueDate", () => {
  it("formats an ISO date and rejects empty or invalid values", () => {
    const formatted = formatDueDate("2026-07-24");
    expect(formatted).toEqual(expect.stringMatching(/24/));
    expect(formatted).not.toBe("2026-07-24");
    expect(formatDueDate(null)).toBeNull();
    expect(formatDueDate("not-a-date")).toBeNull();
  });
});

describe("dueState", () => {
  it("classifies due dates relative to today", () => {
    expect(dueState(null)).toBeNull();
    expect(dueState("not-a-date")).toBeNull();
    expect(dueState(isoDaysFromToday(-1))).toBe("overdue");
    expect(dueState(isoDaysFromToday(0))).toBe("today");
    expect(dueState(isoDaysFromToday(3))).toBe("soon");
    expect(dueState(isoDaysFromToday(4))).toBe("upcoming");
  });
});

describe("formatDueChip", () => {
  it("adds overdue/today/soon prefixes", () => {
    expect(formatDueChip(isoDaysFromToday(0))).toBe("Today");
    expect(formatDueChip(isoDaysFromToday(-1))).toMatch(/^Overdue · /);
    expect(formatDueChip(isoDaysFromToday(2))).toMatch(/^Soon · /);
    expect(formatDueChip(isoDaysFromToday(10))).toBe(
      formatDueDate(isoDaysFromToday(10)),
    );
    expect(formatDueChip(null)).toBeNull();
  });
});

describe("contrastOn", () => {
  it("picks dark ink on light chips and white on dark chips", () => {
    expect(contrastOn("#ffffff")).toBe("#0b0f14");
    expect(contrastOn("#F4F6F8")).toBe("#0b0f14");
    expect(contrastOn("#000000")).toBe("#ffffff");
    expect(contrastOn("#0D9488")).toBe("#ffffff");
    expect(contrastOn("not-hex")).toBe("#ffffff");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");

  it("says Just now for the first 45 seconds", () => {
    expect(formatRelativeTime("2026-08-14T11:59:20.000Z", now)).toBe("Just now");
  });

  it("returns an empty string for invalid timestamps", () => {
    expect(formatRelativeTime("nope", now)).toBe("");
  });

  it("includes the year when the timestamp is not this year", () => {
    const copy = formatRelativeTime("2025-01-02T08:30:00.000Z", now);
    expect(copy).toContain("2025");
    expect(copy).toMatch(/Jan/);
  });
});
