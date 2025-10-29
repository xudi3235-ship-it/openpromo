import { Skeleton } from "@openpromo/ui/components/skeleton";

export function InboxPendingComponent() {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Channel Switcher Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Sidebar Skeleton */}
        <aside className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border/60 bg-background sm:w-72 lg:w-80">
          <div className="space-y-3 border-b border-border/60 px-3 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`sidebar-skeleton-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: loading state
                  idx
                }`}
                className="rounded-lg border border-transparent p-3"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Conversation Panel Skeleton */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {[true, false, true].map((isSelf, idx) => (
                <div
                  key={`message-skeleton-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: loading state
                    idx
                  }`}
                  className={`flex w-full gap-3 ${
                    isSelf ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="max-w-[72%] space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Context Panel Skeleton */}
        <aside className="hidden w-80 flex-col overflow-hidden rounded-xl border border-border/60 bg-background lg:flex">
          <div className="flex flex-col gap-4 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
