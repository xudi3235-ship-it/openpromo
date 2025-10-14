import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { ImagePlus, Loader2, Minimize2, UploadCloud, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useStyleCreateMutation } from "@/queries/styles";
import { useStyleComposerStore } from "@/stores/style-composer-store";

interface StyleComposerProps {
  onSuccess?: () => void;
}

export function StyleComposer({ onSuccess }: StyleComposerProps) {
  const images = useStyleComposerStore((state) => state.images);
  const previews = useStyleComposerStore((state) => state.imagePreviews);
  const isDragging = useStyleComposerStore((state) => state.isDragging);
  const isUploading = useStyleComposerStore((state) => state.isUploading);
  const setIsUploading = useStyleComposerStore((state) => state.setIsUploading);
  const setIsDragging = useStyleComposerStore((state) => state.setIsDragging);
  const resetComposer = useStyleComposerStore((state) => state.resetComposer);
  const addImages = useStyleComposerStore((state) => state.addImages);
  const removeImage = useStyleComposerStore((state) => state.removeImage);
  const [isExpanded, setIsExpanded] = useState(false);

  const { uploadFiles } = useStorageUpload();
  const createStyleMutation = useStyleCreateMutation(() => {
    onSuccess?.();
    resetComposer();
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const maxImages = 3;
  const minImages = 1;

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (incoming.length === 0) {
        toast.error("Please choose image files.");
        return;
      }

      const availableSlots = Math.max(0, maxImages - images.length);
      if (availableSlots <= 0) {
        toast.error(`You can upload up to ${maxImages} images per style.`);
        return;
      }

      const filesToAdd = incoming.slice(0, availableSlots);
      if (incoming.length > filesToAdd.length) {
        toast.info(`Only the first ${availableSlots} image(s) were added.`);
      }

      addImages(filesToAdd);
      setIsExpanded(true);
    },
    [addImages, images.length],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      setIsExpanded(true);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles, setIsDragging],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
      setIsExpanded(true);
    },
    [setIsDragging],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (previews.length === 0) {
        setIsExpanded(false);
      }
    },
    [previews.length, setIsDragging],
  );

  const handleSubmit = useCallback(async () => {
    if (images.length < minImages) {
      toast.error(`Add at least ${minImages} images to create a style.`);
      return;
    }

    try {
      setIsUploading(true);
      toast.info(`Uploading ${images.length} reference image(s)...`);

      const uploadResults = await uploadFiles(images);
      const imageRefs = uploadResults.map((result) => result.publicUrl);

      const timestamp = new Date();
      const name = `Untitled Style ${timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const slug = `style-${timestamp.getTime()}`;
      const description = `Auto-generated from ${images.length} reference image${
        images.length > 1 ? "s" : ""
      } on ${timestamp.toLocaleDateString()}.`;
      const imageGenPrompt =
        "Use the uploaded references as inspiration for visual direction.";

      await createStyleMutation.mutateAsync({
        name,
        slug,
        description,
        imageGenPrompt,
        imageRefs,
      });
      setIsExpanded(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create style";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [createStyleMutation, images, setIsUploading, uploadFiles]);

  const isProcessing = isUploading || createStyleMutation.isPending;
  const selectionCopy = useMemo(
    () => `${images.length}/${maxImages} selected`,
    [images.length],
  );
  const showExpanded = isExpanded || previews.length > 0 || isDragging;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2 px-4">
      {!showExpanded && (
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-background/75 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-xl transition-colors hover:border-white/30"
          onClick={() => setIsExpanded(true)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsExpanded(true);
            }
          }}
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start">
            <span>Create style</span>
            <span className="text-xs font-normal text-muted-foreground">
              Drop 1-3 reference images
            </span>
          </div>
        </button>
      )}

      {showExpanded && (
        <div
          className={cn(
            "pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-background/80 shadow-[0_10px_35px_-20px_rgba(15,23,42,0.6)] backdrop-blur-2xl transition-[transform,opacity]",
            isDragging
              ? "ring-1 ring-primary/50 ring-offset-[3px] ring-offset-background"
              : "",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="region"
        >
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                New Style
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsExpanded(false);
                  setIsDragging(false);
                }}
                disabled={isProcessing}
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="sr-only">Collapse composer</span>
              </Button>
            </div>

            {previews.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {previews.map((preview) => (
                  <figure
                    key={preview.id}
                    className="group relative flex h-16 w-16 overflow-hidden rounded-lg border border-white/20 bg-white/5"
                  >
                    <img
                      src={preview.url}
                      alt="Style reference"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/80 text-white opacity-0 shadow group-hover:opacity-100"
                      onClick={() => removeImage(preview.id)}
                      aria-label="Remove reference image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </figure>
                ))}
              </div>
            )}

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-5 text-center transition-colors sm:flex-row sm:justify-between sm:text-left",
                isDragging
                  ? "border-primary/50 bg-primary/10"
                  : "hover:border-white/40 hover:bg-white/10",
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-white/10 sm:size-10">
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-0.5 sm:flex-1 sm:px-3">
                <p className="text-sm font-medium text-foreground sm:text-base">
                  Drop 1-3 reference images here
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectionCopy} · Supports PNG, JPG, GIF, WebP
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground">
                <ImagePlus className="h-3 w-3" />
                Add references
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground sm:text-xs">
              <span>
                We’ll auto-create the style details from your references.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (previews.length === 0) return;
                    resetComposer();
                    setIsExpanded(false);
                  }}
                  disabled={previews.length === 0 || isProcessing}
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSubmit}
                  disabled={
                    isProcessing ||
                    images.length < minImages ||
                    images.length > maxImages
                  }
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Style
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleInputChange}
          />
        </div>
      )}
    </div>
  );
}
