import {
  and,
  count,
  db,
  desc,
  eq,
  inArray,
  isNull,
  ne,
} from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Ent } from "@core/helpers/ent";
import { Storage } from "@core/helpers/storage";
import { oai } from "@core/providers/openai";
import { Replicate } from "@core/providers/replicate/models";
import {
  ImageGenerationInsert,
  type ImageGenerationSelectType,
  type ImageGenerationState,
  ImageGenerationUpdate,
  imageGenerationTable,
} from "@core/schemas/image-generation.sql";
import { fn } from "@core/utils/fn";
import { createWorkspaceEvent, WorkspaceEventType } from "@shared/workspace";
import type z from "zod";
import { ProductImageGen } from "../genai";
import { EntProduct } from "../product";
import { EntStyleComponent } from "../style-component";
import { dispatchWorkspaceEvent } from "../workspace/realtime";
import { generateProductImage } from "./product-image-generator";

export class EntImageGeneration extends Ent<ImageGenerationSelectType> {
  static type = "image_generation";

  data: ImageGenerationSelectType;

  constructor(data: ImageGenerationSelectType) {
    super(data);
    this.data = data;
  }

  toJSON() {
    return this.data;
  }

  static Schemas() {
    return {
      create: ImageGenerationInsert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
      }),
      update: ImageGenerationUpdate.partial(),
    };
  }

  static create = fn(this.Schemas().create, async (input) => {
    const [generation] = await db()
      .insert(imageGenerationTable)
      .values({
        ...input,
        workspaceId: Actor.workspaceID(),
        state: input.state ?? "pending",
      })
      .returning();

    if (!generation) throw new Error("Failed to create image generation");

    return new EntImageGeneration(generation);
  });

  static async generateProductImage(params: {
    productId: string;
    styleId?: string;
  }): Promise<{ generation: EntImageGeneration; imageUrl?: string }> {
    // Create the generation record
    const generation = await EntImageGeneration.create({
      state: "pending",
      productId: params.productId,
      styleComponentId: params.styleId ?? null,
    });
    // NOTE: for now we do sync gen, workflow migration is WIP
    // ws approach is not quite stable yet
    const { style, imageGenPrompt } = await generation.deriveStyleContext({
      productID: params.productId,
      styleId: params.styleId,
    });
    const imageGenResult = await ProductImageGen.genImage({
      product: await EntProduct.fromID(params.productId),
      style,
      prompt: imageGenPrompt,
    });
    // done
    await generation.update({
      outputImages: imageGenResult.imageUrls,
      state: "completed",
    });
    return {
      generation,
      imageUrl: imageGenResult.imageUrls[0],
    };
  }
  /**
   * generate a studio-grade background image, powered by nano banana
   */
  static async generateStudioBackgroundImage(
    productId: string,
    customPrompt?: string,
  ) {
    const generation = await EntImageGeneration.create({
      state: "pending",
      productId,
    });
    return EntImageGeneration.fulfillStudioBackgroundGeneration(
      generation,
      customPrompt,
    );
  }
  static async generateProductImageWithReference(params: {
    productId: string;
    referenceImageUrl?: string;
    prompt: string;
    styleId?: string;
    parentGenerationId?: string | null;
  }) {
    const generation = await EntImageGeneration.create({
      state: "pending",
      productId: params.productId,
      styleComponentId: params.styleId ?? null,
      parentGenerationId: params.parentGenerationId ?? null,
    });
    return generateProductImage({
      generation,
      productId: params.productId,
      styleId: params.styleId,
      referenceImageUrl: params.referenceImageUrl,
      prompt: params.prompt,
    });
  }

  static async promoteVariant(generationId: string) {
    const variant = await EntImageGeneration.fromID(generationId);
    const parentId = variant.data.parentGenerationId;

    if (!parentId) {
      throw new Error("Only child variations can be promoted");
    }

    const siblings = await db()
      .select({ id: imageGenerationTable.id })
      .from(imageGenerationTable)
      .where(
        and(
          eq(imageGenerationTable.workspaceId, Actor.workspaceID()),
          eq(imageGenerationTable.parentGenerationId, parentId),
          ne(imageGenerationTable.id, variant.data.id),
        ),
      );

    const idsToDelete = siblings.map((row) => row.id);
    idsToDelete.push(parentId);

    await variant.update({
      parentGenerationId: null,
      metadata: {
        ...(variant.data.metadata ?? {}),
        parentGenerationId: undefined,
      },
    });

    if (idsToDelete.length > 0) {
      await EntImageGeneration.deleteBatch(idsToDelete);
    }

    return variant;
  }

  static async fulfillStudioBackgroundGeneration(
    generation: EntImageGeneration,
    customPrompt?: string,
  ) {
    const productId = generation.data.productId;
    if (!productId) throw new Error("Generation missing product reference");

    const product = await EntProduct.fromID(productId);
    const user_input = `Generate studio-grade product shot image for my attached product for ads creative & social visuals.

    here are the context for the product:
    ${JSON.stringify(product.data, null, 2)}
    ${customPrompt ? `\nAdditional instructions from user: ${customPrompt}` : ""}`;

    const response = await oai().responses.create({
      prompt: {
        id: "pmpt_68fc6f98ca3c819396a49fdfe133bb3d0d83a6a0c5c7ade9",
        variables: {
          user_input,
          use_creative_template: "true",
          img1: {
            type: "input_image",
            image_url: product.data.imgVariants?.noBg,
            detail: "high",
          },
        },
      },
      input: [],
      reasoning: {
        summary: "auto",
      },
      store: true,
      include: [
        "reasoning.encrypted_content",
        "web_search_call.action.sources",
      ],
    });
    const image_prompt = response.output_text;
    console.log("Generated image prompt:", image_prompt);

    const productImage = product.data.imgVariants?.noBg;
    if (!productImage) {
      throw new Error("Product image not found");
    }
    const inputImages = [productImage];

    const externalImageUrl = await Replicate.NanoBanana.run({
      prompt: image_prompt,
      image_input: inputImages,
      pro: true,
    });

    // Copy the generated image to our internal R2 storage
    const imageUrl = await EntImageGeneration.copyImageToStorage(
      externalImageUrl,
      generation.data.id,
    );

    await generation.update({
      outputImages: [imageUrl],
      state: "completed",
      metadata: {
        ...(generation.data.metadata ?? {}),
        prompt: customPrompt,
        generatedPrompt: image_prompt,
        inputImages,
      },
    });
    return generation;
  }

  /**
   * Copy an external image URL to our internal R2 storage
   */
  static async copyImageToStorage(
    externalUrl: string,
    generationId: string,
  ): Promise<string> {
    const response = await fetch(externalUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image from ${externalUrl}: ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const extension = contentType.includes("jpeg") ? "jpg" : "png";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const key = Storage.Key.workspace(
      Actor.workspaceID(),
      "generations",
      `${generationId}.${extension}`,
    );

    const { url } = await Storage.upload(key, buffer, Storage.PUBLIC_BUCKET, {
      contentType,
    });

    return url;
  }

  static async fromID(id: string): Promise<EntImageGeneration> {
    const [generation] = await db()
      .select()
      .from(imageGenerationTable)
      .where(
        and(
          eq(imageGenerationTable.id, id),
          eq(imageGenerationTable.workspaceId, Actor.workspaceID()),
        ),
      )
      .limit(1);

    if (!generation) throw new Error(`Image generation ${id} not found`);

    return new EntImageGeneration(generation);
  }

  static async list(
    params: {
      page?: number;
      pageSize?: number;
      productId?: string;
      includeVariants?: boolean;
      parentGenerationId?: string;
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 20,
      productId,
      includeVariants = false,
      parentGenerationId,
    } = params;

    const filters = [eq(imageGenerationTable.workspaceId, Actor.workspaceID())];

    if (productId) {
      filters.push(eq(imageGenerationTable.productId, productId));
    }

    if (parentGenerationId) {
      filters.push(
        eq(imageGenerationTable.parentGenerationId, parentGenerationId),
      );
    } else if (!includeVariants) {
      filters.push(isNull(imageGenerationTable.parentGenerationId));
    }

    const whereClause = and(...filters);

    const totalCountResult = await db()
      .select({ count: count() })
      .from(imageGenerationTable)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const generations = await db()
      .select()
      .from(imageGenerationTable)
      .where(whereClause)
      .orderBy(desc(imageGenerationTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      generations: generations.map(
        (generation) => new EntImageGeneration(generation),
      ),
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  // ------------------------------------------------------------------------
  // wrappers around data
  // ------------------------------------------------------------------------
  meta() {
    return this.data.metadata;
  }
  prompt() {
    return this.meta().prompt;
  }
  referenceImageUrl() {
    return this.meta().referenceImageUrl;
  }
  styleId() {
    return this.data.styleComponentId;
  }
  async style() {
    const id = this.data.styleComponentId;
    if (!id) throw new Error("Generation has no associated style");
    return await EntStyleComponent.fromID(id);
  }
  productId() {
    return this.data.productId;
  }
  outputImages() {
    return this.data.outputImages;
  }

  async product() {
    const id = this.data.productId;
    if (!id) throw new Error("Generation has no associated product");
    return await EntProduct.fromID(id);
  }

  async productImages() {
    const product = await this.product();
    // flatten
    return Object.values(product.data.imgVariants || {});
  }
  async styleImages() {
    const style = await this.style();
    return style.data.imageRefs;
  }

  static async listForStyle(
    styleComponentId: string,
    params: {
      page?: number;
      pageSize?: number;
      productId?: string | null;
      includeVariants?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 20,
      productId,
      includeVariants = true,
    } = params;

    const filters = [
      eq(imageGenerationTable.styleComponentId, styleComponentId),
    ];
    if (productId === null) {
      filters.push(isNull(imageGenerationTable.productId));
    } else if (productId) {
      filters.push(eq(imageGenerationTable.productId, productId));
    }

    if (!includeVariants) {
      filters.push(isNull(imageGenerationTable.parentGenerationId));
    }

    const whereClause = and(...filters);

    const totalCountResult = await db()
      .select({ count: count() })
      .from(imageGenerationTable)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const generations = await db()
      .select()
      .from(imageGenerationTable)
      .where(whereClause)
      .orderBy(desc(imageGenerationTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      generations: generations.map(
        (generation) => new EntImageGeneration(generation),
      ),
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async update(
    input: z.infer<ReturnType<typeof EntImageGeneration.Schemas>["update"]>,
  ): Promise<this> {
    if (!input || Object.keys(input).length === 0) return this;

    const [updated] = await db()
      .update(imageGenerationTable)
      .set(input)
      .where(eq(imageGenerationTable.id, this.data.id))
      .returning();

    if (!updated) throw new Error(`Image generation ${this.data.id} not found`);

    this.data = updated;
    return this;
  }

  async setState(
    state: ImageGenerationState,
    stateMessage?: string | null,
  ): Promise<this> {
    return this.update({
      state,
      stateMessage: stateMessage ?? null,
    });
  }

  async setWorkflowInstance(workflowInstanceId: string): Promise<this> {
    return this.update({
      workflowInstanceId,
    });
  }

  async delete() {
    // Delete images from storage (if they're in our bucket)
    if (this.data.outputImages && this.data.outputImages.length > 0) {
      const deleteImagePromises = this.data.outputImages.map(
        async (imageUrl) => {
          try {
            const url = new URL(imageUrl);
            if (
              url.hostname === "bucket.openpromo.app" ||
              url.hostname.includes("r2.cloudflarestorage.com")
            ) {
              const key = url.pathname.slice(1); // Remove leading slash
              await Storage.deleteFile(key, Storage.PUBLIC_BUCKET);
            }
          } catch (error) {
            console.error("Failed to delete generation image", {
              imageUrl,
              error,
            });
          }
        },
      );

      await Promise.allSettled(deleteImagePromises);
    }

    // Delete the database record
    const [deleted] = await db()
      .delete(imageGenerationTable)
      .where(eq(imageGenerationTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Image generation ${this.data.id} not found`);

    return deleted;
  }

  static async deleteBatch(ids: string[]) {
    if (ids.length === 0) return { deletedCount: 0 };

    // First, fetch the records to get image URLs
    const generationsToDelete = await db()
      .select()
      .from(imageGenerationTable)
      .where(
        and(
          eq(imageGenerationTable.workspaceId, Actor.workspaceID()),
          inArray(imageGenerationTable.id, ids),
        ),
      );

    // Delete images from storage (if they're in our bucket)
    const deleteImagePromises = generationsToDelete.flatMap((generation) => {
      const outputImages = generation.outputImages as string[] | null;
      if (!outputImages || outputImages.length === 0) return [];

      return outputImages.map(async (imageUrl) => {
        try {
          // Only delete if it's from our storage
          const url = new URL(imageUrl);
          if (
            url.hostname === "bucket.openpromo.app" ||
            url.hostname.includes("r2.cloudflarestorage.com")
          ) {
            const key = url.pathname.slice(1); // Remove leading slash
            await Storage.deleteFile(key, Storage.PUBLIC_BUCKET);
          }
        } catch (error) {
          console.error("Failed to delete generation image", {
            imageUrl,
            error,
          });
        }
      });
    });

    // Wait for all image deletions (but don't fail if some fail)
    await Promise.allSettled(deleteImagePromises);

    // Delete the database records
    const deleted = await db()
      .delete(imageGenerationTable)
      .where(
        and(
          eq(imageGenerationTable.workspaceId, Actor.workspaceID()),
          inArray(imageGenerationTable.id, ids),
        ),
      )
      .returning();

    return { deletedCount: deleted.length };
  }

  // ------------------------------------------------------------------------
  // image generation
  // ------------------------------------------------------------------------
  async deriveStyleContext(opts: { productID: string; styleId?: string }) {
    const product = await EntProduct.fromID(opts.productID);
    // Match product with available styles
    const officialStyles = await EntStyleComponent.listOfficial();

    if (officialStyles.length === 0) {
      throw new Error(
        "No official styles exist yet. Create a style before generating images.",
      );
    }

    return await ProductImageGen.selectOptimalStyleForProduct(
      product,
      officialStyles,
      opts.styleId ? await EntStyleComponent.fromID(opts.styleId) : null,
    );
  }

  async setOutputImages(imageUrls: string[]): Promise<this> {
    return this.update({
      outputImages: imageUrls,
    });
  }

  /**
   * Dispatch a workspace event for this generation update
   * Call this after updating the generation state to notify clients
   */
  async dispatchUpdateEvent(): Promise<void> {
    await dispatchWorkspaceEvent(
      this.data.workspaceId,
      createWorkspaceEvent(WorkspaceEventType.ImageGenerationUpdated, {
        generationId: this.data.id,
        state: this.data.state,
        stateMessage: this.data.stateMessage,
        outputImages: this.data.outputImages,
      }),
    );
  }
}
