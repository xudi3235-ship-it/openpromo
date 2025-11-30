import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";

/**
 * Build a tree-like string representation of a directory structure.
 * mostly used in worker runtime to inspect dir structure for llm consumption.
 */
export function buildTreeString(dirPath: string, prefix: string): string {
  const entries = readdirSync(dirPath);
  let result = "";

  entries.forEach((entry, index) => {
    const isLastEntry = index === entries.length - 1;
    const entryPath = `${dirPath}/${entry}`;
    const connector = isLastEntry ? "└── " : "├── ";
    const newPrefix = prefix + (isLastEntry ? "    " : "│   ");

    try {
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        result += `${prefix}${connector}${entry}/\n`;
        result += buildTreeString(entryPath, newPrefix);
      } else {
        result += `${prefix}${connector}${entry}\n`;
      }
    } catch {
      result += `${prefix}${connector}${entry} (error reading)\n`;
    }
  });

  return result;
}

/**
 * Download images from URLs to /tmp dir, worker's vfs.
 * Returns array of local file paths.
 */
export async function downloadImagesToTmp(
  urls: string[],
  destDir: string,
): Promise<string[]> {
  // Create destination directory if it doesn't exist
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  const localPaths: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    // Extract filename from URL or generate one
    const urlPath = new URL(url).pathname;
    const filename = urlPath.split("/").pop() || `image_${i}.jpg`;
    const localPath = `${destDir}/${filename}`;

    try {
      console.log(`[VideoGenAgent] Downloading: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      writeFileSync(localPath, buffer);

      console.log(`[VideoGenAgent] Saved to: ${localPath}`);
      localPaths.push(localPath);
    } catch (err) {
      console.error(`[VideoGenAgent] Failed to download ${url}:`, err);
    }
  }

  return localPaths;
}
