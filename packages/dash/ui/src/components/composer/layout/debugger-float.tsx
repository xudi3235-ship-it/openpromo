import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@openpromo/ui/components/dialog";
import { Bug, Code } from "lucide-react";
import { useState } from "react";
import { useInternal } from "@/hooks/useActor";
import { useComposerStore } from "@/stores/composer-store";

export function DebuggerFloat() {
  const [open, setOpen] = useState(false);
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const isInternal = useInternal();

  // Only show in development or for internal users
  if (!import.meta.env.DEV && !isInternal) {
    return null;
  }

  const formattedData = JSON.stringify(contentCreateData, null, 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 left-6 z-40 gap-2 bg-background/95 backdrop-blur-sm border-2 hover:bg-background"
        >
          <Bug className="h-4 w-4" />
          <Code className="h-4 w-4" />
          <span className="text-xs">
            {import.meta.env.DEV ? "Dev" : "Internal"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Composer Debug Data
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                JSON Data ({Object.keys(contentCreateData).length} keys)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(formattedData);
                }}
              >
                Copy
              </Button>
            </div>
            <pre className="overflow-auto max-h-[60vh] text-xs font-mono bg-background p-3 rounded border">
              {formattedData}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
