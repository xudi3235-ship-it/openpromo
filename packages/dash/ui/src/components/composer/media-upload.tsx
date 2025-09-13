import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { File, Upload, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

interface MediaPreview {
  file: File; // may be an empty placeholder for remote assets
  url: string;
  aspectRatio: string;
  mimeType: string;
}

const generatePreview = async (file: File): Promise<MediaPreview> => {
  const url = URL.createObjectURL(file);

  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = `${img.width}:${img.height}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        const aspectRatio = `${video.videoWidth}:${video.videoHeight}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      video.src = url;
    } else {
      resolve({ file, url, aspectRatio: "Unknown", mimeType: file.type });
    }
  });
};

export function MediaUpload() {
  const { contentCreateData, removeAttachment, uploadAttachments } =
    useComposerStore();
  const { workspace } = useWorkspace();
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{
    preview: MediaPreview;
    index: number;
  } | null>(null);

  const attachments = contentCreateData.base.attachments ?? [];

  // regenerate previews whenever attachments change
  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      // cleanup old previews
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        return [];
      });

      const generated: MediaPreview[] = [];
      for (const att of attachments) {
        if (att.file) {
          generated.push(await generatePreview(att.file));
        }
      }
      if (!cancelled) setPreviews(generated);
    };

    if (attachments.length) {
      build();
    } else {
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        return [];
      });
    }

    return () => {
      cancelled = true;
    };
  }, [attachments]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        return currentPreviews;
      });
    };
  }, []);

  const handleRemove = (index: number) => {
    const preview = previews[index];
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    removeAttachment(index);
  };

  const handleMediaClick = (preview: MediaPreview, index: number) => {
    setSelectedMedia({ preview, index });
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Media</h3>
        {previews.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {previews.length}/10 files
          </span>
        )}
      </div>

      {/* Horizontal Media Row */}
      <div className="flex gap-2">
        {/* Add Button - Full width when no media, compact when media exists */}
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
          onDrop={async (files) => {
            if (!workspace?.slug) return;
            await uploadAttachments(files, workspace.slug);
          }}
          className={`${
            previews.length === 0 ? "flex-1 h-16" : "flex-shrink-0 w-16 h-16"
          } border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors rounded-lg`}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            {previews.length === 0 ? (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-sm">Drop files or click to upload</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-3 w-3" />
                <span className="text-xs">Add</span>
              </div>
            )}
          </div>
        </Dropzone>

        {/* Scrollable Thumbnails */}
        {previews.length > 0 && (
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2">
              {previews.map((preview, index) => {
                const att = attachments[index];
                const meta = (att?.metadata || {}) as Record<string, unknown>;
                const uploading = Boolean(meta.uploading);
                const error = meta.error as string | undefined;
                const isImage =
                  preview.mimeType.startsWith("image/") ||
                  (att?.mimeType ?? "").startsWith("image/");
                const isVideo =
                  preview.mimeType.startsWith("video/") ||
                  (att?.mimeType ?? "").startsWith("video/");

                return (
                  <button
                    key={`${att?.id || preview.file.name}-${index}`}
                    type="button"
                    className="relative flex-shrink-0 w-16 h-16 group rounded-lg overflow-hidden bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => handleMediaClick(preview, index)}
                    title="Click to view details"
                  >
                    {/* Media Preview */}
                    {isImage ? (
                      <img
                        src={preview.url}
                        alt={att?.id || "image"}
                        className="w-full h-full object-cover"
                      />
                    ) : isVideo ? (
                      <>
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute bottom-1 right-1 bg-black/50 rounded p-0.5">
                          <Video className="h-2 w-2 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <File className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    {/* Status Overlay */}
                    {(uploading || error) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-xs font-medium">
                          {uploading ? "..." : "!"}
                        </div>
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      disabled={uploading}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 disabled:opacity-50 z-10"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      {previews.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Share photos and videos • Max 10 files, 50MB each
        </p>
      )}

      {/* Media Detail Dialog */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="flex flex-col overflow-hidden">
              {/* Media Display */}
              <div className="flex-1 flex items-center justify-center p-6 bg-muted/20">
                {selectedMedia.preview.mimeType.startsWith("image/") ? (
                  <img
                    src={selectedMedia.preview.url}
                    alt="Full size preview"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : selectedMedia.preview.mimeType.startsWith("video/") ? (
                  <video
                    src={selectedMedia.preview.url}
                    controls
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  >
                    <track kind="captions" label="auto-generated" />
                  </video>
                ) : (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <File className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedMedia.preview.file.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="border-t p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Filename:</span>
                    <p className="font-medium">
                      {selectedMedia.preview.file.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">File size:</span>
                    <p className="font-medium">
                      {(selectedMedia.preview.file.size / 1024 / 1024).toFixed(
                        2,
                      )}{" "}
                      MB
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">
                      {selectedMedia.preview.file.type}
                    </p>
                  </div>
                  {selectedMedia.preview.aspectRatio !== "Unknown" && (
                    <div>
                      <span className="text-muted-foreground">
                        Aspect ratio:
                      </span>
                      <p className="font-medium">
                        {selectedMedia.preview.aspectRatio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
