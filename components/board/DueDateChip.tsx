import { CalendarIcon } from "@/components/icons";
import { cn, dueState, formatDueChip, type DueState } from "@/lib/utils";

const CHIP_STYLES: Record<Exclude<DueState, null>, string> = {
  overdue: "bg-danger-soft text-danger",
  today: "bg-accent-soft text-accent",
  soon: "bg-warn-soft text-warn",
  upcoming: "text-ink-muted",
};

interface DueDateChipProps {
  dueDate: string | null;
  className?: string;
}

/** Filled due-date badge. Upcoming stays muted text with no fill. */
export function DueDateChip({ dueDate, className }: DueDateChipProps) {
  const state = dueState(dueDate);
  const label = formatDueChip(dueDate);
  if (!state || !label) return null;

  const filled = state !== "upcoming";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        filled && "rounded-md px-1.5 py-0.5",
        CHIP_STYLES[state],
        className,
      )}
    >
      <CalendarIcon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
