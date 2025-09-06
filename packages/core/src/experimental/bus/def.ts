/** biome-ignore-all lint/suspicious/noExplicitAny: lib */
import type { z } from "zod";

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export namespace Event {
  export type Definition = {
    type: string;
    $input: any;
    $output: any;
    $metadata: any;
    $payload: any;
    create: (...args: any[]) => Promise<any>;
  };

  /** zod validator adapter */
  export const zodValidator =
    <T extends z.ZodTypeAny>(schema: T) =>
    (input: unknown): z.infer<T> =>
      schema.parse(input);

  export function builder<
    Metadata extends ((type: string, properties: any) => any) | z.ZodTypeAny,
  >(input: {
    validator: <T extends z.ZodTypeAny>(
      schema: T,
    ) => (input: unknown) => z.infer<T>;
    metadata?: Metadata;
  }) {
    const validator = input.validator;

    const fn = function event<Type extends string, Schema extends z.ZodTypeAny>(
      type: Type,
      schema: Schema,
    ) {
      type Parsed = { in: z.input<Schema>; out: z.output<Schema> };

      type MetadataOutput = Metadata extends (
        type: string,
        properties: any,
      ) => any
        ? ReturnType<Metadata>
        : z.infer<Metadata>;

      type Payload = Prettify<{
        type: Type;
        properties: Parsed["out"];
        metadata: MetadataOutput;
      }>;

      type Create = Metadata extends (type: string, properties: any) => any
        ? (properties: Parsed["in"]) => Promise<Payload>
        : (
            properties: Parsed["in"],
            metadata: z.input<Metadata>,
          ) => Promise<Payload>;

      const validate = validator(schema);

      async function create(properties: any, metadata?: any) {
        metadata = input.metadata
          ? typeof input.metadata === "function"
            ? (input.metadata as any)(type, properties)
            : (input.metadata as any)(metadata)
          : {};
        properties = validate(properties);
        return {
          type,
          properties,
          metadata,
        };
      }

      return {
        create: create as Create,
        type,
        $input: {} as Parsed["in"],
        $output: {} as Parsed["out"],
        $payload: {} as Payload,
        $metadata: {} as MetadataOutput,
      } satisfies Definition;
    };

    // Keeps your original coerce helper (runtime passthrough; compile-time discriminator)
    fn.coerce = <Events extends Definition>(
      _events: Events | Events[],
      raw: any,
    ): {
      [K in Events["type"]]: Extract<Events, { type: K }>["$payload"];
    }[Events["type"]] => raw;

    return fn;
  }
}
