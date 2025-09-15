import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { toast } from "sonner";
import { apiClient } from "@/lib/hono-client";

interface ImageUploadResult {
  attachmentIndex: number;
  id: string;
  publicUrl?: string;
  file: File;
}

interface VideoUploadResult {
  attachmentIndex: number;
  id: string;
  publicUrl: string;
  previewIframeUrl?: string;
  thumbnailUrl?: string;
  file: File;
}

interface UploadErrorResult {
  attachmentIndex: number;
  error: Error;
  file: File;
}

type UploadResult = ImageUploadResult | VideoUploadResult | UploadErrorResult;

export async function uploadImages(
  imageFiles: { file: File; index: number }[],
  workspaceSlug: string,
): Promise<UploadResult[]> {
  const imageUploadPromises = imageFiles.map(
    async ({ file, index: attachmentIndex }) => {
      try {
        // Get presigned URL for image upload
        const uploadResponse = await apiClient.workspaces[
          ":workspaceSlug"
        ].media.images["upload-url"].$post({
          param: { workspaceSlug },
          json: { requireSignedURLs: false },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Failed to get image upload URL: ${uploadResponse.status}`,
          );
        }

        const { id, uploadURL } = await uploadResponse.json();

        if (!uploadURL || !id) {
          throw new Error("Invalid image response: missing uploadURL or id");
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

        // Get the public URL for images
        const publicUrlResponse = await apiClient.workspaces[
          ":workspaceSlug"
        ].media.images[":imageId"].url.$get({
          param: { workspaceSlug, imageId: id },
          query: { variant: "public" },
        });

        let publicUrl: string | undefined;
        if (publicUrlResponse.ok) {
          const { url } = await publicUrlResponse.json();
          publicUrl = url;
        }

        return { attachmentIndex, id, publicUrl, file } as ImageUploadResult;
      } catch (error) {
        console.error("Image upload error:", error);
        return {
          attachmentIndex,
          error: error as Error,
          file,
        } as UploadErrorResult;
      }
    },
  );

  return Promise.all(imageUploadPromises);
}

export async function uploadVideos(
  videoFiles: { file: File; index: number }[],
  workspaceSlug: string,
): Promise<UploadResult[]> {
  const videoUploadPromises = videoFiles.map(
    async ({ file, index: attachmentIndex }) => {
      try {
        // Get presigned URL for video upload
        const uploadResponse = await apiClient.workspaces[
          ":workspaceSlug"
        ].media.videos["upload-url"].$post({
          param: { workspaceSlug },
          json: { requireSignedURLs: false, maxDurationSeconds: 60 },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Failed to get video upload URL: ${uploadResponse.status}`,
          );
        }

        const uploadData = await uploadResponse.json();
        const { id, uploadURL, previewIframeUrl, thumbnailUrl } = uploadData;

        if (!uploadURL || !id) {
          throw new Error("Invalid video response: missing uploadURL or id");
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
            `Failed to upload video: ${uploadFileResponse.status}`,
          );
        }

        return {
          attachmentIndex,
          id,
          publicUrl: previewIframeUrl,
          previewIframeUrl,
          thumbnailUrl,
          file,
        } as VideoUploadResult;
      } catch (error) {
        console.error("Video upload error:", error);
        return {
          attachmentIndex,
          error: error as Error,
          file,
        } as UploadErrorResult;
      }
    },
  );

  return Promise.all(videoUploadPromises);
}

export async function uploadAttachments(
  files: File[],
  workspaceSlug: string,
  startingIndex: number,
): Promise<UploadResult[]> {
  // Separate files by type
  const imageFiles: { file: File; index: number }[] = [];
  const videoFiles: { file: File; index: number }[] = [];

  files.forEach((file, i) => {
    const attachmentIndex = startingIndex + i;
    if (file.type.startsWith("video/")) {
      videoFiles.push({ file, index: attachmentIndex });
    } else {
      imageFiles.push({ file, index: attachmentIndex });
    }
  });

  // Upload images and videos in parallel
  const [imageResults, videoResults] = await Promise.all([
    uploadImages(imageFiles, workspaceSlug),
    uploadVideos(videoFiles, workspaceSlug),
  ]);

  return [...imageResults, ...videoResults];
}

export function processUploadResults(
  results: UploadResult[],
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
    metadata?: Record<string, unknown>,
  ) => void,
) {
  results.forEach((result) => {
    if ("error" in result) {
      // Handle upload failure
      updateAttachment(
        result.attachmentIndex,
        {},
        {
          uploading: false,
          error: "Upload failed",
        },
      );
      toast.error(`Failed to upload ${result.file.name}`);
    } else {
      // Handle upload success
      const metadata: Record<string, unknown> = { uploading: false };

      if ("previewIframeUrl" in result && result.previewIframeUrl) {
        metadata.previewIframeUrl = result.previewIframeUrl;
      }
      if ("thumbnailUrl" in result && result.thumbnailUrl) {
        metadata.thumbnailUrl = result.thumbnailUrl;
      }

      updateAttachment(
        result.attachmentIndex,
        {
          id: result.id,
          s3Key: result.id,
          publicUrl: result.publicUrl,
        },
        metadata,
      );

      toast.success(`${result.file.name} uploaded successfully`);
    }
  });
}
