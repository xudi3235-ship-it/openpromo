import { Button } from "@openpromo/ui/components/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ContentErrorStateProps {
  error?: Error | null;
  onRetry: () => void;
}

export function ContentErrorState({ error, onRetry }: ContentErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-8">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Failed to load content
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error?.message ||
            "An error occurred while fetching your content. Please try again."}
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
