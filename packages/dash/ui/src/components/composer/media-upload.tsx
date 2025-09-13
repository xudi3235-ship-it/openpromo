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

      {/* Compact Upload Area */}
      <div className="space-y-2">
        {/* Upload Zone */}
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
          onDrop={async (files) => {
            if (!workspace?.slug) return;
            await uploadAttachments(files, workspace.slug);
          }}
          className="h-20 border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span className="text-sm">Drop files or click to upload</span>
          </div>
        </Dropzone>

        {/* File Grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
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
                  className="relative aspect-square group rounded-lg overflow-hidden bg-muted"
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
                      <div className="absolute bottom-1 right-1 bg-black/50 rounded p-1">
                        <Video className="h-3 w-3 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <File className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status Overlay */}
                  {(uploading || error) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-xs font-medium">
                        {uploading ? "Uploading..." : "Failed"}
                      </div>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    disabled={uploading}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 disabled:opacity-50"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Text */}
      {previews.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Share photos and videos • Max 10 files, 50MB each
        </p>
      )}
    </div>
  );
}
