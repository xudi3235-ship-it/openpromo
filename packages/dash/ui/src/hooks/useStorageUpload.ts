import { useState } from "react";
import { useWorkspace } from "./useWorkspace";

export interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  key?: string;
  publicUrl?: string;
}

export function useStorageUpload() {
  const { workspace } = useWorkspace();
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
    new Map(),
  );

  const uploadFile = async (
    file: File,
  ): Promise<{ key: string; publicUrl: string }> => {
    const fileId = `${file.name}-${file.size}-${Date.now()}`;

    setUploads((prev) => {
      const next = new Map(prev);
      next.set(fileId, {
        file,
        progress: 0,
        status: "pending",
      });
      return next;
    });

    try {
      // Update status to uploading
      setUploads((prev) => {
        const next = new Map(prev);
        const current = next.get(fileId);
        if (current) {
          next.set(fileId, { ...current, status: "uploading", progress: 0 });
        }
        return next;
      });

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

      return { key, publicUrl };
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

      throw error;
    }
  };

  const uploadFiles = async (
    files: File[],
  ): Promise<Array<{ key: string; publicUrl: string }>> => {
    const uploadPromises = files.map((file) => uploadFile(file));
    return Promise.all(uploadPromises);
  };

  const clearUploads = () => {
    setUploads(new Map());
  };

  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    uploadFiles,
    clearUploads,
  };
}
