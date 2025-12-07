import { Button } from "@openpromo/ui/components/button";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useStyleCreateManyMutation } from "@/queries/styles-queries";

interface BulkStyle {
  id: string;
  images: File[];
  imageUrls: string[];
  previews: { id: string; url: string; isUrl: boolean }[];
}

interface BulkStyleComposerProps {
  onSuccess?: () => void;
}

export function BulkStyleComposer({ onSuccess }: BulkStyleComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [styles, setStyles] = useState<BulkStyle[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { uploadFiles } = useStorageUpload();
  const createManyMutation = useStyleCreateManyMutation(() => {
    onSuccess?.();
    setStyles([]);
    setIsOpen(false);
  });

  const maxImagesPerStyle = 3;
  const maxStyles = 10;

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (imageFiles.length === 0) {
        toast.error("Please choose image files.");
        return;
      }

      const availableSlots = maxStyles - styles.length;
      if (availableSlots <= 0) {
        toast.error(`Maximum ${maxStyles} styles allowed.`);
        return;
      }

      // Distribute images across multiple styles
      const newStyles: BulkStyle[] = [];
      let imageIndex = 0;

      for (
        let i = 0;
        i < availableSlots && imageIndex < imageFiles.length;
        i++
      ) {
        const imagesForThisStyle = imageFiles.slice(
          imageIndex,
          imageIndex + maxImagesPerStyle,
        );

        const previews = imagesForThisStyle.map((file) => ({
          id: `${Date.now()}-${Math.random()}`,
          url: URL.createObjectURL(file),
          isUrl: false,
        }));

        newStyles.push({
          id: `style-${Date.now()}-${Math.random()}`,
          images: imagesForThisStyle,
          imageUrls: [],
          previews,
        });

        imageIndex += maxImagesPerStyle;
      }

      setStyles((prev) => [...prev, ...newStyles]);
      setIsOpen(true);

      const totalCreated = newStyles.length;
      const skippedCount = imageFiles.length - imageIndex;
      if (skippedCount > 0) {
        toast.info(
          `Created ${totalCreated} style(s). ${skippedCount} image(s) can be added to another batch.`,
        );
      } else {
        toast.success(`Created ${totalCreated} style(s)`);
      }
    },
    [styles.length],
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleRemoveStyle = (styleId: string) => {
    setStyles((prev) => {
      const style = prev.find((s) => s.id === styleId);
      if (style) {
        style.previews.forEach((preview) => {
          if (!preview.isUrl) {
            URL.revokeObjectURL(preview.url);
          }
        });
      }
      return prev.filter((s) => s.id !== styleId);
    });
  };

  const handleRemoveImage = (styleId: string, imageId: string) => {
    setStyles((prev) =>
      prev.map((style) => {
        if (style.id !== styleId) return style;
        const preview = style.previews.find((p) => p.id === imageId);
        if (preview && !preview.isUrl) {
          URL.revokeObjectURL(preview.url);
        }
        return {
          ...style,
          previews: style.previews.filter((p) => p.id !== imageId),
          images: style.images.filter(
            (_f, i) =>
              style.previews.find((p) => p.id === imageId)?.url !==
              URL.createObjectURL(style.images[i]),
          ),
        };
      }),
    );
  };

  const handleAddImagesToStyle = useCallback(
    (styleId: string, files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (imageFiles.length === 0) {
        return;
      }

      setStyles((prev) =>
        prev.map((style) => {
          if (style.id !== styleId) return style;

          const availableSlots = maxImagesPerStyle - style.images.length;
          if (availableSlots <= 0) {
            toast.error(
              `This style already has ${maxImagesPerStyle} images (max).`,
            );
            return style;
          }

          const filesToAdd = imageFiles.slice(0, availableSlots);
          const newImages = [...style.images, ...filesToAdd];
          const newPreviews = [
            ...style.previews,
            ...filesToAdd.map((file) => ({
              id: `${Date.now()}-${Math.random()}`,
              url: URL.createObjectURL(file),
              isUrl: false,
            })),
          ];

          return {
            ...style,
            images: newImages,
            previews: newPreviews,
          };
        }),
      );
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (styles.length === 0) {
      toast.error("Add at least one style to upload.");
      return;
    }

    const invalidStyles = styles.filter(
      (s) => s.images.length + s.imageUrls.length === 0,
    );
    if (invalidStyles.length > 0) {
      toast.error("Remove empty styles before uploading.");
      return;
    }

    try {
      setIsUploading(true);

      // Upload all images for all styles
      const stylesToCreate = await Promise.all(
        styles.map(async (style) => {
          let uploadedRefs: string[] = [];
          if (style.images.length > 0) {
            const uploadResults = await uploadFiles(style.images);
            uploadedRefs = uploadResults.map((result) => result.publicUrl);
          }

          const imageRefs = [...uploadedRefs, ...style.imageUrls];
          const totalImages = imageRefs.length;
          const timestamp = new Date();
          const name = `Untitled Style ${timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
          const slug = `style-${timestamp.getTime()}`;
          const description = `Auto-generated from ${totalImages} reference image${
            totalImages > 1 ? "s" : ""
          }.`;
          const imageGenPrompt =
            "Use the uploaded references as inspiration for visual direction.";

          return {
            name,
            slug,
            description,
            imageGenPrompt,
            imageRefs,
          };
        }),
      );

      // Create all styles in a single batch request
      await createManyMutation.mutateAsync({
        styles: stylesToCreate,
      });

      toast.success(`Created ${styles.length} style(s)!`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create styles";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [styles, uploadFiles, createManyMutation]);

  const totalImages = useMemo(
    () => styles.reduce((sum, s) => sum + s.previews.length, 0),
    [styles],
  );

  const isProcessing = isUploading || createManyMutation.isPending;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <UploadCloud size={16} />
        Bulk Upload
      </Button>

      {isOpen && (
        <>
          <div
            onClick={() => !isProcessing && setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-8 md:pt-12 pointer-events-none">
            <div className="w-full max-w-2xl mx-4 rounded-xl border border-border bg-background shadow-xl pointer-events-auto max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-border p-4 flex-shrink-0">
                <div>
                  <h3 className="font-semibold text-sm">Bulk Create Styles</h3>
                  <p className="text-xs text-muted-foreground">
                    {styles.length} style{styles.length !== 1 ? "s" : ""} •{" "}
                    {totalImages} image{totalImages !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isProcessing}
                  className="h-8 w-8 p-0"
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="overflow-y-auto p-4 flex-1">
                <div className="space-y-2">
                  {styles.length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDrop}
                      className="rounded-lg border-2 border-dashed border-border p-8 text-center"
                    >
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag images here or use the upload button
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Each group of 1-3 images creates one style
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="mt-4"
                      >
                        Choose Files
                      </Button>
                    </div>
                  ) : (
                    styles.map((style, idx) => (
                      <div
                        key={style.id}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">
                            Style {idx + 1} • {style.previews.length}/3
                          </span>
                          <div className="flex gap-1">
                            {style.previews.length < maxImagesPerStyle && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.multiple = true;
                                  input.accept = "image/*";
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement)
                                      .files;
                                    if (files) {
                                      handleAddImagesToStyle(style.id, files);
                                    }
                                  };
                                  input.click();
                                }}
                                disabled={isProcessing}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <span className="text-xs">+</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStyle(style.id)}
                              disabled={isProcessing}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {style.previews.map((preview) => (
                            <div
                              key={preview.id}
                              className="relative h-16 w-16 overflow-hidden rounded-md bg-muted group"
                            >
                              <img
                                src={preview.url}
                                alt="preview"
                                className="h-full w-full object-cover"
                              />
                              <button
                                onClick={() =>
                                  handleRemoveImage(style.id, preview.id)
                                }
                                disabled={isProcessing}
                                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors"
                              >
                                <X
                                  size={12}
                                  className="text-white opacity-0 group-hover:opacity-100"
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border p-4 flex-shrink-0">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={isProcessing || styles.length >= maxStyles}
                  className="gap-2"
                >
                  <UploadCloud size={14} />
                  Add More
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || styles.length === 0}
                    className="gap-2"
                  >
                    {isProcessing && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Create {styles.length}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
