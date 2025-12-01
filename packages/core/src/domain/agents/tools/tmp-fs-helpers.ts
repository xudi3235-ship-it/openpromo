/**
 * Shared helpers for tools that operate on the /tmp filesystem.
 */

import type { Dirent } from "node:fs";
import { resolve, sep } from "node:path";

export const TMP_ROOT = "/tmp";

export function resolveTmpPath(requestedPath: string): string {
  const safeRequested = requestedPath.length === 0 ? "." : requestedPath;
  const resolved = resolve(TMP_ROOT, safeRequested);
  if (resolved === TMP_ROOT) return resolved;
  const normalizedRoot = TMP_ROOT.endsWith(sep)
    ? TMP_ROOT
    : `${TMP_ROOT}${sep}`;
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error(`Path ${requestedPath} is outside of ${TMP_ROOT}`);
  }
  return resolved;
}

export function direntType(dirent: Dirent): "file" | "directory" | "other" {
  if (dirent.isFile()) return "file";
  if (dirent.isDirectory()) return "directory";
  return "other";
}
