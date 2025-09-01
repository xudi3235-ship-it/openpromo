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
