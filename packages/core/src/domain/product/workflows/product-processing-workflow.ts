import { randomUUID } from "node:crypto";
import { ProductImageGen } from "@core/domain/genai";
import { GenAI } from "@core/domain/genai/helpers";
import { Actor } from "@core/helpers/actor";
import { Storage } from "@core/helpers/storage";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import type { SharedAttachmentSpec } from "@shared/content";
import type { ProductMetadata } from "@shared/product";
import z from "zod";
import { EntProduct } from "../EntProduct";
import {
  createMarkdownSnippet,
  type ProductLinkExtraction,
  processProductLink,
} from "../product-link-processor";

const ProductProcessingWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  productId: z.string(),
});

export type ProductProcessingWorkflowParams = z.infer<
  typeof ProductProcessingWorkflowParams
>;

const log = Log.create({ namespace: "product-workflow" });

export class ProductProcessingWorkflow extends CoreWorkflowEntrypoint<ProductProcessingWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<ProductProcessingWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    const { productId } = event.payload;
    log.info("// Starting product processing workflow");
    try {
      console.log("// Processing product");
      // 1. Mark product as processing
      await step.do("mark-product-processing", async () => {
        const product = await EntProduct.fromID(productId);
        await product.setState("processing");
        console.log("marked product as processing");
        return;
      });
      // 2. hydrate product from source link if needed
      await step.do("hydrate-product-source", async () => {
        await hydrateProductFromSource(productId);
        return;
      });
      // 2. process attachments
      await processAttachments(step, productId);
    } catch (error) {
      // Handle workflow errors
      await step.do("mark-product-failed", async () => {
        const product = await EntProduct.fromID(productId);
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(err);
        await product.setState("failed", `Workflow error: ${err}`);
        return;
      });

      throw error;
    }
  }
}

async function hydrateProductFromSource(productId: string) {
  const product = await EntProduct.fromID(productId);
  const { source, sourceUrl } = product.data;

  if (source !== "CUSTOM_URL" || !sourceUrl) {
    return;
  }

  try {
    const { extraction, markdown } = await processProductLink(sourceUrl);

    console.log("extraction result", extraction, { markdown });

    const scrapedAttachments = buildScrapedAttachments(
      extraction.imageUrls ?? [],
      sourceUrl,
    );

    const combinedAttachments = mergeAttachments(
      product.data.attachments ?? [],
      scrapedAttachments,
    );

    const metadata = buildMetadata(
      product.data.metadata,
      sourceUrl,
      extraction,
      markdown,
    );

    const tags = mergeTags(product.data.tags ?? [], extraction.tags ?? []);

    const name = chooseName(product.data.name, extraction.title);

    const description =
      product.data.description && product.data.description.trim().length > 0
        ? product.data.description
        : (extraction.description ?? product.data.description ?? undefined);

    const category = product.data.category ?? extraction.category ?? undefined;

    const primaryAttachmentId =
      product.data.primaryAttachmentId ?? combinedAttachments[0]?.id;

    const updatePayload: Parameters<typeof product.update>[0] = {
      name,
      tags,
      attachments: combinedAttachments,
      metadata,
    };

    if (description !== undefined) {
      updatePayload.description = description;
    }

    if (category !== undefined) {
      updatePayload.category = category;
    }

    if (primaryAttachmentId) {
      updatePayload.primaryAttachmentId = primaryAttachmentId;
    }

    await product.update(updatePayload);
  } catch (error) {
    console.error("Failed to hydrate product from source", {
      error,
      productId,
      sourceUrl,
    });
  }
}

