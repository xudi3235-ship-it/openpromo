export function nullThrows<T>(
  value: T | null | undefined,
  message: string = "Value is null or undefined",
): T {
  if (value === null || value === undefined) {
    // FIXME: Improve error handling, this stack tracing is not really helpful
    // for debugging at all.
    console.error(`${message}: ${value}`);
    console.error(new Error().stack);
    throw new Error(`${message}: ${value}`);
  }
  return value;
}

// iterable
export function first<T>(iterable: Iterable<T>): T | undefined {
  for (const item of iterable) {
    return item;
  }
  return undefined;
}

export function only<T>(iterable: Iterable<T>): T | undefined {
  let result: T | undefined;
  let count = 0;

  for (const item of iterable) {
    if (count === 0) {
      result = item;
    }
    count++;
  }
  return count === 1 ? result : undefined;
}

export function onlyOrThrow<T>(
  iterable: Iterable<T>,
  message: string = "Expected exactly one item, but found none or more than one",
): T {
  const result = only(iterable);
  if (result === undefined) {
    throw new Error(message);
  }
  return result;
}

export function filter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean,
): Iterable<T> {
  const result: T[] = [];
  for (const item of iterable) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
}

export function map<T, U>(
  iterable: Iterable<T>,
  transform: (item: T) => U,
): Iterable<U> {
  const result: U[] = [];
  for (const item of iterable) {
    result.push(transform(item));
  }
  return result;
}

export function reduce<T, U>(
  iterable: Iterable<T>,
  reducer: (acc: U, item: T) => U,
  initialValue: U,
): U {
  let accumulator = initialValue;
  for (const item of iterable) {
    accumulator = reducer(accumulator, item);
  }
  return accumulator;
}

export function filterNulls<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item != null);
}

// lazy
export function lazy<T>(callback: () => T) {
  let loaded = false;
  let result: T;

  return () => {
    if (!loaded) {
      result = callback();
      loaded = true;
    }
    return result;
  };
}
// object

export function objectFlatten(
  // biome-ignore lint/suspicious/noExplicitAny: valid
  obj: Record<string, any>,
  prefix: string = "",
  // biome-ignore lint/suspicious/noExplicitAny: valid
): Record<string, any> {
  // biome-ignore lint/suspicious/noExplicitAny: valid
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix
      ? prefix + (Array.isArray(obj) ? `[${key}]` : `.${key}`)
      : key;

    if (value === null || value === undefined) {
      result[newKey] = value;
      continue;
    }

    if (typeof value === "object") {
      Object.assign(result, objectFlatten(value, newKey));
      continue;
    }

    result[newKey] = value;
  }

  return result;
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

export function omitNull<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value != null),
  ) as T;
}

// queue
export async function queue<T, R>(
  concurrency: number,
  items: T[],
  processItem: (item: T) => Promise<R>,
) {
  const workers = [...new Array(concurrency)];
  await Promise.all(
    workers.map(async () => {
      // biome-ignore lint/correctness/noUnusedVariables: stfu
      let count = 0;
      while (true) {
        const item = items.pop();
        if (!item) {
          break;
        }
        await processItem(item);
        count++;
      }
    }),
  );
}
// retry
export async function retry<T>(max: number, callback: () => Promise<T>) {
  let final: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const result = await callback();
      return result;
    } catch (err) {
      final = err;
    }
  }
  console.error(final);
}

export function retrySync<T>(max: number, callback: () => T) {
  let final: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const result = callback();
      return result;
    } catch (err) {
      final = err;
    }
  }
  console.error(final);
}

// filesystem / io stuff

/**
 * Download a file from URL and save to local path.
 * Works for any binary content (images, videos, etc).
 */
export async function downloadFile(
  url: string,
  outputPath: string,
  options?: {
    /** Optional log prefix for console output */
    logPrefix?: string;
  },
): Promise<string> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));

  if (options?.logPrefix) {
    console.log(`[${options.logPrefix}] File saved to ${outputPath}`);
  }

  return outputPath;
}

/**
 * Download video from URL and save to local path.
 * Convenience wrapper around downloadFile.
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  logPrefix?: string,
): Promise<string> {
  return downloadFile(url, outputPath, { logPrefix });
}

/**
 * Download image from URL and save to local path.
 * Convenience wrapper around downloadFile.
 */
export async function downloadImage(
  url: string,
  outputPath: string,
  logPrefix?: string,
): Promise<string> {
  return downloadFile(url, outputPath, { logPrefix });
}

/**
 * Upload a local file to a service and return the URL.
 * Generic helper for file upload patterns.
 */
export async function uploadLocalFile(
  filePath: string,
  uploader: (buffer: Buffer, fileName: string) => Promise<string>,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const { basename } = await import("node:path");

  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);

  return uploader(fileBuffer, fileName);
}

// string
export function isStringUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}
