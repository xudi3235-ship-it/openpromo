import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { and, count, db, eq, ilike, or } from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
import {
  ProductInsert,
  type ProductSelectType,
  ProductUpdate,
  productTable,
} from "@core/schemas/product.sql";
import { fn } from "@core/utils/fn";
import type * as z from "zod";

export class EntProduct extends Ent<ProductSelectType> {
  static type = "product";

  data: ProductSelectType;

  constructor(data: ProductSelectType) {
    super(data);
    this.data = data;
  }

  toJSON() {
    return this.data;
  }

  static Schemas() {
    return {
      create: ProductInsert.omit({ workspaceId: true }),
      update: ProductUpdate.partial(),
    };
  }

  /**
   * Create a new product
   */
  static create = fn(this.Schemas().create, async (input) => {
    const workspaceID = Actor.workspaceID();

    const [product] = await db()
      .insert(productTable)
      .values({
        ...input,
        workspaceId: workspaceID,
      })
      .returning();

    // start product processing workflow
    const wf = await Binding.use().ProductProcessingWorkflow.create({
      params: {
        actor: Actor.assert("workspace_user"),
        productId: product.id,
      },
    });

    const [newProduct] = await db()
      .update(productTable)
      .set({ workflowInstanceId: wf.id })
      .where(eq(productTable.id, product.id))
      .returning();

    return new EntProduct(newProduct);
  });

  /**
   * Get product by ID
   */
  static async fromID(id: string): Promise<EntProduct> {
    const workspaceID = Actor.workspaceID();

    const [product] = await db()
      .select()
      .from(productTable)
      .where(
        and(eq(productTable.id, id), eq(productTable.workspaceId, workspaceID)),
      )
      .limit(1);

    if (!product) throw new Error(`Product ${id} not found`);

    return new EntProduct(product);
  }

  /**
   * List products with filters and pagination
   */
  static async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    source?: ProductSelectType["source"];
  }) {
    const { page = 1, pageSize = 20, search, category, source } = params;

    const workspaceID = Actor.workspaceID();

    // Build where conditions
    const whereConditions = [eq(productTable.workspaceId, workspaceID)];

    if (category) {
      whereConditions.push(eq(productTable.category, category));
    }

    if (source) {
      whereConditions.push(eq(productTable.source, source));
    }

    if (search) {
      const sanitized = search.replace(/[%_]/g, (char) => `\\${char}`);
      const likeTerm = `%${sanitized}%`;
      const searchCondition = or(
        ilike(productTable.name, likeTerm),
        ilike(productTable.description, likeTerm),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    // Get total count
    const totalCountResult = await db()
      .select({ count: count() })
      .from(productTable)
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get products
    const products = await db()
      .select()
      .from(productTable)
      .where(and(...whereConditions))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      products: products.map((p) => new EntProduct(p)),
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

  /**
   * Update product
   */
  async update(
    input: z.infer<ReturnType<typeof EntProduct.Schemas>["update"]>,
  ) {
    const workspaceID = Actor.workspaceID();

    const [updated] = await db()
      .update(productTable)
      .set(input)
      .where(
        and(
          eq(productTable.id, this.data.id),
          eq(productTable.workspaceId, workspaceID),
        ),
      )
      .returning();

    if (!updated) throw new Error(`Product ${this.data.id} not found`);

    this.data = updated;
    return this;
  }

  /**
   * Delete product and cleanup attachments
   */
  async delete(): Promise<ProductSelectType> {
    const workspaceID = Actor.workspaceID();

    // Delete product from database first
    const [deleted] = await db()
      .delete(productTable)
      .where(
        and(
          eq(productTable.id, this.data.id),
          eq(productTable.workspaceId, workspaceID),
        ),
      )
      .returning();

    if (!deleted) throw new Error(`Product ${this.data.id} not found`);

    // Cleanup attachments asynchronously (don't block on this)
    this.cleanupAttachments(deleted.attachments).catch((error) => {
      console.error(
        `Failed to cleanup attachments for product ${this.data.id}:`,
        error,
      );
    });

    return deleted;
  }

  /**
   * Cleanup R2 storage for product attachments
   */
  private async cleanupAttachments(
    attachments: typeof this.data.attachments,
  ): Promise<void> {
    const { EntAttachment } = await import("../content/entity/media");
    const { Storage } = await import("@core/helpers/storage");

    for (const attachmentSpec of attachments) {
      try {
        const attachment = EntAttachment.fromSharedSpec(
          this.data.workspaceId,
          attachmentSpec,
        );

        // Find R2 location
        const r2Location =
          attachment.primaryLocation().kind === "r2"
            ? attachment.primaryLocation()
            : attachment.mirrors().find((m) => m.kind === "r2");

        if (r2Location && r2Location.kind === "r2") {
          await Storage.deleteFile(r2Location.key, Storage.PUBLIC_BUCKET);
        }
      } catch (error) {
        console.error(
          `Failed to cleanup attachment ${attachmentSpec.id}:`,
          error,
        );
      }
    }
  }
  // -------------------------- helpers --------------------------
  async setWorkflowInstance(workflowInstanceId: string) {
    return await this.update({ workflowInstanceId });
  }
  async setState(state: ProductSelectType["state"], stateMessage?: string) {
    return await this.update({ state, stateMessage });
  }
}
