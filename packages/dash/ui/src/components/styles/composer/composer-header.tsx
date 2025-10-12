import { Button } from "@openpromo/ui/components/button";
import { Sparkles, X } from "lucide-react";
import { useStyleComposerStore } from "@/stores/style-composer-store";

export function ComposerHeader() {
  const closeComposer = useStyleComposerStore((state) => state.closeComposer);

  return (
    <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Create New Style</h2>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={closeComposer}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
