import { Storage } from "@core/helpers/storage";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "image-cleanup" });

/**
 * Extract S3/R2 key from a public URL
 * Returns null if the URL is not from our R2 bucket (e.g., external URLs)
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const bucketBaseUrl = Storage.publicUrl("", Storage.PUBLIC_BUCKET);

    if (url.startsWith(bucketBaseUrl)) {
      // Remove the base URL and leading slash to get the key
      return url.replace(bucketBaseUrl, "").replace(/^\/+/, "");
    }

    return null;
  } catch (error) {
    console.error("Failed to extract S3 key from URL", { url, error });
    return null;
  }
}

/**
 * Delete a single image from R2 storage by URL
 * Silently fails if the URL is not from our bucket or if deletion fails
 */
export async function deleteImageByUrl(url: string): Promise<boolean> {
  try {
    const key = extractS3KeyFromUrl(url);
    if (!key) {
      // Skipping deletion for non-R2 URL (external image)
      return false;
    }

    await Storage.deleteFile(key, Storage.PUBLIC_BUCKET);
    log.info("Successfully deleted image", { url, key });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      log.error(error);
    }
    return false;
  }
}

/**
 * Delete multiple images from R2 storage by URLs
 * Continues deleting other images even if some fail
 */
export async function deleteImagesByUrls(urls: string[]): Promise<{
  deleted: number;
  skipped: number;
  failed: number;
}> {
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const result = await deleteImageByUrl(url);
      if (result) {
        deleted++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error("Error during image deletion", { url, error });
      failed++;
    }
  }

  log.info("Bulk image deletion completed", { deleted, skipped, failed });
  return { deleted, skipped, failed };
}

/**
 * Async cleanup helper that doesn't throw errors
 * Use this for fire-and-forget cleanup operations
 */
export function cleanupImagesAsync(
  urls: string[],
  context: { entityType: string; entityId: string },
): void {
  deleteImagesByUrls(urls)
    .then((result) => {
      log.info("Async cleanup completed", { ...context, ...result });
    })
    .catch((error) => {
      if (error instanceof Error) {
        log.error(error);
      }
      console.error("Async cleanup failed", { ...context, error });
    });
}
