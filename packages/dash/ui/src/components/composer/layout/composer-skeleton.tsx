export function ComposerSkeleton() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Column Skeleton */}
      <div className="w-full md:w-[500px] lg:w-[600px] p-4 md:p-6 space-y-6 overflow-y-auto flex-shrink-0">
        {/* Account Selection Skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded animate-pulse w-32"></div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Media Upload Skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded animate-pulse w-24"></div>
          <div className="h-40 bg-muted rounded-lg animate-pulse border-2 border-dashed"></div>
        </div>

        {/* Post Details Skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded animate-pulse w-28"></div>
          <div className="h-32 bg-muted rounded animate-pulse"></div>
        </div>

        {/* Scheduling Options Skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded animate-pulse w-36"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded animate-pulse w-24"></div>
            <div className="h-10 bg-muted rounded animate-pulse w-32"></div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="flex justify-end gap-2 pt-4">
          <div className="h-10 bg-muted rounded animate-pulse w-20"></div>
          <div className="h-10 bg-muted rounded animate-pulse w-24"></div>
        </div>
      </div>

      {/* Right Column Skeleton */}
      <div className="flex-1 p-6 bg-card border-l">
        <div className="max-w-md mx-auto space-y-4">
          {/* Preview Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-5 bg-muted rounded animate-pulse w-16"></div>
            <div className="flex rounded-lg border">
              <div className="h-8 bg-muted rounded-l animate-pulse w-24"></div>
              <div className="h-8 bg-muted rounded-r animate-pulse w-24"></div>
            </div>
          </div>

          {/* Preview Content Skeleton */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              {/* Profile Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
                </div>
              </div>

              {/* Post Content */}
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
              </div>

              {/* Media Placeholder */}
              <div className="h-48 bg-muted rounded animate-pulse"></div>

              {/* Interaction Buttons */}
              <div className="flex gap-4 pt-2">
                <div className="h-4 bg-muted rounded animate-pulse w-8"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-8"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-8"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
