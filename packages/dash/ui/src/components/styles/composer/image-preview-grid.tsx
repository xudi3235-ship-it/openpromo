import { ImagePlus, X } from "lucide-react";
import type * as React from "react";
import { useStyleComposerStore } from "@/stores/style-composer-store";

interface ImagePreviewGridProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ImagePreviewGrid({ fileInputRef }: ImagePreviewGridProps) {
  const imagePreviews = useStyleComposerStore((state) => state.imagePreviews);
  const removeImage = useStyleComposerStore((state) => state.removeImage);

  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-3">
        {imagePreviews.map((preview, index) => (
          <div
            key={preview.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          >
            <img
              src={preview.url}
              alt={`Preview ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(preview.id)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {/* Add More Button */}
        <button
          type="button"
          onClick={handleAddMore}
          className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border/50 bg-muted/30 transition-colors hover:border-border hover:bg-muted/50"
        >
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
