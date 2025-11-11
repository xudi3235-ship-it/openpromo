import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "./useWorkspace";

export interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  key?: string;
  publicUrl?: string;
}

export interface UploadedFile {
  key: string;
  publicUrl: string;
  type: "photo" | "video";
  file: File;
}

export function useStorageUpload() {
  const { workspace } = useWorkspace();
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
    new Map(),
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      const fileId = `${file.name}-${file.size}-${Date.now()}`;

      setUploads((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          file,
          progress: 0,
          status: "uploading",
        });
        return next;
      });

      try {
        // Upload file through backend using FormData
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploads((prev) => {
                const next = new Map(prev);
                const current = next.get(fileId);
                if (current) {
                  next.set(fileId, { ...current, progress });
                }
                return next;
              });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          const uploadUrl = `/api/workspaces/${workspace.slug}/storage/upload`;
          xhr.open("POST", uploadUrl);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        // Parse response
        const responseData = JSON.parse(xhr.responseText);
        const { key, publicUrl } = responseData;

        const uploadedFile: UploadedFile = {
          key,
          publicUrl,
          type: file.type.startsWith("video/") ? "video" : "photo",
          file,
        };

        // Update status to success
        setUploads((prev) => {
          const next = new Map(prev);
          const current = next.get(fileId);
          if (current) {
            next.set(fileId, {
              ...current,
              status: "success",
              progress: 100,
              key,
              publicUrl,
            });
          }
          return next;
        });

        setUploadedFiles((prev) => [...prev, uploadedFile]);

        return uploadedFile;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploads((prev) => {
          const next = new Map(prev);
          const current = next.get(fileId);
          if (current) {
            next.set(fileId, {
              ...current,
              status: "error",
              error: errorMessage,
            });
          }
          return next;
        });

        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        throw error;
      }
    },
    [workspace.slug],
  );

  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      const uploadPromises = files.map((file) => uploadFile(file));
      return Promise.all(uploadPromises);
    },
    [uploadFile],
  );

  const clearUploads = useCallback(() => {
    setUploads(new Map());
    setUploadedFiles([]);
  }, []);

  const removeUploadedFile = useCallback((key: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.key !== key));
  }, []);

  return {
    uploads: Array.from(uploads.values()),
    uploadedFiles,
    uploadFile,
    uploadFiles,
    clearUploads,
    removeUploadedFile,
    isUploading: Array.from(uploads.values()).some(
      (u) => u.status === "uploading" || u.status === "pending",
    ),
  };
}
