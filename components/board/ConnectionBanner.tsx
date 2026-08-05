import { WifiOffIcon } from "@/components/icons";

/**
 * Sits between the header and the board while the browser reports no
 * connection. The board stays readable — only saving is off the table.
 */
export function ConnectionBanner() {
  return (
    <div
      role="status"
      className="dp-fade-in shrink-0 border-b border-warn/20 bg-warn-soft"
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 px-4 py-2 text-sm text-warn sm:px-6 lg:px-8">
        <WifiOffIcon className="h-4 w-4 shrink-0" />
        <p>
          <span className="font-medium">You&apos;re offline.</span>{" "}
          <span className="text-warn/80">
            The board is still here to read, but changes won&apos;t save until
            you reconnect.
          </span>
        </p>
      </div>
    </div>
  );
}
