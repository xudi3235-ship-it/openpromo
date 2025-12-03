import type {
  CreateMultipartUploadCommandInput,
  PutObjectCommandInput,
  CompletedPart as S3CompletedPart,
} from "@aws-sdk/client-s3";
import { Binding } from "@core/helpers/api-env";
import { getR2Client } from "@core/providers/aws";
import { Log } from "@core/utils/log";

export namespace Storage {
  const log = Log.create({ namespace: "storage" });

  export type BucketConfig = {
    name: string;
    publicUrl?: string | null;
  };

  export type BucketInput = string | BucketConfig;

  export const PUBLIC_BUCKET: BucketConfig = {
    name: "public",
    publicUrl: "https://bucket.openpromo.app",
  } as const;

  export type UploadOptions = Pick<
    PutObjectCommandInput,
    "ContentType" | "Metadata" | "Tagging" | "ACL"
  > & {
    contentType?: string;
    metadata?: Record<string, string>;
    tagging?: string;
    acl?: "private" | "public-read";
  };

  export type MultipartUploadOptions = Pick<
    CreateMultipartUploadCommandInput,
    "ContentType" | "Metadata" | "Tagging" | "ACL"
  > & {
    contentType?: string;
    metadata?: Record<string, string>;
    tagging?: string;
    acl?: "private" | "public-read";
    partSize?: number;
  };

  export type PresignedUrlOptions = {
    expiresIn?: number;
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

  export class StorageError extends Error {
    constructor(
      message: string,
      public readonly context?: Record<string, unknown>,
    ) {
      super(message);
    }
  }

  async function listObjectsViaBinding(params: {
    bucket: R2Bucket;
    prefix?: string;
    continuationToken?: string;
    maxKeys?: number;
  }): Promise<ListPage> {
    const { bucket, prefix, continuationToken, maxKeys } = params;
    const result = await bucket.list({
      prefix,
      cursor: continuationToken,
      limit: maxKeys,
    });
    const cursor =
      typeof (result as { cursor?: unknown }).cursor === "string"
        ? ((result as { cursor?: string }).cursor as string)
        : undefined;

    const objects =
      result.objects?.map((obj) => ({
        key: obj.key,
        lastModified: obj.uploaded ? new Date(obj.uploaded) : undefined,
      })) ?? [];

    return {
      objects,
      isTruncated: result.truncated ?? false,
      continuationToken: cursor,
    };
  }

  type UploadBody =
    | Buffer
    | Uint8Array
    | ArrayBuffer
    | string
    | ReadableStream<Uint8Array>
    | ReadableStream;

  type ListObject = {
    key: string;
    lastModified?: Date;
  };

  type ListObjectsResult = {
    objects: ListObject[];
    isTruncated: boolean;
    continuationToken?: string;
  };

  type ListPage = {
    objects: ListObject[];
    isTruncated: boolean;
    continuationToken?: string;
  };

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const ONE_DAY_MS = ONE_HOUR_MS * 24;
  const ONE_WEEK_MS = ONE_DAY_MS * 7;
  const ONE_MONTH_MS = ONE_DAY_MS * 35;

  function resolveBucket(bucket: BucketInput): BucketConfig {
    if (typeof bucket === "string") {
      return { name: bucket };
    }
    return bucket;
  }

  function objectUrl(key: string, bucket: BucketInput): string {
    const { r2Url } = getR2Client();
    const { name } = resolveBucket(bucket);
    return `${r2Url}/${name}/${key}`;
  }

  export function publicUrl(key: string, bucket: BucketInput): string {
    const config = resolveBucket(bucket);
    if (config.publicUrl) {
      const base = config.publicUrl.replace(/\/$/, "");
      return `${base}/${key}`;
    }
    return objectUrl(key, config);
  }

  export async function exists(
    key: string,
    bucket: BucketInput,
  ): Promise<boolean> {
    const { client } = getR2Client();
    const response = await client.fetch(objectUrl(key, bucket), {
      method: "HEAD",
    });

    if (response.status === 404) return false;
    if (!response.ok) {
      const text = await response.text();
      throw new StorageError(
        `Failed to check object: ${response.status} ${response.statusText}`,
        { key, bucket: resolveBucket(bucket).name, body: text },
      );
    }
    return true;
  }

  function toArrayBuffer(view: Uint8Array): ArrayBuffer {
    const { buffer, byteOffset, byteLength } = view;

    if (buffer instanceof ArrayBuffer) {
      return buffer.slice(byteOffset, byteOffset + byteLength);
    }

    const copy = new Uint8Array(byteLength);
    copy.set(view);
    return copy.buffer;
  }

  function prepareBody(body: UploadBody): BodyInit {
    if (typeof body === "string") {
      return body;
    }

    if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
      return body;
    }

    if (typeof Uint8Array !== "undefined" && body instanceof Uint8Array) {
      return toArrayBuffer(body);
    }

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
      return toArrayBuffer(body as unknown as Uint8Array);
    }

