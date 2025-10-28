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

export const ProductLinkExtractionSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe("Product name or title from the page"),
  description: z
    .string()
    .min(1)
    .max(2_000)
    .optional()
    .describe("Concise marketing-ready description"),
  category: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe("Specific category or product type"),
  tags: z
    .array(z.string().min(1).max(64))
    .max(25)
    .optional()
    .describe("Relevant hashtags or keywords"),
  price: z.string().optional().describe("Price text as shown"),
  currency: z.string().optional().describe("Currency code if obvious"),
  imageUrls: z
    .array(z.string().url())
    .max(20)
    .optional()
    .describe("Direct product image URLs"),
});

export type ProductLinkExtraction = z.infer<typeof ProductLinkExtractionSchema>;

export const ProductCrawlMetadata = z.object({
  url: z.string().url(),
  markdownSnippet: z
    .string()
    .max(20_000)
    .describe("Truncated markdown content for reference"),
  extracted: ProductLinkExtractionSchema,
});

export type ProductCrawlMetadata = z.infer<typeof ProductCrawlMetadata>;

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

  // Structured crawl metadata (CUSTOM_URL imports)
  crawl: ProductCrawlMetadata.optional(),

  // Allow additional fields for extensibility
  extra: z.record(z.string(), z.any()).optional(),
});

// store cleaned no BG img, or other variants/transformations
// keep this obj nullable for compatibility
export const ProductImageVariants = z.object({
  noBg: z.string().optional().describe("image url with background removed"),
});

export type ProductMetadata = z.infer<typeof ProductMetadata>;
export type ProductImageVariants = z.infer<typeof ProductImageVariants>;
