import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";

interface ProductVisualsVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onConfirm: () => void;
  isCreating: boolean;
}

export function ProductVisualsVariationDialog({
  open,
  onOpenChange,
  prompt,
  onPromptChange,
  onConfirm,
  isCreating,
}: ProductVisualsVariationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Variation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="variation-prompt"
              className="text-sm font-medium text-muted-foreground"
            >
              Variation prompt
              <span className="ml-1 font-normal text-muted-foreground/70">
                (optional)
              </span>
            </label>
            <Textarea
              id="variation-prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe how you'd like to modify this image..."
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Variation"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
