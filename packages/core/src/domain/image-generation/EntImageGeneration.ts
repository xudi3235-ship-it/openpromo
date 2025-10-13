import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { and, count, db, desc, eq, isNull } from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
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

  /**
   * Create and start an image generation process for a product.
   * This method handles:
   * 1. Loading the product
   * 2. Determining which style to use (explicit or matched)
   * 3. Creating the generation record
   * 4. Starting the workflow
   * 5. Dispatching workspace events
   */
  static async createAndStart(params: {
    productId: string;
    styleId?: string;
  }): Promise<{ generation: EntImageGeneration; imageUrl?: string }> {
    // Create the generation record
    const generation = await EntImageGeneration.create({
      state: "pending",
      productId: params.productId,
      styleComponentId: params.styleId ?? null,
    });

    // Start the workflow
    const workflow = await Binding.use().ImageGenerationWorkflow.create({
      params: {
        actor: Actor.assert("workspace_user"),
        generationId: generation.data.id,
      },
    });

    await generation.setWorkflowInstance(workflow.id);

    // Dispatch workspace event
    await dispatchWorkspaceEvent(
      Actor.workspaceID(),
      createWorkspaceEvent(WorkspaceEventType.ImageGenerationUpdated, {
        generationId: generation.data.id,
        state: generation.data.state,
        stateMessage: generation.data.stateMessage,
      }),
    );

    return {
      generation,
      imageUrl: undefined, // TODO: replace this once migration is done
    };
  }

  static async fromID(id: string): Promise<EntImageGeneration> {
    const [generation] = await db()
      .select()
      .from(imageGenerationTable)
      .where(eq(imageGenerationTable.id, id))
      .limit(1);

    if (!generation) throw new Error(`Image generation ${id} not found`);

    return new EntImageGeneration(generation);
  }

  static async listForStyle(
    styleComponentId: string,
    params: {
      page?: number;
      pageSize?: number;
      productId?: string | null;
    } = {},
  ) {
    const { page = 1, pageSize = 20, productId } = params;

    const filters = [
      eq(imageGenerationTable.styleComponentId, styleComponentId),
    ];
    if (productId === null) {
      filters.push(isNull(imageGenerationTable.productId));
    } else if (productId) {
      filters.push(eq(imageGenerationTable.productId, productId));
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
    const [deleted] = await db()
      .delete(imageGenerationTable)
      .where(eq(imageGenerationTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Image generation ${this.data.id} not found`);

    return deleted;
  }
  // ------------------------------------------------------------------------
  // image generation
  // ------------------------------------------------------------------------
  async deriveStyleContext(opts: { productID: string; styleId?: string }) {
    const product = await EntProduct.fromID(opts.productID);

    // Determine which style to use
    let styleComponent: EntStyleComponent;
    let promptOverride: string | undefined;

    if (opts.styleId) {
      styleComponent = await EntStyleComponent.fromID(opts.styleId);
    } else {
      // Match product with available styles
      const officialStyles = await EntStyleComponent.listOfficial();

      if (officialStyles.length === 0) {
        throw new Error(
          "No official styles exist yet. Create a style before generating images.",
        );
      }

      const match = await ProductImageGen.matchProductWithStyles(
        product,
        officialStyles,
      );
      styleComponent = match.style;
      promptOverride = match.prompt;
    }

    // Prepare style input
    return {
      imageGenPrompt: promptOverride ?? styleComponent.data.imageGenPrompt,
      imageRefs: styleComponent.data.imageRefs,
      name: styleComponent.data.slug,
      description: styleComponent.data.description,
    } as ProductImageGen.ImageStyleInput;
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
