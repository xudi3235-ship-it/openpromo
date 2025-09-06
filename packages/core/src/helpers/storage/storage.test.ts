import { afterAll, describe, expect, it } from "vitest";
import { Storage } from "./index";

describe("Storage Service", () => {
  const testFiles: string[] = [];

  afterAll(async () => {
    // Cleanup all test files
    for (const key of testFiles) {
      try {
        await Storage.deleteFile(key);
        // biome-ignore lint/correctness/noUnusedVariables: test
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("Key utilities", () => {
    it("should generate daily keys with correct format", () => {
      const key = Storage.Key.daily("test.txt");
      expect(key).toMatch(/^temporary\/daily\/\d{4}-\d{2}-\d{2}\/test\.txt$/);
    });

    it("should generate weekly keys with correct format", () => {
      const key = Storage.Key.weekly("test.jpg");
      expect(key).toMatch(/^temporary\/weekly\/\d{4}-W\d+\/test\.jpg$/);
    });

    it("should generate monthly keys with correct format", () => {
      const key = Storage.Key.monthly("test.pdf");
      expect(key).toMatch(/^temporary\/monthly\/\d{4}-\d{2}\/test\.pdf$/);
    });

    it("should generate permanent keys", () => {
      const key = Storage.Key.permanent("documents", "important.doc");
      expect(key).toBe("permanent/documents/important.doc");
    });

    it("should generate workspace keys", () => {
      const key = Storage.Key.workspace("workspace-123", "uploads", "file.png");
      expect(key).toBe("workspaces/workspace-123/uploads/file.png");
    });
  });

  describe("File validation", () => {
    it("should validate image types correctly", () => {
      expect(Storage.Validation.isValidImageType("image/jpeg")).toBe(true);
      expect(Storage.Validation.isValidImageType("image/png")).toBe(true);
      expect(Storage.Validation.isValidImageType("image/gif")).toBe(true);
      expect(Storage.Validation.isValidImageType("application/pdf")).toBe(
        false,
      );
    });

    it("should validate video types correctly", () => {
      expect(Storage.Validation.isValidVideoType("video/mp4")).toBe(true);
      expect(Storage.Validation.isValidVideoType("video/webm")).toBe(true);
      expect(Storage.Validation.isValidVideoType("image/jpeg")).toBe(false);
    });

    it("should validate document types correctly", () => {
      expect(Storage.Validation.isValidDocumentType("application/pdf")).toBe(
        true,
      );
      expect(Storage.Validation.isValidDocumentType("text/plain")).toBe(true);
      expect(Storage.Validation.isValidDocumentType("image/jpeg")).toBe(false);
    });

    it("should validate any supported file type", () => {
      expect(Storage.Validation.isValidFileType("image/jpeg")).toBe(true);
      expect(Storage.Validation.isValidFileType("video/mp4")).toBe(true);
      expect(Storage.Validation.isValidFileType("application/pdf")).toBe(true);
      expect(Storage.Validation.isValidFileType("application/unknown")).toBe(
        false,
      );
    });

    it("should validate file sizes correctly", () => {
      expect(Storage.Validation.validateFileSize(1024 * 1024, 10)).toBe(true); // 1MB < 10MB
      expect(Storage.Validation.validateFileSize(50 * 1024 * 1024, 10)).toBe(
        false,
      ); // 50MB > 10MB
    });
  });

  describe("Basic file operations", () => {
    it("should upload and download a text file", async () => {
      const key = Storage.Key.daily("test-basic.txt");
      const content = "Hello, Storage Service! This is a test file.";

      testFiles.push(key);

      // Upload
      const uploadResult = await Storage.upload(key, content, {
        contentType: "text/plain",
        metadata: {
          testId: "basic-upload-test",
          timestamp: new Date().toISOString(),
        },
        acl: "private",
      });

      expect(uploadResult.key).toBe(key);
      expect(uploadResult.url).toContain(key);

      // Download and verify
      const downloadedContent = await Storage.get(key);
      expect(downloadedContent.toString()).toBe(content);
    });

    it("should upload and download binary content", async () => {
      const key = Storage.Key.daily("test-binary.jpg");
      const binaryContent = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header

      testFiles.push(key);

      // Upload
      await Storage.upload(key, binaryContent, {
        contentType: "image/jpeg",
      });

      // Download and verify
      const downloadedContent = await Storage.get(key);
      expect(downloadedContent).toEqual(binaryContent);
    });

    it("should delete files successfully", async () => {
      const key = Storage.Key.daily("test-delete.txt");
      const content = "This file will be deleted";

      // Upload
      await Storage.upload(key, content);

      // Verify exists
      const downloadedContent = await Storage.get(key);
      expect(downloadedContent.toString()).toBe(content);

      // Delete
      await Storage.deleteFile(key);

      // Verify deleted
      await expect(Storage.get(key)).rejects.toThrow("File not found");
    });
  });

  describe("Multipart upload", () => {
    it("should handle large file multipart upload", async () => {
      const key = Storage.Key.daily("test-large.txt");
      const largeContent = Buffer.alloc(6 * 1024 * 1024, "A"); // 6MB

      testFiles.push(key);

      // Upload using multipart
      const result = await Storage.uploadMultipart(key, largeContent, {
        contentType: "text/plain",
        partSize: 5 * 1024 * 1024, // 5MB parts
        metadata: {
          testId: "multipart-upload-test",
          size: largeContent.length.toString(),
        },
      });

      expect(result.key).toBe(key);
      expect(result.url).toContain(key);

      // Download and verify size
      const downloadedContent = await Storage.get(key);
      expect(downloadedContent.length).toBe(largeContent.length);
    }, 30000); // 30 second timeout for large upload

    it("should handle multipart upload parts correctly", async () => {
      const key = Storage.Key.daily("test-multipart-parts.txt");
      const content = Buffer.alloc(1024, "B"); // 1KB

      testFiles.push(key);

      // Initiate multipart upload
      const multipartUpload = await Storage.initiateMultipartUpload(key, {
        contentType: "text/plain",
      });

      expect(multipartUpload.uploadId).toBeDefined();
      expect(multipartUpload.key).toBe(key);

      // Upload a single part
      const part = await Storage.uploadPart(
        key,
        multipartUpload.uploadId,
        1,
        content,
      );
      expect(part.ETag).toBeDefined();
      expect(part.PartNumber).toBe(1);

      // Complete multipart upload
      const result = await Storage.completeMultipartUpload(
        key,
        multipartUpload.uploadId,
        [part],
      );
      expect(result.key).toBe(key);

      // Verify uploaded content
      const downloadedContent = await Storage.get(key);
      expect(downloadedContent.length).toBe(content.length);
    });

    it("should abort multipart upload correctly", async () => {
      const key = Storage.Key.daily("test-abort-multipart.txt");

      // Initiate multipart upload
      const multipartUpload = await Storage.initiateMultipartUpload(key);

      // Abort the upload
      await expect(
        Storage.abortMultipartUpload(key, multipartUpload.uploadId),
      ).resolves.not.toThrow();
    });
  });

  describe("Presigned URLs", () => {
    it("should generate presigned GET URL", async () => {
      const key = Storage.Key.daily("test-presigned-get.txt");
      testFiles.push(key);

      // Upload a file first
      await Storage.upload(key, "test content");

      // Generate presigned URL
      const url = await Storage.getPresignedUrl(key, {
        operation: "get",
        expiresIn: 3600,
      });

      expect(url).toContain(key);
      expect(url).toContain("X-Amz-Signature");
      expect(url).toContain("X-Amz-Expires=3600");
    });

    it("should generate presigned PUT URL", async () => {
      const key = Storage.Key.daily("test-presigned-put.txt");

      const url = await Storage.getPresignedUrl(key, {
        operation: "put",
        expiresIn: 1800,
      });

      expect(url).toContain(key);
      expect(url).toContain("X-Amz-Signature");
      expect(url).toContain("X-Amz-Expires=1800");
    });

    it("should generate presigned multipart URLs", async () => {
      const key = Storage.Key.daily("test-presigned-multipart.txt");
      const partCount = 3;

      const result = await Storage.getPresignedMultipartUrls(key, partCount, {
        expiresIn: 3600,
      });

      expect(result.uploadId).toBeDefined();
      expect(result.urls).toHaveLength(partCount);

      for (let i = 0; i < partCount; i++) {
        expect(result.urls[i]).toContain(`partNumber=${i + 1}`);
        expect(result.urls[i]).toContain(result.uploadId);
      }

      // Clean up the initiated upload
      await Storage.abortMultipartUpload(key, result.uploadId);
    });
  });

  describe("Error handling", () => {
    it("should throw StorageError for non-existent files", async () => {
      await expect(Storage.get("non-existent-file.txt")).rejects.toThrow(
        Storage.StorageError,
      );
      await expect(Storage.get("non-existent-file.txt")).rejects.toThrow(
        "File not found",
      );
    });

    it("should handle delete of non-existent files gracefully", async () => {
      // Should not throw error for deleting non-existent file
      await expect(
        Storage.deleteFile("non-existent-file.txt"),
      ).resolves.not.toThrow();
    });

    it("should handle abort of non-existent multipart upload gracefully", async () => {
      await expect(
        Storage.abortMultipartUpload("key", "fake-upload-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("Different file types and storage policies", () => {
    it("should handle different storage policies", async () => {
      const imageKey = Storage.Key.weekly("test-image.jpg");
      const videoKey = Storage.Key.monthly("test-video.mp4");
      const docKey = Storage.Key.permanent("docs", "test-doc.pdf");

      const imageContent = Buffer.from("fake-jpeg-content");
      const videoContent = Buffer.from("fake-mp4-content");
      const docContent = Buffer.from("fake-pdf-content");

      testFiles.push(imageKey, videoKey, docKey);

      // Upload different file types
      await Storage.upload(imageKey, imageContent, {
        contentType: "image/jpeg",
      });
      await Storage.upload(videoKey, videoContent, {
        contentType: "video/mp4",
      });
      await Storage.upload(docKey, docContent, {
        contentType: "application/pdf",
      });

      // Verify uploads
      const downloadedImage = await Storage.get(imageKey);
      const downloadedVideo = await Storage.get(videoKey);
      const downloadedDoc = await Storage.get(docKey);

      expect(downloadedImage).toEqual(imageContent);
      expect(downloadedVideo).toEqual(videoContent);
      expect(downloadedDoc).toEqual(docContent);
    });
  });
});
