import { AlertIcon } from "@/components/icons";

/**
 * Shown when Supabase env vars are missing so the app renders a helpful guide
 * instead of throwing. Once .env.local is filled in, the board loads normally.
 */
export function SetupNotice() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <AlertIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-ink">
            Connect Supabase to get started
          </h2>
        </div>

        <ol className="mt-4 space-y-3 text-sm text-ink-soft">
          <li>
            <span className="font-medium text-ink">1.</span> Create a free
            project at{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent hover:underline"
            >
              supabase.com
            </a>
            .
          </li>
          <li>
            <span className="font-medium text-ink">2.</span> Copy{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
              .env.local.example
            </code>{" "}
            to{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            and paste your project URL + anon key.
          </li>
          <li>
            <span className="font-medium text-ink">3.</span> Run{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
              supabase/migrations/001_tasks.sql
            </code>{" "}
            in the SQL editor.
          </li>
          <li>
            <span className="font-medium text-ink">4.</span> Enable{" "}
            <span className="font-medium text-ink">Anonymous sign-ins</span>{" "}
            under Authentication → Providers, then restart the dev server.
          </li>
        </ol>
      </div>
    </div>
  );
}