    return body as BodyInit;
  }

  function bodySize(body: UploadBody): number | "stream" {
    if (typeof body === "string") return Buffer.byteLength(body);
    if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
      return body.byteLength;
    }
    if (typeof Uint8Array !== "undefined" && body instanceof Uint8Array) {
      return body.byteLength;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
      return body.byteLength;
    }
    return "stream";
  }

  export namespace Key {
    export function daily(filename: string): string {
      const timestamp = new Date().toISOString().split("T")[0];
      return `temporary/daily/${timestamp}/${filename}`;
    }

    export function weekly(filename: string): string {
      const date = new Date();
      const weekNumber = getWeekNumber(date);
      const year = date.getFullYear();
      return `temporary/weekly/${year}-W${weekNumber}/${filename}`;
    }

    export function monthly(filename: string): string {
      const month = new Date().toISOString().slice(0, 7);
      return `temporary/monthly/${month}/${filename}`;
    }

    export function permanent(path: string, filename: string): string {
      return `permanent/${path}/${filename}`;
    }

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

  export async function upload(
    key: string,
    body: UploadBody,
    bucket: BucketInput,
    options: UploadOptions = {},
  ): Promise<{ key: string; url: string }> {
    log.info("uploading file", {
      key,
      size: bodySize(body),
      bucket: resolveBucket(bucket).name,
    });

    const headers: Record<string, string> = {};
    if (options.contentType) headers["Content-Type"] = options.contentType;
    if (options.acl) headers["x-amz-acl"] = options.acl;
    if (options.tagging) headers["x-amz-tagging"] = options.tagging;
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const { client } = getR2Client();
    const response = await client.fetch(objectUrl(key, bucket), {
      method: "PUT",
      headers,
      body: prepareBody(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Upload failed: ${response.status} ${response.statusText}`,
        { key, body: errorText },
      );
    }

    return { key, url: publicUrl(key, bucket) };
  }

  function parseListBucketXml(xml: string): ListObjectsResult {
    const contents: ListObject[] = [];
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;

    for (const match of xml.matchAll(contentsRegex)) {
      const block = match[1];
      const keyMatch = block.match(/<Key>([^<]+)<\/Key>/);
      if (!keyMatch) continue;

      const rawKey = keyMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const key = decodeURIComponent(rawKey);
      const lastModifiedMatch = block.match(
        /<LastModified>([^<]+)<\/LastModified>/,
      );
      const lastModified = lastModifiedMatch
        ? new Date(lastModifiedMatch[1])
        : undefined;

      contents.push({ key, lastModified });
    }

    const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const nextTokenMatch = xml.match(
      /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/,
    );

    return {
      objects: contents,
      isTruncated,
      continuationToken: nextTokenMatch ? nextTokenMatch[1] : undefined,
    };
  }

  async function listObjects(params: {
    bucket: BucketInput;
    prefix?: string;
    continuationToken?: string;
    maxKeys?: number;
  }): Promise<ListObjectsResult> {
    const { bucket, prefix, continuationToken, maxKeys } = params;
    const { client, r2Url } = getR2Client();
    const { name } = resolveBucket(bucket);

    const url = new URL(`${r2Url}/${name}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("encoding-type", "url");
    if (prefix) url.searchParams.set("prefix", prefix);
    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }
    if (maxKeys) {
      url.searchParams.set("max-keys", String(maxKeys));
    }

    const response = await client.fetch(url.toString(), { method: "GET" });
    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        `Failed to list objects: ${response.status} ${response.statusText}`,
        { bucket: name, prefix, body: errorText },
      );
    }

    const xml = await response.text();
    return parseListBucketXml(xml);
  }

  export async function uploadMultipart(
    key: string,
    body: Buffer,
    bucket: BucketInput,
    options: MultipartUploadOptions = {},
  ): Promise<{ key: string; url: string }> {
    const partSize = options.partSize || 5 * 1024 * 1024;

    log.info("starting multipart upload", { key, size: body.length, partSize });

    const multipartUpload = await initiateMultipartUpload(key, bucket, options);
    const { uploadId } = multipartUpload;

    try {
      const parts: CompletedPart[] = [];
      const totalParts = Math.ceil(body.length / partSize);
      const concurrencyLimit = 3;
      const uploadPromises: Promise<void>[] = [];

      for (let partIndex = 0; partIndex < totalParts; partIndex++) {
        const start = partIndex * partSize;
        const end = Math.min(start + partSize, body.length);
        const partBody = body.subarray(start, end);
        const partNumber = partIndex + 1;

        const task = async () => {
          const part = await uploadPart(
            key,
            bucket,
            uploadId,
            partNumber,
            partBody,
          );
          parts[partIndex] = part;
        };

        uploadPromises.push(task());
        if (uploadPromises.length >= concurrencyLimit) {
          await Promise.all(uploadPromises.splice(0, concurrencyLimit));
        }
      }

      await Promise.all(uploadPromises);

      const result = await completeMultipartUpload(
        key,
        bucket,
        uploadId,
        parts,
      );
      log.info("multipart upload completed", { key, totalParts });
      return result;
    } catch (error) {
      await abortMultipartUpload(key, bucket, uploadId).catch(() => {});
      throw error;
    }
  }

  export async function initiateMultipartUpload(
    key: string,
    bucket: BucketInput,
    options: UploadOptions = {},
  ): Promise<MultipartUpload> {
    log.info("initiating multipart upload", {
      key,
      bucket: resolveBucket(bucket).name,
    });

    const headers: Record<string, string> = {};
    if (options.contentType) headers["Content-Type"] = options.contentType;
    if (options.acl) headers["x-amz-acl"] = options.acl;
    if (options.tagging) headers["x-amz-tagging"] = options.tagging;
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const { client } = getR2Client();
    const response = await client.fetch(`${objectUrl(key, bucket)}?uploads`, {
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
    const uploadIdMatch = responseText.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) {
      throw new StorageError("Failed to parse UploadId from response", {
        key,
        response: responseText,
      });
    }

    return { uploadId: uploadIdMatch[1], key };
  }

  export async function uploadPart(
    key: string,
    bucket: BucketInput,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<CompletedPart> {
    const { client } = getR2Client();
    const response = await client.fetch(
      `${objectUrl(key, bucket)}?partNumber=${partNumber}&uploadId=${uploadId}`,
      {
        method: "PUT",
        body: prepareBody(body),
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

  export async function get(key: string, bucket: BucketInput): Promise<Buffer> {
    const { client } = getR2Client();
    const response = await client.fetch(objectUrl(key, bucket), {
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

  export async function deleteFile(
    key: string,
    bucket: BucketInput,
  ): Promise<void> {
    const { client } = getR2Client();
    const response = await client.fetch(objectUrl(key, bucket), {
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

  export async function cleanupPublicBucketByCadence(options?: {
    bucket?: BucketInput;
    r2Bucket?: R2Bucket;
    maxKeysPerList?: number;
  }): Promise<
    Array<{
      cadence: string;
      prefixes: string[];
      scanned: number;
      deleted: number;
    }>
  > {
    const bucket = options?.bucket ?? PUBLIC_BUCKET;
    const r2Bucket =
      options?.r2Bucket ??
      (() => {
        try {
          return Binding.use().Bucket;
        } catch {
          return undefined;
        }
      })();
    const useR2Binding = !!r2Bucket && typeof r2Bucket.list === "function";
    const rules = [
      {
        cadence: "hourly",
        prefixes: ["ephemeral/hourly/", "temporary/hourly/"],
        ttlMs: ONE_HOUR_MS,
      },
      {
        cadence: "daily",
        prefixes: ["temporary/daily/", "ephemeral/daily/"],
        ttlMs: ONE_DAY_MS,
      },
      {
        cadence: "weekly",
        prefixes: ["temporary/weekly/", "ephemeral/weekly/"],
        ttlMs: ONE_WEEK_MS,
      },
      {
        cadence: "monthly",
        prefixes: ["temporary/monthly/", "ephemeral/monthly/"],
        ttlMs: ONE_MONTH_MS,
      },
    ];

    const results: Array<{
      cadence: string;
      prefixes: string[];
      scanned: number;
      deleted: number;
    }> = [];

    for (const rule of rules) {
      const ttlMs = rule.ttlMs;
      const now = Date.now();
      let scanned = 0;
      let deleted = 0;

      for (const prefix of rule.prefixes) {
        let continuationToken: string | undefined;

        do {
          const page: ListPage = useR2Binding
            ? await listObjectsViaBinding({
                bucket: r2Bucket as R2Bucket,
                prefix,
                continuationToken,
                maxKeys: options?.maxKeysPerList ?? 1000,
              })
            : await listObjects({
                bucket,
                prefix,
                continuationToken,
                maxKeys: options?.maxKeysPerList ?? 1000,
              });

          for (const obj of page.objects) {
            scanned++;
            const lastModified = obj.lastModified?.getTime();
            if (!lastModified) continue;
            if (now - lastModified < ttlMs) continue;
            try {
              if (useR2Binding) {
                await (r2Bucket as R2Bucket).delete(obj.key);
              } else {
                await deleteFile(obj.key, bucket);
              }
              deleted++;
            } catch (error) {
              log.warn("failed to delete public object", {
                key: obj.key,
                cadence: rule.cadence,
                prefix,
                error:
                  error instanceof Error
                    ? error.message
                    : JSON.stringify(error),
              });
            }
          }

          continuationToken = page.isTruncated
            ? page.continuationToken
            : undefined;
        } while (continuationToken);
      }

      results.push({
        cadence: rule.cadence,
        prefixes: rule.prefixes,
        scanned,
        deleted,
      });
    }

    log.info("public bucket cleanup completed", { results });
    return results;
  }

  export async function getPresignedUrl(
    key: string,
    bucket: BucketInput,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    const operation = options.operation || "get";
    const expiresIn = options.expiresIn || 3600;

    const method = operation === "put" ? "PUT" : "GET";
    const base = new URL(objectUrl(key, bucket));
    base.searchParams.set("X-Amz-Expires", expiresIn.toString());

    const { client } = getR2Client();
    const signed = await client.sign(new Request(base.toString(), { method }), {
      aws: { signQuery: true },
    });

    return signed.url;
  }

  export async function getPresignedMultipartUrls(
    key: string,
    bucket: BucketInput,
    partCount: number,
    options: PresignedUrlOptions = {},
  ): Promise<{ uploadId: string; urls: string[] }> {
    const expiresIn = options.expiresIn || 3600;
    const multipartUpload = await initiateMultipartUpload(key, bucket);
    const { uploadId } = multipartUpload;
    const urls: string[] = [];

    const { client } = getR2Client();

    for (let i = 1; i <= partCount; i++) {
      const base = new URL(
        `${objectUrl(key, bucket)}?partNumber=${i}&uploadId=${uploadId}`,
      );
      base.searchParams.set("X-Amz-Expires", expiresIn.toString());

      const signed = await client.sign(
        new Request(base.toString(), { method: "PUT" }),
        { aws: { signQuery: true } },
      );
      urls.push(signed.url);
    }

    return { uploadId, urls };
  }

  export async function completeMultipartUpload(
    key: string,
    bucket: BucketInput,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<{ key: string; url: string }> {
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

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

    const { client } = getR2Client();
    const response = await client.fetch(
      `${objectUrl(key, bucket)}?uploadId=${uploadId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlBody,
      },
    );

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

    return { key, url: publicUrl(key, bucket) };
  }

  export async function abortMultipartUpload(
    key: string,
    bucket: BucketInput,
    uploadId: string,
  ): Promise<void> {
    const { client } = getR2Client();
    const response = await client.fetch(
      `${objectUrl(key, bucket)}?uploadId=${uploadId}`,
      {
        method: "DELETE",
      },
    );

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
