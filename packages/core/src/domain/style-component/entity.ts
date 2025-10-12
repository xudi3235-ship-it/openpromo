import { and, asc, count, db, desc, eq, ilike, or } from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
import {
  StyleComponentInsert,
  type StyleComponentSelectType,
  StyleComponentUpdate,
  styleComponentTable,
} from "@core/schemas/product.sql";
import { fn } from "@core/utils/fn";
import type * as z from "zod";

type StyleComponentUpdateInput = z.infer<typeof StyleComponentUpdate>;

export class EntStyleComponent extends Ent<StyleComponentSelectType> {
  static type = "style_component";

  data: StyleComponentSelectType;

  constructor(data: StyleComponentSelectType) {
    super(data);
    this.data = data;
  }

  toJSON() {
    return this.data;
  }

  static Schemas() {
    return {
      create: StyleComponentInsert,
      update: StyleComponentUpdate,
    };
  }

  static create = fn(this.Schemas().create, async (input) => {
    const [component] = await db()
      .insert(styleComponentTable)
      .values(input)
      .returning();

    if (!component) throw new Error("Failed to create style component");

    return new EntStyleComponent(component);
  });

  static async fromID(id: string): Promise<EntStyleComponent> {
    const [component] = await db()
      .select()
      .from(styleComponentTable)
      .where(eq(styleComponentTable.id, id))
      .limit(1);

    if (!component) throw new Error(`Style component ${id} not found`);

    return new EntStyleComponent(component);
  }

  static async fromSlug(slug: string): Promise<EntStyleComponent> {
    const [component] = await db()
      .select()
      .from(styleComponentTable)
      .where(eq(styleComponentTable.slug, slug))
      .limit(1);

    if (!component) throw new Error(`Style component ${slug} not found`);

    return new EntStyleComponent(component);
  }

  static async list(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      order?: "asc" | "desc";
    } = {},
  ) {
    const { page = 1, pageSize = 20, search, order = "desc" } = params;

    const filters = [];
    if (search) {
      const sanitized = search.replace(/[%_]/g, (char) => `\\${char}`);
      const like = `%${sanitized}%`;
      filters.push(
        or(
          ilike(styleComponentTable.name, like),
          ilike(styleComponentTable.description, like),
        ),
      );
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Count total records
    const countQuery = db()
      .select({ count: count() })
      .from(styleComponentTable);
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const styles = await db()
      .select()
      .from(styleComponentTable)
      .where(whereClause)
      .orderBy(
        order === "asc"
          ? asc(styleComponentTable.createdAt)
          : desc(styleComponentTable.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      styles: styles.map((style) => new EntStyleComponent(style)),
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

  async update(input: StyleComponentUpdateInput): Promise<this> {
    if (!input || Object.keys(input).length === 0) return this;

    const [updated] = await db()
      .update(styleComponentTable)
      .set(input)
      .where(eq(styleComponentTable.id, this.data.id))
      .returning();

    if (!updated) throw new Error(`Style component ${this.data.id} not found`);

    this.data = updated;
    return this;
  }

  async delete() {
    const [deleted] = await db()
      .delete(styleComponentTable)
      .where(eq(styleComponentTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Style component ${this.data.id} not found`);

    return deleted;
  }
}
