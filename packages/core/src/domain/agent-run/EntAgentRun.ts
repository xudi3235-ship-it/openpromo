import { and, count, db, desc, eq, inArray, sql } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Ent } from "@core/helpers/ent";
import {
  AgentRunInsert,
  type AgentRunInsertType,
  type AgentRunSelectType,
  type AgentRunStatus,
  AgentRunUpdate,
  agentRunTable,
} from "@core/schemas/agent-run.sql";
import type { VideoGenRealtime } from "@shared/agents";
import type z from "zod";

export class EntAgentRun extends Ent<AgentRunSelectType> {
  static type = "agent_run";
  data: AgentRunSelectType;

  constructor(data: AgentRunSelectType) {
    super(data);
    this.data = data;
  }

  toJSON() {
    return this.data;
  }

  static Schemas() {
    return {
      create: AgentRunInsert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
      }),
      update: AgentRunUpdate.partial(),
    };
  }

  static async createFromState(state: VideoGenRealtime.ServerAppState) {
    return await EntAgentRun.create({
      ...state,
    });
  }

  static async create(
    input: z.infer<ReturnType<typeof EntAgentRun.Schemas>["create"]>,
  ): Promise<EntAgentRun> {
    const [row] = await db()
      .insert(agentRunTable)
      .values({
        ...input,
        workspaceId: Actor.workspaceID(),
        status: input.status ?? "not_started",
        agentName: input.agentName,
      })
      .returning();

    if (!row) throw new Error("Failed to create agent run");
    return new EntAgentRun(row);
  }

  static async fromID(id: string): Promise<EntAgentRun> {
    const [row] = await db()
      .select()
      .from(agentRunTable)
      .where(
        and(
          eq(agentRunTable.id, id),
          eq(agentRunTable.workspaceId, Actor.workspaceID()),
        ),
      )
      .limit(1);

    if (!row) throw new Error(`Agent run ${id} not found`);
    return new EntAgentRun(row);
  }

  static async list(params: {
    page?: number;
    pageSize?: number;
    status?: AgentRunStatus;
    agentName?: AgentRunSelectType["agentName"];
    hasImages?: boolean;
    hasVideos?: boolean;
  }) {
    const {
      page = 1,
      pageSize = 20,
      status,
      agentName,
      hasImages,
      hasVideos,
    } = params;

    const filters = [eq(agentRunTable.workspaceId, Actor.workspaceID())];

    if (status) filters.push(eq(agentRunTable.status, status));
    if (agentName)
      filters.push(
        eq(
          agentRunTable.agentName,
          agentName as AgentRunSelectType["agentName"],
        ),
      );
    if (hasImages) {
      filters.push(
        sql`${agentRunTable.output}->'output'->'images' IS NOT NULL AND jsonb_array_length(${agentRunTable.output}->'output'->'images') > 0`,
      );
    }
    if (hasVideos) {
      filters.push(
        sql`${agentRunTable.output}->'output'->'videos' IS NOT NULL AND jsonb_array_length(${agentRunTable.output}->'output'->'videos') > 0`,
      );
    }

    const whereClause = and(...filters);

    const totalResult = await db()
      .select({ count: count() })
      .from(agentRunTable)
      .where(whereClause);
    const total = Number(totalResult[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rows = await db()
      .select()
      .from(agentRunTable)
      .where(whereClause)
      .orderBy(desc(agentRunTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      runs: rows.map((row) => new EntAgentRun(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async update(
    input: z.infer<ReturnType<typeof EntAgentRun.Schemas>["update"]>,
  ): Promise<this> {
    const [updated] = await db()
      .update(agentRunTable)
      .set(input as Partial<AgentRunInsertType>)
      .where(eq(agentRunTable.id, this.data.id))
      .returning();

    if (!updated) throw new Error(`Agent run ${this.data.id} not found`);
    this.data = updated;
    return this;
  }

  async delete() {
    const [deleted] = await db()
      .delete(agentRunTable)
      .where(eq(agentRunTable.id, this.data.id))
      .returning();

    if (!deleted) throw new Error(`Agent run ${this.data.id} not found`);
    return deleted;
  }

  static async deleteBatch(ids: string[]) {
    if (ids.length === 0) return { deletedCount: 0 };

    const deleted = await db()
      .delete(agentRunTable)
      .where(
        and(
          eq(agentRunTable.workspaceId, Actor.workspaceID()),
          inArray(agentRunTable.id, ids),
        ),
      )
      .returning({ id: agentRunTable.id });

    return { deletedCount: deleted.length };
  }

  async persistState(state: VideoGenRealtime.ServerAppState) {
    return await this.update({
      ...state,
    });
  }
}
