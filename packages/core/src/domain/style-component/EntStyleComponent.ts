import { EntImageGeneration } from "@core/domain/image-generation";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { and, asc, count, db, desc, eq, ilike, or } from "@core/helpers/db";
import { Ent } from "@core/helpers/ent";
import { FeatureFlag } from "@core/helpers/featureflag";
import {
  StyleComponentInsert,
  type StyleComponentSelectType,
  StyleComponentUpdate,
  styleComponentTable,
} from "@core/schemas/style.sql";

import { fn } from "@core/utils/fn";
import type * as z from "zod";

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
      create: StyleComponentInsert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        isOfficial: true,
        creatorID: true,
      }),
      update: StyleComponentUpdate.partial(),
    };
  }

  static create = fn(this.Schemas().create, async (input) => {
    const [component] = await db()
      .insert(styleComponentTable)
      .values({
        ...input,
        isOfficial: FeatureFlag.isInternal(),
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorID: Actor.userID(),
      })
      .returning();

    if (!component) throw new Error("Failed to create style component");

    try {
      await Binding.use().StyleComponentWorkflow.create({
        params: {
          actor: Actor.assert("workspace_user"),
          styleComponentId: component.id,
        },
      });
    } catch (error) {
      console.error("// Failed to enqueue style component workflow", error);
    }

    return new EntStyleComponent(component);
  });

  static async fromID(id: string): Promise<EntStyleComponent> {
    const isInternal = FeatureFlag.isInternal();
    const [component] = await db()
      .select()
      .from(styleComponentTable)
      .where(
        and(
          eq(styleComponentTable.id, id),
          // internal have privilege
          isInternal
            ? undefined
            : eq(styleComponentTable.creatorID, Actor.userID()),
        ),
      )
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
      officialOnly?: boolean;
      sort?: "latest" | "oldest" | "most_used";
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 20,
      search,
      officialOnly = false,
      sort = "latest",
    } = params;

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

    if (officialOnly) {
      filters.push(eq(styleComponentTable.isOfficial, true));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Count total records with filters
    const countQuery = db()
      .select({ count: count() })
      .from(styleComponentTable)
      .where(whereClause);
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const orderExpressions = [desc(styleComponentTable.isOfficial)];
    if (sort === "oldest") {
      orderExpressions.push(asc(styleComponentTable.createdAt));
      orderExpressions.push(desc(styleComponentTable.updatedAt));
    } else if (sort === "most_used") {
      orderExpressions.push(desc(styleComponentTable.updatedAt));
      orderExpressions.push(desc(styleComponentTable.createdAt));
    } else {
      orderExpressions.push(desc(styleComponentTable.createdAt));
      orderExpressions.push(desc(styleComponentTable.updatedAt));
    }

    const styles = await db()
      .select()
      .from(styleComponentTable)
      .where(whereClause)
      .orderBy(...orderExpressions)
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

  static async listOfficial(options: { pageSize?: number } = {}) {
    const styles: EntStyleComponent[] = [];
    const pageSize = options.pageSize ?? 100;
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const result = await EntStyleComponent.list({
        page,
        pageSize,
        officialOnly: true,
      });
      styles.push(...result.styles);
      hasNext = result.pagination.hasNextPage;
      page += 1;
    }

    return styles;
  }

  async listGenerations(
    params?: Parameters<typeof EntImageGeneration.listForStyle>[1],
  ) {
    return EntImageGeneration.listForStyle(this.data.id, params);
  }

  async update(
    input: z.infer<ReturnType<typeof EntStyleComponent.Schemas>["update"]>,
  ): Promise<this> {
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
