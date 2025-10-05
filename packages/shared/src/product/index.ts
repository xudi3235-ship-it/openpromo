import * as z from "zod";
import { SharedAttachmentSpec } from "../content";

export const ProductSource = [
  "MANUAL",
  "AMAZON",
  "SHOPIFY",
  "ETSY",
  "CUSTOM_URL",
] as const;

export type ProductSource = (typeof ProductSource)[number];

export const ProductSourceZod = z.enum(ProductSource);

/**
 * Product metadata - flexible structure for different sources
 */
export const ProductMetadata = z
  .object({
    // Pricing (useful for AI context)
    price: z.string().optional(),
    currency: z.string().optional(),

    // Scraping metadata
    scrapedAt: z.string().optional(),
    lastSyncedAt: z.string().optional(),
  })
  .catchall(z.unknown()); // Allow additional fields for extensibility

export type ProductMetadata = z.infer<typeof ProductMetadata>;

/**
 * Base product spec - used in DB jsonb column
 */
export const ProductSpec = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // Source tracking
  source: ProductSourceZod,
  sourceUrl: z.string().optional(),

  // Media
  attachments: z.array(SharedAttachmentSpec).default([]),
  primaryAttachmentId: z.string().optional(),

  // Metadata
  metadata: ProductMetadata.optional(),
});

export type ProductSpec = z.infer<typeof ProductSpec>;
