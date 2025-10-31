import { Button } from "@openpromo/ui/components/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ComposerErrorStateProps {
  onRetry: () => void;
  onClose: () => void;
}

export function ComposerErrorState({
  onRetry,
  onClose,
}: ComposerErrorStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center text-center max-w-sm gap-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium text-foreground">
            Failed to load content
          </h2>
          <p className="text-sm text-muted-foreground">
            We couldn't load the content group. Please try again or create a new
            post.
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" className="flex-1" onClick={onRetry}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
