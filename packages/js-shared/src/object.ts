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
