import type {
  CreateMultipartUploadCommandInput,
  PutObjectCommandInput,
  CompletedPart as S3CompletedPart,
} from "@aws-sdk/client-s3";
import { client } from "../aws/client";
import { Log } from "../util/log";

export namespace Storage {
  const log = Log.create({ namespace: "storage" });

  export type UploadOptions = Pick<
    PutObjectCommandInput,
    "ContentType" | "Metadata" | "Tagging" | "ACL"
  > & {
    contentType?: string; // Alias for ContentType
    metadata?: Record<string, string>; // Alias for Metadata
    tagging?: string; // Alias for Tagging
    acl?: "private" | "public-read"; // Alias for ACL
  };

  export type MultipartUploadOptions = Pick<
    CreateMultipartUploadCommandInput,
    "ContentType" | "Metadata" | "Tagging" | "ACL"
  > & {
    contentType?: string;
    metadata?: Record<string, string>;
    tagging?: string;
    acl?: "private" | "public-read";
    partSize?: number; // Default 5MB
  };

  export type PresignedUrlOptions = {
    expiresIn?: number; // Default 1 hour
    operation?: "get" | "put";
  };

  export type MultipartUpload = {
    uploadId: string;
    key: string;
  };

  export type CompletedPart = Pick<S3CompletedPart, "ETag" | "PartNumber"> & {
    ETag: string;
    PartNumber: number;
  };

  function s3Url(_key?: string): string {
    // const region = process.env.AWS_REGION || DEFAULT_AWS_REGION;
    // FIXME: move to R2 instead, no need for these.
    throw new Error("TODO: move to R2, off aws");
    // const baseUrl = `https://${Resource.Storage.name}.s3.${region}.amazonaws.com`;
    // return key ? `${baseUrl}/${key}` : baseUrl;
  }

  export class StorageError extends Error {
    constructor(
      message: string,
      public readonly context?: Record<string, unknown>,
    ) {
      super(message);
    }
  }

  // S3 Key utilities based on temporary bucket policy
  export namespace Key {
    /**
     * Generate key for daily temporary files (expires in 1 day)
     */
    export function daily(filename: string): string {
      const timestamp = new Date().toISOString().split("T")[0];
      return `temporary/daily/${timestamp}/${filename}`;
    }

    /**
     * Generate key for weekly temporary files (expires in 7 days)
     */
    export function weekly(filename: string): string {
      const date = new Date();
      const weekNumber = getWeekNumber(date);
      const year = date.getFullYear();
      return `temporary/weekly/${year}-W${weekNumber}/${filename}`;
    }

    /**
     * Generate key for monthly temporary files (expires in 30 days)
     */
    export function monthly(filename: string): string {
      const date = new Date();
      const month = date.toISOString().slice(0, 7); // YYYY-MM
      return `temporary/monthly/${month}/${filename}`;
    }

    /**
     * Generate key for permanent files
     */
    export function permanent(path: string, filename: string): string {
      return `permanent/${path}/${filename}`;
    }

    /**
     * Generate key for workspace-specific files
     */
    export function workspace(
      workspaceId: string,
      path: string,
      filename: string,
    ): string {
      return `workspaces/${workspaceId}/${path}/${filename}`;
    }

    function getWeekNumber(date: Date): number {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear =
        (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
  }

  // File validation utilities
  // TODO: platform specific might have more limitations
  export namespace Validation {
    const ALLOWED_IMAGE_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    const ALLOWED_VIDEO_TYPES = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo", // .avi
      "video/webm",
    ];

    const ALLOWED_DOCUMENT_TYPES = [
      "application/pdf",
      "text/plain",
      "application/json",
      "text/csv",
    ];

    export function isValidImageType(mimeType: string): boolean {
      return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
    }

    export function isValidVideoType(mimeType: string): boolean {
      return ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase());
    }

    export function isValidDocumentType(mimeType: string): boolean {
      return ALLOWED_DOCUMENT_TYPES.includes(mimeType.toLowerCase());
    }

    export function isValidFileType(mimeType: string): boolean {
      return (
        isValidImageType(mimeType) ||
        isValidVideoType(mimeType) ||
        isValidDocumentType(mimeType)
      );
    }

