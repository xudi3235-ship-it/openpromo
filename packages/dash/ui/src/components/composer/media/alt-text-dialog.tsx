import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { SharedAttachmentSpec } from "@shared/content";
import { useEffect, useState } from "react";

interface AltTextDialogProps {
  open: boolean;
  attachment: SharedAttachmentSpec | null;
  index: number | null;
  onOpenChange: (open: boolean) => void;
  onSave: (index: number, altText: string) => void;
}

export function AltTextDialog({
  open,
  attachment,
  index,
  onOpenChange,
  onSave,
}: AltTextDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!attachment) {
      setValue("");
      return;
    }

    const existing =
      typeof attachment.metadata?.altText === "string"
        ? (attachment.metadata.altText as string)
        : "";
    setValue(existing);
  }, [attachment]);

  const handleSave = () => {
    if (index == null) return;
    onSave(index, value.trim());
    onOpenChange(false);
  };

  const title =
    attachment?.type === "video"
      ? "Describe this video"
      : "Describe this image";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Add alt text so screen readers can describe your media. Keep it
          concise and specific.
        </p>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={4}
          placeholder="Example: Team celebrating a product launch with confetti."
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={index == null}>
            Save alt text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
