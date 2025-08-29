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

export function filterNulls<T>(
  iterable: Iterable<T | null | undefined>,
): Iterable<T> {
  const result: T[] = [];
  for (const item of iterable) {
    if (item != null) {
      result.push(item);
    }
  }
  return result;
}
