import Uppy from "@uppy/core";
import { useEffect, useRef } from "react";

export interface FileValidationConfig {
  maxFiles?: number;
  maxVideoSize?: number; // in bytes
  maxImageSize?: number; // in bytes
  allowedTypes?: string[];
}

const DEFAULT_CONFIG: Required<FileValidationConfig> = {
  maxFiles: 10,
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxImageSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/*", "video/*"],
};

export function useFileValidation(config: FileValidationConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const uppyRef = useRef<Uppy | null>(null);

  useEffect(() => {
    const uppy = new Uppy({
      restrictions: {
        maxFileSize: Math.max(
          finalConfig.maxVideoSize,
          finalConfig.maxImageSize,
        ),
        maxNumberOfFiles: finalConfig.maxFiles,
        allowedFileTypes: finalConfig.allowedTypes,
      },
      autoProceed: false,
    });

    uppyRef.current = uppy;

    return () => {
      uppy.destroy();
    };
  }, [
    finalConfig.maxVideoSize,
    finalConfig.maxImageSize,
    finalConfig.maxFiles,
    finalConfig.allowedTypes,
  ]);

  const validateFiles = (
    files: File[],
  ): { validFiles: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      try {
        // Check file size limits per type
        const isVideo = file.type.startsWith("video/");
        const maxSize = isVideo
          ? finalConfig.maxVideoSize
          : finalConfig.maxImageSize;

        if (file.size > maxSize) {
          const maxSizeMB = isVideo
            ? finalConfig.maxVideoSize / (1024 * 1024)
            : finalConfig.maxImageSize / (1024 * 1024);
          throw new Error(
            `File "${file.name}" is too large. Max size: ${maxSizeMB}MB for ${isVideo ? "videos" : "images"}`,
          );
        }

        // Test if Uppy would accept this file (type validation)
        uppyRef.current?.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });

        // If no error thrown, file is valid
        validFiles.push(file);
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "File validation failed";
        errors.push(error);
        console.error("File validation failed:", err);
      }
    });

    // Clear Uppy's internal state (we don't need it to store files)
    uppyRef.current?.cancelAll();

    return { validFiles, errors };
  };

  return {
    validateFiles,
    config: finalConfig,
  };
}
