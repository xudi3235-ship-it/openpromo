import type { ZodSchema, z } from "zod";

export function fn<
  Arg1 extends ZodSchema,
  // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
  Callback extends (arg1: z.output<Arg1>) => any,
>(arg1: Arg1, cb: Callback) {
  const result = (input: z.input<typeof arg1>): ReturnType<Callback> => {
    const parsed = arg1.parse(input);
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    return cb.apply(cb, [parsed as any]);
  };
  result.schema = arg1;
  return result;
}
