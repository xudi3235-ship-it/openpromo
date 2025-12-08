export function ContentDetailSkeleton() {
  return (
    <div className="w-full">
      {/* Back button skeleton */}
      <div className="space-y-4 px-4 py-6">
        <div className="h-9 w-24 rounded-md bg-muted/30" />
      </div>

      {/* Main content grid: 3 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 gap-6 px-4 pb-8 lg:grid-cols-3">
        {/* Left: Preview & Basic Info (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content preview skeleton */}
          <div className="space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted/30">
              <div className="h-full w-full bg-gradient-to-br from-muted/20 via-muted/10 to-muted/5 animate-pulse" />
            </div>
            {/* Content info skeleton */}
            <div className="space-y-3">
              <div className="h-6 w-32 rounded-md bg-muted/20" />
              <div className="h-8 w-3/4 rounded-md bg-muted/15" />
              <div className="h-4 w-1/2 rounded-md bg-muted/10" />
            </div>
          </div>
        </div>

        {/* Right: Metrics & Actions (1 column) */}
        <div className="space-y-6">
          {/* Metrics skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-20 rounded-md bg-muted/20" />
            <div className="grid grid-cols-2 gap-3">
              {["impressions", "reach", "engagement", "likes"].map((metric) => (
                <div
                  key={metric}
                  className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2"
                >
                  <div className="h-3 w-12 rounded-sm bg-muted/20" />
                  <div className="h-6 w-16 rounded-sm bg-muted/15" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-16 rounded-md bg-muted/20" />
            <div className="space-y-2">
              <div className="h-10 w-full rounded-md bg-muted/15" />
              <div className="h-10 w-full rounded-md bg-muted/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
