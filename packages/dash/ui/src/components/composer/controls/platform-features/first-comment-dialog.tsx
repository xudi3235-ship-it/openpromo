import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import { useEffect, useMemo, useState } from "react";

export const FIRST_COMMENT_MAX_LENGTH = 2200;

interface FirstCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onSave: (comment: string) => void;
  onRemove?: () => void;
}

export function FirstCommentDialog({
  open,
  onOpenChange,
  initialValue = "",
  onSave,
  onRemove,
}: FirstCommentDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
    }
  }, [open, initialValue]);

  const trimmedValue = useMemo(() => value.trim(), [value]);
  const remaining = FIRST_COMMENT_MAX_LENGTH - trimmedValue.length;
  const isOverLimit = remaining < 0;

  const handleSave = () => {
    if (isOverLimit) return;
    onSave(trimmedValue);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>First comment</DialogTitle>
          <DialogDescription>
            Add a comment that will be posted right after your content goes
            live. Use it for hashtags, promos, or CTAs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="first-comment">Comment text</Label>
            <Textarea
              id="first-comment"
              placeholder="Add a promotional comment, extra hashtags, or a call-to-action"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={6}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Supports Facebook, Instagram, and TikTok.
            </span>
            <span
              className={
                isOverLimit
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              {trimmedValue.length}/{FIRST_COMMENT_MAX_LENGTH}
            </span>
          </div>
          {isOverLimit && (
            <p className="text-xs text-destructive">
              Comment is too long by {Math.abs(remaining)} characters.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onRemove && trimmedValue.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRemove}
              className="mr-auto text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isOverLimit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
