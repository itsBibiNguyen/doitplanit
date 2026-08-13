import type { Label } from "@/lib/types";
import { cn, contrastOn } from "@/lib/utils";

const CARD_LABEL_LIMIT = 3;

interface LabelChipProps {
  label: Label;
  className?: string;
  /** Color dot on a muted surface instead of a filled chip. */
  muted?: boolean;
}

/** Compact color chip used on cards and in the dialog picker. */
export function LabelChip({ label, className, muted }: LabelChipProps) {
  if (muted) {
    return (
      <span
        className={cn(
          "inline-flex max-w-[7.5rem] items-center gap-1 truncate rounded-full bg-surface-2 px-1.5 py-0 text-[10px] font-medium leading-4 text-ink-soft",
          className,
        )}
        title={label.name}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: label.color }}
        />
        {label.name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-[7.5rem] truncate rounded-full px-1.5 py-0 text-[10px] font-medium leading-4",
        className,
      )}
      style={{ backgroundColor: label.color, color: contrastOn(label.color) }}
      title={label.name}
    >
      {label.name}
    </span>
  );
}

/** Up to three chips under a card title, with +N when there are more. */
export function TaskLabelChips({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, CARD_LABEL_LIMIT);
  const extra = labels.length - visible.length;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {visible.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {extra > 0 ? (
        <span className="text-[10px] font-medium text-ink-muted">+{extra}</span>
      ) : null}
    </div>
  );
}
