/** Join truthy class names into a single string. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format an ISO date (yyyy-mm-dd) for compact display on cards, e.g. "Jul 24".
 * Returns null for empty values.
 */
export function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type DueState = "overdue" | "today" | "soon" | "upcoming" | null;

const MS_PER_DAY = 86_400_000;

/** Classify a due date relative to today for color cues. */
export function dueState(iso: string | null): DueState {
  if (!iso) return null;
  const due = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Round so DST (23h/25h days) still lands on a whole day count.
  const days = Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "upcoming";
}

/** Pick ink or white so text stays readable on a hex chip. */
export function contrastOn(hex: string): "#0b0f14" | "#ffffff" {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.55 ? "#0b0f14" : "#ffffff";
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16),
  };
}

/** Chip copy for a due date: "Overdue · Jul 24", "Today", "Soon · Jul 26", or "Jul 28". */
export function formatDueChip(iso: string | null): string | null {
  const formatted = formatDueDate(iso);
  if (!formatted) return null;
  switch (dueState(iso)) {
    case "overdue":
      return `Overdue · ${formatted}`;
    case "today":
      return "Today";
    case "soon":
      return `Soon · ${formatted}`;
    default:
      return formatted;
  }
}
