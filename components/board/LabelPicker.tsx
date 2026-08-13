"use client";

import { useState } from "react";
import type { Label } from "@/lib/types";
import { LABEL_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toAppError, type AppError } from "@/lib/errors";
import { PlusIcon } from "@/components/icons";
import { LabelChip } from "./LabelChip";

interface LabelPickerProps {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
  disabled?: boolean;
}

export function LabelPicker({
  labels,
  selectedIds,
  onChange,
  onCreateLabel,
  disabled,
}: LabelPickerProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LABEL_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const selected = new Set(selectedIds);
  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= 32;

  function toggle(id: string) {
    if (disabled) return;
    onChange(
      selected.has(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  }

  async function handleCreate() {
    if (!nameValid || saving || disabled) return;

    const existing = labels.find(
      (label) => label.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      if (!selected.has(existing.id)) onChange([...selectedIds, existing.id]);
      resetForm();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await onCreateLabel(trimmed, color);
      onChange(
        selectedIds.includes(created.id)
          ? selectedIds
          : [...selectedIds, created.id],
      );
      resetForm();
    } catch (err) {
      setError(toAppError(err));
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setColor(LABEL_COLORS[0]);
    setAdding(false);
    setSaving(false);
    setError(null);
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        Labels
      </span>

      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const isOn = selected.has(label.id);
            return (
              <button
                key={label.id}
                type="button"
                aria-pressed={isOn}
                disabled={disabled}
                onClick={() => toggle(label.id)}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-50"
              >
                <LabelChip label={label} muted={!isOn} />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">
          No labels yet. Add one to tag this task.
        </p>
      )}

      {adding ? (
        <div className="mt-2 space-y-2 rounded-[var(--radius-sm)] border border-border bg-surface-2/50 p-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
            maxLength={32}
            autoFocus
            disabled={disabled || saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-sm text-ink shadow-sm placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((swatch) => {
              const picked = color.toLowerCase() === swatch.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  aria-pressed={picked}
                  disabled={disabled || saving}
                  onClick={() => setColor(swatch)}
                  className={cn(
                    "h-6 w-6 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                    picked && "ring-2 ring-offset-2 ring-[var(--accent-ring)]",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
          </div>
          {error ? (
            <p className="text-xs text-danger">
              {error.message}
              {error.hint ? ` ${error.hint}` : ""}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-ink-soft hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!nameValid || saving || disabled}
              className="rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add label"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New label
        </button>
      )}
    </div>
  );
}
