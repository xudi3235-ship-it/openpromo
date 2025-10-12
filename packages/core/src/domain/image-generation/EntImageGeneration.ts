import { and, count, db, desc, eq, isNull } from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
import {
  ImageGenerationInsert,
  type ImageGenerationSelectType,
  ImageGenerationUpdate,
  imageGenerationTable,
} from "@core/schemas/image-generation.sql";
import { fn } from "@core/utils/fn";
import type * as z from "zod";

type ImageGenerationUpdateInput = z.infer<typeof ImageGenerationUpdate>;

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
      }),
      update: ImageGenerationUpdate,
    };
  }

  static create = fn(this.Schemas().create, async (input) => {
    const [generation] = await db()
      .insert(imageGenerationTable)
      .values(input)
      .returning();

    if (!generation) throw new Error("Failed to create image generation");

    return new EntImageGeneration(generation);
  });

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

  async update(input: ImageGenerationUpdateInput): Promise<this> {
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

  async delete() {
    const [deleted] = await db()
      .delete(imageGenerationTable)
      .where(eq(imageGenerationTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Image generation ${this.data.id} not found`);

    return deleted;
  }
}
