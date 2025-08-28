import z from "zod";
import { Actor } from "../actor";
import { and, db, eq, gt, lt } from "../drizzle";
import { withPagination } from "../drizzle/query";
import { NotImplementedError } from "../error";
import { defineEvent } from "../event";
import {
  type UnifiedContentUpdate,
  unifiedContentTable,
} from "../schema/content.sql";

export namespace UnifiedContent {
  export const Event = {
    Created: defineEvent(
      "unified_content.created",
      z.object({
        id: z.string(),
      }),
    ),
  };

  /**
   * List a workspace's all unified content. This only returns from the current db. For backfilling/syncing, use the other apis.
   *
   * This is a expensive api, we enforce time range based filtering and pagination.
   */
  export async function list(
    page: number,
    limit: number = 10,
    byTimeRange: {
      start: Date;
      end: Date;
    },
  ) {
    // dynamic query building: https://orm.drizzle.team/docs/dynamic-query-building
    const workspaceId = Actor.workspaceID();
    const query = db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          // by default we use created at. This is trivial for scheduled & drafts
          // for published contents, it's backfilled.
          gt(unifiedContentTable.createdAt, byTimeRange.start),
          lt(unifiedContentTable.createdAt, byTimeRange.end),
        ),
      )
      .$dynamic();

    return withPagination(query, page, limit);
  }

  export async function getByID(id: string) {
    const workspaceId = Actor.workspaceID();
    const [content] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .limit(1);
    return content;
  }

  export async function deleteByID(id: string) {
    const workspaceId = Actor.workspaceID();
    await db()
      .delete(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .execute();
  }

  export async function updateByID(
    id: string,
    data: z.infer<typeof UnifiedContentUpdate>,
  ) {
    const workspaceId = Actor.workspaceID();
    await db()
      .update(unifiedContentTable)
      // @ts-ignore might be a bad idea
      .set(data)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, id),
        ),
      )
      .execute();
  }

  export async function create(data: typeof unifiedContentTable.$inferInsert) {
    const workspaceId = Actor.workspaceID();
    await db()
      .insert(unifiedContentTable)
      .values({
        ...data,
        workspaceId,
      })
      .execute();
  }

  // --------------- backfilling apis ---------------
  // for a newly connected account, we do lazy rehydration. this is primarily for
  export async function fromFacebookPost() {
    throw new NotImplementedError(
      "from a published FB post, backfill a unified content record",
    );
  }
  export async function fromInstagramPost() {
    throw new NotImplementedError(
      "from a published IG post, backfill a unified content record",
    );
  }
}
