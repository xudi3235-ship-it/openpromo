import { nanoid } from "nanoid";
import slugify from "slugify";
import { createVisibleError } from "./error";

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

  throw createVisibleError(500, {
    message: "Failed to generate unique slug",
  });
};
