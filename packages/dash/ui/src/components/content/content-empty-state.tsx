import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

interface ContentEmptyStateProps {
  className?: string;
}

export function ContentEmptyState({ className }: ContentEmptyStateProps) {
  const openDialog = useDialogComposerStore((state) => state.openDialog);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-20 text-center",
        className,
      )}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">
          You don’t have any posts yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Start by creating your first post to see it appear here.
        </p>
      </div>
      <Button onClick={() => openDialog()} variant="outline" size="sm">
        Create Post
      </Button>
    </div>
  );
}
