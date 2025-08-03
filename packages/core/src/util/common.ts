export function nullThrows<T>(
    value: T | null | undefined,
    message: string = "Value is null or undefined",
): T {
    if (value === null || value === undefined) {
        throw new Error(`${message}: ${value}`);
    }
    return value;
}
