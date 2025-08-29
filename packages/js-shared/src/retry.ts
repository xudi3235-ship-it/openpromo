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
