import { Label } from "@openpromo/ui/components/label";
import * as React from "react";
import { useStyleComposerStore } from "@/stores/style-composer-store";
import { ImageDropZone } from "./image-drop-zone";
import { ImagePreviewGrid } from "./image-preview-grid";

export function ImageUploadSection() {
  const imagePreviews = useStyleComposerStore((state) => state.imagePreviews);
  const addImages = useStyleComposerStore((state) => state.addImages);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Reference Images</Label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {imagePreviews.length === 0 ? (
        <ImageDropZone fileInputRef={fileInputRef} />
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border/50">
          <ImagePreviewGrid fileInputRef={fileInputRef} />
        </div>
      )}
    </div>
  );
}
