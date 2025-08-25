import type { Hyperdrive } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import postgres from "postgres";
import slugify from "slugify";
import { AppError } from "./error";

export type DbClient = ReturnType<typeof getDbClient>;

export const getDbClient = (hyperdrive: Hyperdrive) => {
  return drizzle(postgres(hyperdrive.connectionString), {
    casing: "snake_case",
  });
};

export const generateSlug = async <T>(
  name: string,
  query: (slug: string) => Promise<T[]>,
  maxRetries = 5,
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const slug = `${slugify(name, { lower: true, strict: true, trim: true })}-${nanoid(6)}`;

    const existing = await query(slug);

    if (existing.length === 0) {
      return slug;
    }
  }

  throw new AppError(500, {
    message: "Failed to generate unique slug",
  });
};
