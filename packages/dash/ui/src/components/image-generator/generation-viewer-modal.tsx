import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import type { ImageGenListResponse } from "@/queries/image-gen";
import { useComposerStore } from "@/stores/composer-store";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

interface GenerationViewerModalProps {
  generation: Generation | null;
  isOpen: boolean;
  onClose: () => void;
  enableComposerActions?: boolean;
  remainingSlots?: number;
}

export function GenerationViewerModal({
  generation,
  isOpen,
  onClose,
  enableComposerActions = true,
  remainingSlots = 0,
}: GenerationViewerModalProps) {
  const openComposer = useOpenComposer();

  const handleAddToPost = () => {
    if (!generation?.outputImages?.[0] || generation.state !== "completed") {
      return;
    }

    if (remainingSlots === 0) {
      toast.error("No more slots available");
      return;
    }

    const imageToAdd = {
      id: generation.id,
      type: "photo" as const,
      publicUrl: generation.outputImages[0],
      thumbnailUrl: generation.outputImages[0],
      mimeType: "image/jpeg",
      s3Key: generation.id,
    };

    useComposerStore.getState().addAttachmentSpecs([imageToAdd]);
    toast.success("Added to post");
    onClose();
  };

  const handleCreatePost = () => {
    if (!generation?.outputImages?.[0] || generation.state !== "completed") {
      return;
    }

    openComposer({
      attachments: [
        {
          id: generation.id,
          type: "photo",
          publicUrl: generation.outputImages[0],
          thumbnailUrl: generation.outputImages[0],
          mimeType: "image/jpeg",
          s3Key: generation.id,
        },
      ],
    });
    onClose();
  };

  const handleOpenFullSize = () => {
    const imageUrl = generation?.outputImages?.[0];
    if (imageUrl) {
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <DialogTitle>Generated Image</DialogTitle>
              {generation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 rounded border bg-muted text-xs">
                    {generation.styleComponentId ? "Styled" : "Studio"}
                  </span>
                  <span className="text-xs">
                    {generation.createdAt &&
                      new Date(generation.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {generation && (
          <div className="p-6 pt-4 space-y-4">
            {/* Image */}
            <div className="relative bg-muted rounded-lg overflow-hidden">
              {generation.outputImages?.[0] ? (
                <img
                  src={generation.outputImages[0]}
                  alt="Generated product"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">
                    No image available
                  </span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <span className="ml-2 font-mono">
                  {generation.id.slice(0, 12)}...
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2">{formatState(generation.state)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {enableComposerActions ? (
                <Button
                  onClick={handleAddToPost}
                  disabled={
                    generation.state !== "completed" ||
                    !generation.outputImages?.[0] ||
                    remainingSlots === 0
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Post
                </Button>
              ) : (
                <Button
                  onClick={handleCreatePost}
                  disabled={
                    generation.state !== "completed" ||
                    !generation.outputImages?.[0]
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleOpenFullSize}
                disabled={!generation.outputImages?.[0]}
              >
                Open Full Size
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatState(state: Generation["state"]) {
  switch (state) {
    case "not_started":
      return "Queued";
    case "pending":
      return "Pending";
    case "generating":
      return "Generating";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return state;
  }
}
