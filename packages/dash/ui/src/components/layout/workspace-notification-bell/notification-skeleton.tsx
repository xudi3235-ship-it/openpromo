const SKELETON_PLACEHOLDERS = ["n1", "n2", "n3"] as const;

export function NotificationSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6">
      {SKELETON_PLACEHOLDERS.map((placeholder) => (
        <div key={placeholder} className="flex items-start gap-3">
          <span className="mt-1 size-4 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
