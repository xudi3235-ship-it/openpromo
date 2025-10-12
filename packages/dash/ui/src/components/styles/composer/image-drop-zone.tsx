import { ImagePlus } from "lucide-react";
import type * as React from "react";
import { useStyleComposerStore } from "@/stores/style-composer-store";

interface ImageDropZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ImageDropZone({ fileInputRef }: ImageDropZoneProps) {
  const isDragging = useStyleComposerStore((state) => state.isDragging);
  const setIsDragging = useStyleComposerStore((state) => state.setIsDragging);
  const addImages = useStyleComposerStore((state) => state.addImages);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-border"
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center"
      >
        <div className="rounded-full bg-muted p-3">
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Drop images here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload reference images for this style
          </p>
        </div>
      </button>
    </div>
  );
}
