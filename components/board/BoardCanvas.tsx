/** Scroll container + column track shared by the live board and its skeleton. */
export function BoardCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="dp-scroll flex-1 overflow-x-auto">
      <div className="mx-auto flex h-full min-h-[70vh] w-full max-w-[1600px] gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
