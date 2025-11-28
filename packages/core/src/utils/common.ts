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
