"use client";

import { cn } from "@openpromo/ui/lib/utils";
import { Check, ImagePlus, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { QuickAdPresetStrip } from "@/components/quick-ad/quick-ad-preset-strip";
import { usePresetsQuery } from "@/queries/product-visuals";

interface UploadStepProps {
  uploadedImageUrl: string | null;
  selectedPresetId: string | null;
  onUpload: (imageUrl: string) => void;
  onPresetSelect: (presetId: string) => void;
  isGenerating: boolean;
}

export function UploadStep({
  uploadedImageUrl,
  selectedPresetId,
  onUpload,
  onPresetSelect,
  isGenerating,
}: UploadStepProps) {
  const { data: presetsData, isPending: isLoadingPresets } = usePresetsQuery();
  const presets = presetsData?.references ?? [];

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const url = URL.createObjectURL(file);
        onUpload(url);
      }
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: isGenerating,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Let's create your first ad
        </h2>
        <p className="text-muted-foreground">
          Drop a product image and we'll transform it
        </p>
      </div>

      {/* Upload area */}
      <div className="max-w-md mx-auto">
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer",
            isDragActive
              ? "border-foreground bg-muted/50 scale-[1.02]"
              : uploadedImageUrl
                ? "border-foreground/20 bg-muted/30"
                : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30",
            isGenerating && "opacity-50 cursor-not-allowed pointer-events-none",
          )}
        >
          <input {...getInputProps()} />

          {uploadedImageUrl ? (
            <div className="relative w-full">
              <img
                src={uploadedImageUrl}
                alt="Uploaded preview"
                className="w-full h-48 object-contain rounded-lg"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-foreground text-background px-2 py-1 rounded-full text-xs font-medium">
                <Check className="size-3" />
                Ready
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Click to replace
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "flex items-center justify-center size-16 rounded-2xl mb-4 transition-colors",
                  isDragActive ? "bg-foreground text-background" : "bg-muted",
                )}
              >
                {isDragActive ? (
                  <Upload className="size-7" />
                ) : (
                  <ImagePlus className="size-7" />
                )}
              </div>
              <p className="font-medium text-center">
                {isDragActive ? "Drop it here" : "Drop your product image here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
            </>
          )}
        </div>
      </div>

      {/* Style selection - always show, with loading state */}
      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-sm font-medium text-center text-muted-foreground">
          Choose a style (optional)
        </p>
        <QuickAdPresetStrip
          presets={presets}
          selectedPresetId={selectedPresetId ?? undefined}
          onPresetSelect={onPresetSelect}
          isLoading={isLoadingPresets}
        />
      </div>
    </div>
  );
}