    export function validateFileSize(
      fileSize: number,
      maxSizeMB: number = 1024, // Default 1GB
    ): boolean {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      return fileSize <= maxSizeBytes;
    }
  }

  /**
   * Upload a file to S3
   */
  export async function upload(
    key: string,
    body: Buffer | Uint8Array | string,
    options: UploadOptions = {},
  ): Promise<{ key: string; url: string }> {
    log.info("uploading file", { key, size: body.length });

    const c = await client();
    const headers: Record<string, string> = {};

    if (options.contentType) {
      headers["Content-Type"] = options.contentType;
    }

    if (options.acl) {
      headers["x-amz-acl"] = options.acl;
    }

    if (options.tagging) {
      headers["x-amz-tagging"] = options.tagging;
    }

    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const response = await c.fetch(s3Url(key), {
      method: "PUT",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Upload failed: ${response.status} ${response.statusText}`,
        { key, body: errorText },
      );
    }

    const url = s3Url(key);
    return { key, url };
  }

  /**
   * Upload large files using multipart upload
   */
  export async function uploadMultipart(
    key: string,
    body: Buffer,
    options: MultipartUploadOptions = {},
  ): Promise<{ key: string; url: string }> {
    const partSize = options.partSize || 5 * 1024 * 1024; // 5MB default

    log.info("starting multipart upload", { key, size: body.length, partSize });

    // Initiate multipart upload
    const multipartUpload = await initiateMultipartUpload(key, options);
    const { uploadId } = multipartUpload;

    try {
      const parts: CompletedPart[] = [];
      const totalParts = Math.ceil(body.length / partSize);

      // Upload parts in parallel (limit concurrency to avoid rate limiting)
      const uploadPromises: Promise<void>[] = [];
      const concurrencyLimit = 3;

      for (let i = 0; i < totalParts; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, body.length);
        const partBody = body.subarray(start, end);
        const partNumber = i + 1;

        const uploadPartAsync = async () => {
          const part = await uploadPart(key, uploadId, partNumber, partBody);
          parts[i] = part;
        };

        uploadPromises.push(uploadPartAsync());

        // Limit concurrency
        if (uploadPromises.length >= concurrencyLimit) {
          await Promise.all(uploadPromises.splice(0, concurrencyLimit));
        }
      }

      // Wait for remaining uploads
      await Promise.all(uploadPromises);

      // Complete multipart upload
      const result = await completeMultipartUpload(key, uploadId, parts);

      log.info("multipart upload completed", { key, totalParts });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(new Error(`multipart upload failed: ${errorMessage}`));

      // Abort multipart upload on error
      await abortMultipartUpload(key, uploadId);

      throw error;
    }
  }

  /**
   * Initiate a multipart upload
   */
  export async function initiateMultipartUpload(
    key: string,
    options: UploadOptions = {},
  ): Promise<MultipartUpload> {
    log.info("initiating multipart upload", { key });

    const c = await client();
    const headers: Record<string, string> = {};

    if (options.contentType) {
      headers["Content-Type"] = options.contentType;
    }

    if (options.acl) {
      headers["x-amz-acl"] = options.acl;
    }

    if (options.tagging) {
      headers["x-amz-tagging"] = options.tagging;
    }

    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const response = await c.fetch(`${s3Url(key)}?uploads`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to initiate multipart upload: ${response.status} ${response.statusText}`,
        { key, body: errorText },
      );
    }

    const responseText = await response.text();
    // Parse XML response to get UploadId
    const uploadIdMatch = responseText.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) {
      throw new StorageError("Failed to parse UploadId from response", {
        key,
        response: responseText,
      });
    }

