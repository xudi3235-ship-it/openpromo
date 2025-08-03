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
