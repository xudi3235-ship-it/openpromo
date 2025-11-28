import { and, count, db, desc, eq, inArray } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Ent } from "@core/helpers/ent";
import {
  VideoGenerationInsert,
  type VideoGenerationSelectType,
  type VideoGenerationState,
  VideoGenerationUpdate,
  videoGenerationTable,
} from "@core/schemas/video-generation.sql";
import {
  createWorkspaceEvent,
  WorkspaceEventType,
  type VideoGenerationState as WsVideoGenState,
} from "@shared/workspace";
import type z from "zod";
import { dispatchWorkspaceEvent } from "../workspace/realtime";

export class EntVideoGeneration extends Ent<VideoGenerationSelectType> {
  static type = "video_generation";

  data: VideoGenerationSelectType;

  constructor(data: VideoGenerationSelectType) {
    super(data);
    this.data = data;
  }

  toJSON() {
    return this.data;
  }

  static Schemas() {
    return {
      create: VideoGenerationInsert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
      }),
      update: VideoGenerationUpdate.partial(),
    };
  }

  static async create(
    input: z.infer<ReturnType<typeof EntVideoGeneration.Schemas>["create"]>,
  ): Promise<EntVideoGeneration> {
    const [generation] = await db()
      .insert(videoGenerationTable)
      .values({
        ...input,
        workspaceId: Actor.workspaceID(),
        state: input.state ?? "not_started",
      })
      .returning();

    if (!generation) throw new Error("Failed to create video generation");

    return new EntVideoGeneration(generation);
  }

  static async fromID(id: string): Promise<EntVideoGeneration> {
    const [generation] = await db()
      .select()
      .from(videoGenerationTable)
      .where(
        and(
          eq(videoGenerationTable.id, id),
          eq(videoGenerationTable.workspaceId, Actor.workspaceID()),
        ),
      )
      .limit(1);

    if (!generation) throw new Error(`Video generation ${id} not found`);

    return new EntVideoGeneration(generation);
  }

  static async list(
    params: {
      page?: number;
      pageSize?: number;
      productId?: string;
      state?: VideoGenerationState;
    } = {},
  ) {
    const { page = 1, pageSize = 20, productId, state } = params;

    const filters = [eq(videoGenerationTable.workspaceId, Actor.workspaceID())];

    if (productId) {
      filters.push(eq(videoGenerationTable.productId, productId));
    }

    if (state) {
      filters.push(eq(videoGenerationTable.state, state));
    }

    const whereClause = and(...filters);

    const totalCountResult = await db()
      .select({ count: count() })
      .from(videoGenerationTable)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const generations = await db()
      .select()
      .from(videoGenerationTable)
      .where(whereClause)
      .orderBy(desc(videoGenerationTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      generations: generations.map(
        (generation) => new EntVideoGeneration(generation),
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
    input: z.infer<ReturnType<typeof EntVideoGeneration.Schemas>["update"]>,
  ): Promise<this> {
    if (!input || Object.keys(input).length === 0) return this;

    const [updated] = await db()
      .update(videoGenerationTable)
      .set(input)
      .where(eq(videoGenerationTable.id, this.data.id))
      .returning();

    if (!updated) throw new Error(`Video generation ${this.data.id} not found`);

    this.data = updated;
    return this;
  }

  async setState(
    state: VideoGenerationState,
    stateMessage?: string | null,
  ): Promise<this> {
    return this.update({
      state,
      stateMessage: stateMessage ?? null,
    });
  }

  async setOutputVideoUrl(url: string): Promise<this> {
    return this.update({
      outputVideoUrl: url,
      state: "completed",
    });
  }

  async setWorkflowInstance(workflowInstanceId: string): Promise<this> {
    return this.update({
      workflowInstanceId,
    });
  }

  async delete() {
    const [deleted] = await db()
      .delete(videoGenerationTable)
      .where(eq(videoGenerationTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Video generation ${this.data.id} not found`);

    return deleted;
  }

  static async deleteBatch(ids: string[]) {
    if (ids.length === 0) return { deletedCount: 0 };

    // Delete the database records (videos are stored in Cloudflare Stream, cleanup handled separately)
    const deleted = await db()
      .delete(videoGenerationTable)
      .where(
        and(
          eq(videoGenerationTable.workspaceId, Actor.workspaceID()),
          inArray(videoGenerationTable.id, ids),
        ),
      )
      .returning({ id: videoGenerationTable.id });

    return { deletedCount: deleted.length };
  }

  /**
   * Map internal state to WebSocket event state
   */
  private mapToWsState(): WsVideoGenState {
    switch (this.data.state) {
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      case "not_started":
      case "pending":
      case "generating":
      default:
        return "processing";
    }
  }

  /**
   * Dispatch a workspace event for this generation update
   * Call this after updating the generation state to notify clients
   */
  async dispatchUpdateEvent(): Promise<void> {
    await dispatchWorkspaceEvent(
      this.data.workspaceId,
      createWorkspaceEvent(WorkspaceEventType.VideoGenerationUpdated, {
        jobId: this.data.id,
        state: this.mapToWsState(),
        message: this.data.stateMessage ?? undefined,
        outputUrl: this.data.outputVideoUrl ?? undefined,
      }),
    );
  }
}
