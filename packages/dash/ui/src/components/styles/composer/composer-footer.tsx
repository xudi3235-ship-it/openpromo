import { Button } from "@openpromo/ui/components/button";
import { Sparkles } from "lucide-react";
import { useStyleComposerStore } from "@/stores/style-composer-store";

interface ComposerFooterProps {
  onSubmit: () => void;
  isProcessing: boolean;
  canSubmit: boolean;
}

export function ComposerFooter({
  onSubmit,
  isProcessing,
  canSubmit,
}: ComposerFooterProps) {
  const images = useStyleComposerStore((state) => state.images);
  const isUploading = useStyleComposerStore((state) => state.isUploading);
  const closeComposer = useStyleComposerStore((state) => state.closeComposer);

  return (
    <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/20">
      <p className="text-xs text-muted-foreground">
        {images.length > 0 && `${images.length} image(s) added`}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeComposer}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isProcessing}
        >
          {isProcessing ? (
            <>{isUploading ? "Uploading images..." : "Creating style..."}</>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Style
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
