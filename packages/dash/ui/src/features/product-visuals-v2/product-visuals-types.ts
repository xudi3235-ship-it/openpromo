import type { AgentRunsRouterOutputs } from "@worker/orpc";

export type GenerationMode = "image" | "video";

export type AssetItem = { id: string; url: string };

export type RunFeedItem = AgentRunsRouterOutputs["list"]["items"][number];
