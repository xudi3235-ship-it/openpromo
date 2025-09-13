import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dropzone, DropzoneEmptyState } from "@/components/dropzone";
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

  const attachments = contentCreateData.base.attachments;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share photos and videos. Instagram posts can't exceed 10 photos.
        </p>
      </CardHeader>
      <CardContent>
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
          onDrop={async (files) => {
            if (!workspace?.slug) return;

            // Use the new uploadAttachments action from the store
            await uploadAttachments(files, workspace.slug);
          }}
          className="h-32"
        >
          <DropzoneEmptyState />
        </Dropzone>

        {previews.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Selected files ({previews.length})
            </h4>
            <div className="space-y-3">
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
                  <div
                    key={`${att?.id || preview.file.name}-${index}`}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg relative"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                      {isImage ? (
                        <img
                          src={preview.url}
                          alt={att?.id || "image"}
                          className="w-full h-full object-cover"
                        />
                      ) : isVideo ? (
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          File
                        </div>
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {preview.file.name || att?.id}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {preview.file.size ? (
                          <span>
                            {(preview.file.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                        ) : null}
                        <span>•</span>
                        <span>{preview.aspectRatio}</span>
                        {uploading && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">Uploading...</span>
                          </>
                        )}
                        {error && (
                          <>
                            <span>•</span>
                            <span className="text-red-600">Failed</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      className="flex-shrink-0 h-8 w-8 p-0"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