    const uploadId = uploadIdMatch[1];
    return { uploadId, key };
  }

  /**
   * Upload a single part
   */
  export async function uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<CompletedPart> {
    log.info("uploading part", {
      key,
      uploadId,
      partNumber,
      size: body.length,
    });

    const c = await client();
    const response = await c.fetch(
      `${s3Url(key)}?partNumber=${partNumber}&uploadId=${uploadId}`,
      {
        method: "PUT",
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to upload part ${partNumber}: ${response.status} ${response.statusText}`,
        {
          key,
          uploadId,
          partNumber,
          body: errorText,
        },
      );
    }

    const etag = response.headers.get("ETag");
    if (!etag) {
      throw new StorageError(`No ETag returned for part ${partNumber}`, {
        key,
        uploadId,
        partNumber,
      });
    }

    return {
      ETag: etag,
      PartNumber: partNumber,
    };
  }

  /**
   * Get a file from S3
   */
  export async function get(key: string): Promise<Buffer> {
    log.info("getting file", { key });

    const c = await client();
    const response = await c.fetch(s3Url(key), {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new StorageError(`File not found: ${key}`, { key });
      }
      const errorText = await response.text();
      throw new StorageError(
        `Failed to get file: ${response.status} ${response.statusText}`,
        { key, body: errorText },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from S3
   */
  export async function deleteFile(key: string): Promise<void> {
    log.info("deleting file", { key });

    const c = await client();
    const response = await c.fetch(s3Url(key), {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to delete file: ${response.status} ${response.statusText}`,
        { key, body: errorText },
      );
    }
  }

  /**
   * Generate a presigned URL for direct client uploads or downloads
   */
  export async function getPresignedUrl(
    key: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    const operation = options.operation || "get";
    const expiresIn = options.expiresIn || 3600; // 1 hour default

    log.info("generating presigned URL", { key, operation, expiresIn });

    const c = await client();
    const method = operation === "put" ? "PUT" : "GET";
    const url = s3Url(key);

    // Create a presigned URL using aws4fetch
    // Add the expires parameter to the URL before signing
    const urlWithExpires = new URL(url);
    urlWithExpires.searchParams.set("X-Amz-Expires", expiresIn.toString());

    const signedRequest = await c.sign(
      new Request(urlWithExpires.toString(), { method }),
      {
        aws: { signQuery: true },
      },
    );

    return signedRequest.url;
  }

  /**
   * Get presigned URL for multipart upload
   */
  export async function getPresignedMultipartUrls(
    key: string,
    partCount: number,
    options: PresignedUrlOptions = {},
  ): Promise<{ uploadId: string; urls: string[] }> {
    const expiresIn = options.expiresIn || 3600;

    log.info("generating presigned multipart URLs", {
      key,
      partCount,
      expiresIn,
    });

    // Initiate multipart upload
    const multipartUpload = await initiateMultipartUpload(key);
    const { uploadId } = multipartUpload;
    const urls: string[] = [];

    const c = await client();

    // Generate presigned URLs for each part
    for (let i = 1; i <= partCount; i++) {
      const baseUrl = `${s3Url(key)}?partNumber=${i}&uploadId=${uploadId}`;
      const urlWithExpires = new URL(baseUrl);
      urlWithExpires.searchParams.set("X-Amz-Expires", expiresIn.toString());

      const signedRequest = await c.sign(
        new Request(urlWithExpires.toString(), { method: "PUT" }),
        {
          aws: { signQuery: true },
        },
      );
      urls.push(signedRequest.url);
    }

    return { uploadId, urls };
  }

  /**
   * Complete multipart upload (used with presigned URLs)
   */
  export async function completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<{ key: string; url: string }> {
    log.info("completing multipart upload", {
      key,
      uploadId,
      partCount: parts.length,
    });

    const c = await client();

    // Sort parts by PartNumber
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    // Create XML body for complete multipart upload
    const xmlBody = `<CompleteMultipartUpload>
${sortedParts
  .map(
    (part) => `  <Part>
    <PartNumber>${part.PartNumber}</PartNumber>
    <ETag>${part.ETag}</ETag>
  </Part>`,
  )
  .join("\n")}
</CompleteMultipartUpload>`;

    const response = await c.fetch(`${s3Url(key)}?uploadId=${uploadId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xmlBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to complete multipart upload: ${response.status} ${response.statusText}`,
        {
          key,
          uploadId,
          body: errorText,
        },
      );
    }

    const url = s3Url(key);
    return { key, url };
  }

  /**
   * Abort multipart upload
   */
  export async function abortMultipartUpload(
    key: string,
    uploadId: string,
  ): Promise<void> {
    log.info("aborting multipart upload", { key, uploadId });

    const c = await client();
    const response = await c.fetch(`${s3Url(key)}?uploadId=${uploadId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to abort multipart upload: ${response.status} ${response.statusText}`,
        {
          key,
          uploadId,
          body: errorText,
        },
      );
    }
  }
}
