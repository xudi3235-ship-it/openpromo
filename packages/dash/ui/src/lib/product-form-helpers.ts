import type { ProductCreateInput, ProductUpdateInput } from "@/queries/product";

/**
 * Parse comma-separated tags string into array
 */
export function parseTags(tags?: string): string[] | undefined {
  if (!tags) return undefined;

  const parsed = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Transform form values to ProductCreateInput
 */
export function toCreateInput(values: {
  name?: string;
  description?: string;
  category?: string;
  tags?: string;
  source: "MANUAL" | "CUSTOM_URL";
  sourceUrl?: string;
  attachments?: ProductCreateInput["attachments"];
  primaryAttachmentId?: string;
}): ProductCreateInput {
  return {
    name: values.name || "Product",
    description: values.description,
    category: values.category,
    tags: parseTags(values.tags),
    source: values.source,
    sourceUrl: values.sourceUrl,
    attachments: values.attachments,
    primaryAttachmentId: values.primaryAttachmentId,
  };
}

/**
 * Transform form values to ProductUpdateInput
 */
export function toUpdateInput(
  productId: string,
  values: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string;
    sourceUrl?: string;
    attachments?: ProductUpdateInput["attachments"];
    primaryAttachmentId?: string;
  },
): ProductUpdateInput {
  const updateData: ProductUpdateInput = {
    productId,
  };

  // Only include fields that are provided
  if (values.name) updateData.name = values.name;
  if (values.description !== undefined)
    updateData.description = values.description;
  if (values.category !== undefined) updateData.category = values.category;
  if (values.tags !== undefined) updateData.tags = parseTags(values.tags);
  if (values.sourceUrl !== undefined) updateData.sourceUrl = values.sourceUrl;
  if (values.attachments !== undefined)
    updateData.attachments = values.attachments;
  if (values.primaryAttachmentId !== undefined)
    updateData.primaryAttachmentId = values.primaryAttachmentId;

  return updateData;
}