async function processAttachments(step: CoreWorkflowStep, productId: string) {
  // 1. identify product
  const { hasValidProduct, errorReason, productContext } = await step.do(
    "generate meta for imgs",
    async () => {
      console.log("identifying product");
      const p = await EntProduct.fromID(productId);
      return await ProductImageGen.identifyProduct(p);
    },
  );
  console.log("identified product", {
    hasValidProduct,
    errorReason,
    productContext,
  });

  if (!hasValidProduct) {
    // mark product as invalid
    await step.do("mark-product-invalid", async () => {
      const p = await EntProduct.fromID(productId);
      await p.setState(
        "failed",
        `Invalid product: ${errorReason ?? "unknown"}`,
      );
      return;
    });
    log.info("// Product is invalid, stopping workflow");
    return;
  }
  console.log("identified product context", productContext);

  // 2. pre-generate the image variants, e.g. no background.
  await step.do("pre-generate-img-variants", async () => {
    const p = await EntProduct.fromID(productId);
    const prompt = `create a clean, well-lit product image of ${p.data.name} on a plain white background, ensuring the product is clearly visible and centered. The image should be high-resolution, with accurate colors and sharp details, suitable for e-commerce display.`;

    const imgs = p.imageUrls();
    if (imgs.length === 0) {
      console.error(`no images to process for product ${p.data.id}`);
      return;
    }
    const noBgUrl = await GenAI.runNanoBanana({ prompt, image_input: imgs });

    // Copy to our own storage for persistence
    const response = await fetch(noBgUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch generated image: ${response.statusText}`,
      );
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const key = Storage.Key.workspace(
      p.data.workspaceId,
      "products/images",
      `${p.data.id}-nobg.png`,
    );

    const { url: persistedUrl } = await Storage.upload(
      key,
      imageBuffer,
      Storage.PUBLIC_BUCKET,
      {
        contentType: "image/png",
        acl: "public-read",
      },
    );

    console.log("no background url (persisted)", persistedUrl);

    // save to product
    await p.setImageVariants({ noBg: persistedUrl });
    return;
  });
  console.log("pre-generated image variants");
  // 3. save meta to product and mark as ready
  await step.do("product-ready", async () => {
    const p = await EntProduct.fromID(productId);
    await p.update({
      state: "ready",
      metadata: {
        ...p.data.metadata,
        productContext,
      },
    });
    return;
  });
}

function buildScrapedAttachments(
  urls: string[],
  sourceUrl: string,
): SharedAttachmentSpec[] {
  const seen = new Set<string>();
  const attachments: SharedAttachmentSpec[] = [];

  for (const rawUrl of urls.slice(0, 10)) {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    attachments.push({
      id: randomUUID(),
      type: "photo",
      publicUrl: normalized,
      metadata: {
        origin: "scraped",
        sourceUrl,
      },
    });
  }

  return attachments;
}

function mergeAttachments(
  existing: SharedAttachmentSpec[],
  additions: SharedAttachmentSpec[],
): SharedAttachmentSpec[] {
  if (additions.length === 0) return existing;

  const merged: SharedAttachmentSpec[] = [...existing];
  const existingKeys = new Set(
    existing.map((att, idx) => att.publicUrl ?? att.id ?? `existing-${idx}`),
  );

  for (const [idx, att] of additions.entries()) {
    const key = att.publicUrl ?? att.id ?? `addition-${idx}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    merged.push(att);
  }

  return merged;
}

function mergeTags(existing: string[], extracted: string[]): string[] {
  const normalized = [...existing, ...extracted]
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized)).slice(0, 25);
}

function chooseName(currentName: string, extractedName?: string): string {
  const trimmed = currentName?.trim() ?? "";
  if (!trimmed || isPlaceholderName(trimmed)) {
    return extractedName?.trim() || trimmed || "Product";
  }
  return trimmed;
}

function isPlaceholderName(name: string): boolean {
  const normalized = name.toLowerCase();
  return (
    normalized === "product" ||
    normalized === "product from url" ||
    normalized === "new product"
  );
}

function buildMetadata(
  existing: ProductMetadata | null | undefined,
  sourceUrl: string,
  extraction: ProductLinkExtraction,
  markdown: string,
): ProductMetadata {
  const metadata: ProductMetadata = existing ? { ...existing } : {};

  if (extraction.price) {
    metadata.price ??= extraction.price;
  }
  if (extraction.currency) {
    metadata.currency ??= extraction.currency;
  }

  metadata.scrapedAt = new Date().toISOString();

  metadata.crawl = {
    url: sourceUrl,
    markdownSnippet: createMarkdownSnippet(markdown),
    extracted: extraction,
  };

  return metadata;
}

function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
