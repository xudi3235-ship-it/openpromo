import { id, timestamp, timestamps } from "@core/database/types";
import { VideoGenRealtime } from "@shared/agents";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as z from "zod";
import { workspaceID } from "./workspaces.sql";

export const agentRunStatusEnum = pgEnum(
  "agent_run_status",
  VideoGenRealtime.RunStatus,
);

export type AgentRunStatus = z.infer<typeof VideoGenRealtime.RunStatusZod>;

export type AgentRunName = z.infer<typeof VideoGenRealtime.AgentNameZod>;
export const agentNameEnum = pgEnum(
  "agent_run_agent",
  VideoGenRealtime.AgentName,
);

export const AgentRunArtifactsSchema =
  VideoGenRealtime.AgentOutput.shape.output.default(
    VideoGenRealtime.defaultArtifacts,
  );
export type AgentRunArtifacts = z.infer<typeof AgentRunArtifactsSchema>;
const defaultArtifacts: AgentRunArtifacts = VideoGenRealtime.defaultArtifacts;

export const AgentRunOutputSchema = VideoGenRealtime.AgentOutput.default(
  VideoGenRealtime.defaultAgentOutput,
);
export type AgentRunOutput = z.infer<typeof AgentRunOutputSchema>;
const defaultOutput: AgentRunOutput = VideoGenRealtime.defaultAgentOutput;

export const AgentRunInputSchema = VideoGenRealtime.InputSchema.default(
  VideoGenRealtime.defaultInput,
);
export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;
const defaultInput: AgentRunInput = VideoGenRealtime.defaultInput;

export const agentRunTable = pgTable(
  "agent_run",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    // stores fields from server app state
    agentName: agentNameEnum("agent_name")
      .notNull()
      .default("video_gen_agent")
      .$type<AgentRunName>(),
    status: agentRunStatusEnum().notNull().default("not_started"),
    input: jsonb("input")
      .$type<AgentRunInput>()
      .notNull()
      .default(defaultInput),
    artifacts: jsonb("artifacts")
      .$type<AgentRunArtifacts>()
      .notNull()
      .default(defaultArtifacts),
    output: jsonb("output")
      .$type<AgentRunOutput>()
      .notNull()
      .default(defaultOutput),
    logs: text("logs"),
    error: text("error"),
    startedAt: timestamp(),
    completedAt: timestamp(),
  },
  (table) => [uniqueIndex().on(table.id), index().on(table.createdAt)],
);

const insertDefaults = {
  input: AgentRunInputSchema.default(defaultInput),
  artifacts: AgentRunArtifactsSchema.default(defaultArtifacts),
  output: AgentRunOutputSchema.default(defaultOutput),
  status: z.enum(VideoGenRealtime.RunStatus).default("not_started"),
};

export const AgentRunInsert = createInsertSchema(agentRunTable, insertDefaults);
export const AgentRunUpdate = createUpdateSchema(agentRunTable, insertDefaults);
export const AgentRunSelect = createSelectSchema(agentRunTable, insertDefaults);

export type AgentRunInsertType = z.infer<typeof AgentRunInsert>;
export type AgentRunUpdateType = z.infer<typeof AgentRunUpdate>;
export type AgentRunSelectType = z.infer<typeof AgentRunSelect>;
