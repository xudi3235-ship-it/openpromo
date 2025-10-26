import { Button } from "@openpromo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { apiClient } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

export function VideoThumbnailSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [frameThumbnails, setFrameThumbnails] = useState<string[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [showSection, setShowSection] = useState(false);
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

  // Get the first video file for frame selection
  const firstVideoFile = useMemo(() => {
    const firstVideo = attachments.find((att) => att.type === "video");
    return firstVideo?.file || null;
  }, [attachments]);

  // Create object URL for video when available
  useEffect(() => {
    if (!firstVideoFile) {
      setVideoUrl("");
      setFrameThumbnails([]);
      return;
    }

    const url = URL.createObjectURL(firstVideoFile);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [firstVideoFile]);

  // Handle video metadata loaded - generate frame thumbnails
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const duration = video.duration;
    const frameCount = 10; // Generate 10 thumbnails
    const frames: string[] = [];

    // Generate thumbnails at different timestamps
    const generateFrame = async (index: number) => {
      return new Promise<string>((resolve) => {
        const timestamp = (duration / (frameCount - 1)) * index;

        const handleSeeked = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }

          // Set canvas size
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);

          video.removeEventListener("seeked", handleSeeked);
        };

        video.addEventListener("seeked", handleSeeked);
        video.currentTime = timestamp;
      });
    };

    // Generate all frames sequentially
    (async () => {
      for (let i = 0; i < frameCount; i++) {
        const frameUrl = await generateFrame(i);
        frames.push(frameUrl);
        setFrameThumbnails([...frames]);
      }
    })();
  }, []);

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

  const handleSelectFrame = useCallback(async () => {
    if (!workspace || !frameThumbnails[selectedFrameIndex]) return;

    setIsUploading(true);

    try {
      // Get the selected frame data URL
      const dataUrl = frameThumbnails[selectedFrameIndex];

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });

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
        throw new Error(`Failed to upload image: ${uploadFileResponse.status}`);
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
      toast.success("Thumbnail saved successfully");
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      toast.error("Failed to save thumbnail");
    } finally {
      setIsUploading(false);
    }
  }, [composer, workspace, frameThumbnails, selectedFrameIndex]);

  // Auto-set first frame as thumbnail if no thumbnail exists
  // TODO: Implement auto-extraction of first frame from video
  // This would require video processing on upload

  // Don't show section if no videos
  if (!hasVideo) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Collapsible Section Header */}
      <button
        type="button"
        onClick={() => setShowSection(!showSection)}
        className="flex items-center gap-2 w-full group"
      >
        <div className="flex items-center gap-1.5 flex-1">
          {showSection ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <h4 className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Custom Video Thumbnail{" "}
            <span className="text-muted-foreground/60">(Optional)</span>
          </h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  By default, your video's first frame is used. You can upload a
                  custom image or choose a different frame.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {thumbnailUrl && (
          <span className="text-xs text-muted-foreground">Custom set</span>
        )}
      </button>

      {/* Collapsible Content */}
      {showSection && (
        <div className="space-y-3 pl-5">
          {/* Indent content slightly */}

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
                    Upload
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

          {/* Inline Frame Selector */}
          {firstVideoFile && !thumbnailUrl && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Select a frame from video
              </p>

              {/* Hidden video and canvas for frame extraction */}
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Filmstrip Gallery */}
              {frameThumbnails.length > 0 ? (
                <div className="space-y-2">
                  {/* Scrollable thumbnail strip */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2">
                    {frameThumbnails.map((thumbnail, index) => (
                      <button
                        key={thumbnail}
                        type="button"
                        onClick={() => setSelectedFrameIndex(index)}
                        className={`relative flex-shrink-0 w-16 h-11 rounded border overflow-hidden transition-all ${
                          selectedFrameIndex === index
                            ? "border-foreground ring-1 ring-foreground/20"
                            : "border-border hover:border-foreground/50"
                        }`}
                      >
                        <img
                          src={thumbnail}
                          alt={`Frame ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedFrameIndex === index && (
                          <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
                            <Check className="w-3 h-3 text-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Use Frame Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectFrame}
                      disabled={isUploading}
                      className="h-7 text-xs"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1.5" />
                          Use Selected Frame
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-11 bg-muted rounded flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">
                    Generating thumbnails...
                  </div>
                </div>
              )}
            </div>
          )}

          {!thumbnailUrl && !firstVideoFile && (
            <p className="text-xs text-muted-foreground">
              {defaultVideoThumbnail
                ? "Using video's first frame as thumbnail."
                : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
