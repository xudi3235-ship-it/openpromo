import * as z from "zod";

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
 * Product processing state
 * - pending: Initial state, workflow not yet started or in progress
 * - processing: Workflow is actively processing the product
 * - ready: Processing completed successfully, product is ready for use
 * - failed: Processing failed, requires attention
 */
export const ProductState = [
  "not_started",
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type ProductState = (typeof ProductState)[number];

export const ProductStateZod = z.enum(ProductState);

const ProductContext = z.object({
  name: z.string(),
  description: z
    .string()
    .describe("short description of the product in detail"),
  meta: z.object({
    industry: z
      .string()
      .describe("industry the product belongs to, e.g. fashion, retail, etc"),
    category: z
      .string()
      .describe("category the product belongs to, et.g. shoes, bags, etc"),
    socialMediaTags: z
      .array(z.string())
      .describe(
        "social media viral tags that are often used for this product / category",
      ),
  }),
});

export const ProductIdentificationSchema = z.object({
  hasValidProduct: z
    .boolean()
    .describe("whether a valid product is identified"),
  errorReason: z.string().optional().describe("if not valid, reason why"),
  productContext: ProductContext.describe("identified product details"),
});

/**
 * Product metadata - flexible structure for different sources
 */
export const ProductMetadata = z.object({
  // Pricing (useful for AI context)
  price: z.string().optional(),
  currency: z.string().optional(),

  // Scraping metadata
  scrapedAt: z.string().optional(),
  lastSyncedAt: z.string().optional(),

  // Identified product details
  productContext: ProductContext.optional(),

  // Allow additional fields for extensibility
  extra: z.record(z.string(), z.any()).optional(),
});

export type ProductMetadata = z.infer<typeof ProductMetadata>;
