import type { VideoGenRealtime } from "@shared/agents";
import { downloadImagesToTmp } from "../utils";

/**
 * File paths downloaded for each image category
 */
export interface DownloadedFilePaths {
  productImagePaths: string[];
  avatarImagePaths: string[];
  referenceImagePaths: string[];
  brandAssetPaths: string[];
}

/**
 * Download all input images to their respective /tmp directories.
 * Returns local file paths for each category.
 *
 * Downloads images from URLs to /tmp directories for agent processing.
 */
export async function downloadInputFiles(
  input: VideoGenRealtime.Input,
): Promise<DownloadedFilePaths> {
  const [
    productImagePaths,
    avatarImagePaths,
    referenceImagePaths,
    brandAssetPaths,
  ] = await Promise.all([
    downloadImagesToTmp(input.productImages, "/tmp/products"),
    downloadImagesToTmp(input.avatarImages, "/tmp/avatar"),
    downloadImagesToTmp(input.referenceImages, "/tmp/reference"),
    downloadImagesToTmp(input.brandAssets, "/tmp/brand"),
  ]);

  return {
    productImagePaths,
    avatarImagePaths,
    referenceImagePaths,
    brandAssetPaths,
  };
}
