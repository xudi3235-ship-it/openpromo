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
import { useComposerStore } from "@/stores/composer-store";

interface MediaPreview {
  file: File;
  url: string;
  aspectRatio: string;
}

const generatePreview = async (file: File): Promise<MediaPreview> => {
  const url = URL.createObjectURL(file);

  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = `${img.width}:${img.height}`;
        resolve({ file, url, aspectRatio });
      };
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        const aspectRatio = `${video.videoWidth}:${video.videoHeight}`;
        resolve({ file, url, aspectRatio });
      };
      video.src = url;
    } else {
      resolve({ file, url, aspectRatio: "Unknown" });
    }
  });
};

export function MediaUpload() {
  const { contentCreateData, addAttachments, removeAttachment } =
    useComposerStore();
  const [previews, setPreviews] = useState<MediaPreview[]>([]);

  const attachments = contentCreateData.base.attachments;

  useEffect(() => {
    const generatePreviews = async () => {
      const filesWithAttachments = attachments
        .map((attachment) => attachment.file)
        .filter((file): file is File => file !== undefined);

      const newPreviews = await Promise.all(
        filesWithAttachments.map((file) => generatePreview(file)),
      );
      setPreviews(newPreviews);
    };

    if (attachments.length > 0) {
      generatePreviews();
    } else {
      // Clean up existing previews
      previews.forEach((preview) => {
        if (preview.url.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      });
      setPreviews([]);
    }
  }, [
    attachments, // Clean up existing previews
    previews.forEach,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.url.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [previews]);

  const handleRemove = (index: number) => {
    const preview = previews[index];
    if (preview?.url.startsWith("blob:")) {
      URL.revokeObjectURL(preview.url);
    }
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
          onDrop={(files) => {
            addAttachments(files);
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
              {previews.map((preview, index) => (
                <div
                  key={`${preview.file.name}-${preview.file.size}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                    {preview.file.type.startsWith("image/") ? (
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : preview.file.type.startsWith("video/") ? (
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
                      {preview.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {(preview.file.size / (1024 * 1024)).toFixed(1)}MB
                      </span>
                      <span>•</span>
                      <span>{preview.aspectRatio}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
