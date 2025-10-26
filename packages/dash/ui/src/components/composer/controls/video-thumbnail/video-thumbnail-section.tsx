import { Button } from "@openpromo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { Info, Loader2, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { apiClient } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

export function VideoThumbnailSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const composer = useComposerStore();
  const { workspace } = useWorkspace();
  const attachments = composer.contentCreateData.base.attachments || [];
  const thumbnailUrl = composer.contentCreateData.base.thumbnailUrl;

  // Check if there's at least one video attachment
  const hasVideo = useMemo(
    () => attachments.some((att) => att.type === "video"),
    [attachments],
  );

  // Get the first video's default thumbnail
  const defaultVideoThumbnail = useMemo(() => {
    const firstVideo = attachments.find((att) => att.type === "video");
    if (!firstVideo) return null;
    // Video attachments can have thumbnailUrl or thumbnail field
    return firstVideo.thumbnailUrl || firstVideo.thumbnail || null;
  }, [attachments]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !workspace) return;

      // Validate it's an image
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setIsUploading(true);

      try {
        // Get presigned URL for image upload
        const uploadResponse = await apiClient.workspaces[
          ":workspaceSlug"
        ].media.images["upload-url"].$post({
          param: { workspaceSlug: workspace.slug },
          json: { requireSignedURLs: false },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Failed to get image upload URL: ${uploadResponse.status}`,
          );
        }

        const { id, uploadURL } = await uploadResponse.json();

        if (!uploadURL || !id) {
          throw new Error("Invalid response: missing uploadURL or id");
        }

        // Upload the file to the presigned URL
        const formData = new FormData();
        formData.append("file", file);

        const uploadFileResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadFileResponse.ok) {
          throw new Error(
            `Failed to upload image: ${uploadFileResponse.status}`,
          );
        }

        // Get the public URL
        const publicUrlResponse = await apiClient.workspaces[
          ":workspaceSlug"
        ].media.images[":imageId"].url.$get({
          param: { workspaceSlug: workspace.slug, imageId: id },
          query: { variant: "public" },
        });

        if (!publicUrlResponse.ok) {
          throw new Error("Failed to get public URL");
        }

        const { url } = await publicUrlResponse.json();

        // Set the thumbnail URL
        composer.setVideoThumbnail(url);
        toast.success("Thumbnail uploaded successfully");
      } catch (error) {
        console.error("Thumbnail upload error:", error);
        toast.error("Failed to upload thumbnail");
      } finally {
        setIsUploading(false);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [composer, workspace],
  );

  const handleRemove = useCallback(() => {
    composer.setVideoThumbnail(undefined);
  }, [composer]);

  // Auto-set first frame as thumbnail if no thumbnail exists
  // TODO: Implement auto-extraction of first frame from video
  // This would require video processing on upload

  // Don't show section if no videos
  if (!hasVideo) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">
          Custom Video Thumbnail
        </h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                Upload a custom thumbnail for your video. If not provided, the
                video's first frame will be used automatically.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-3">
        {/* Thumbnail Preview */}
        {thumbnailUrl || defaultVideoThumbnail ? (
          <div className="relative h-20 w-20 flex-shrink-0 rounded-lg border overflow-hidden bg-muted">
            <img
              src={thumbnailUrl || defaultVideoThumbnail || ""}
              alt="Video thumbnail"
              className="h-full w-full object-cover"
            />
            {!thumbnailUrl && defaultVideoThumbnail && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-[10px] font-medium text-white px-1.5 py-0.5 bg-black/60 rounded">
                  Default
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="h-8"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {thumbnailUrl ? "Change" : "Upload"}
              </>
            )}
          </Button>
          {thumbnailUrl && !isUploading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      </div>

      {!thumbnailUrl && (
        <p className="text-xs text-muted-foreground">
          {defaultVideoThumbnail
            ? "Showing video's first frame. Upload a custom thumbnail to override."
            : "Upload a custom thumbnail for your video. Recommended: 1920x1080px"}
        </p>
      )}
    </div>
  );
}
