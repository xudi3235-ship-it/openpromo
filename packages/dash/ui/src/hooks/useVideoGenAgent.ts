/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenRealtime } from "@shared";
import { useQueryClient } from "@tanstack/react-query";
import type { AgentRunsRouterOutputs } from "@worker/orpc";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { orpc } from "@/lib/orpc-client";
import { useActor } from "./useActor";
import { useWorkspace } from "./useWorkspace";

type Props = {
  onEvent?: VideoGenRealtime.Handlers;
};

/**
 * Hook for managing video generation agent connection.
 *
 * Architecture: WebSocket as Cache Writer
 * - Query cache is the single source of truth for run data
 * - WebSocket updates write directly to query cache
 * - Local state only tracks: connection status, active run ID, generation status
 * - Components read from useAgentRunQuery/useAgentRunsListQuery
 */
export function useVideoGenAgent({ onEvent }: Props) {
  const { workspace } = useWorkspace();
  const actorID = useActor().id;
  const queryClient = useQueryClient();

  // Minimal local state
  const [isConnected, setIsConnected] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<VideoGenRealtime.RunStatus>("not_started");

  /**
   * Write run state directly to query cache.
   * This is the core of the "WebSocket as Cache Writer" pattern.
   */
  const writeToCache = useCallback(
    (runId: string, state: VideoGenRealtime.ServerAppState) => {
      const now = new Date();

      // Build the run object that matches AgentRunsRouterOutputs["get"]
      const runData: Partial<RunFeedItem> = {
        id: runId,
        status: state.status,
        artifacts: state.artifacts,
        output: state.output,
        logs: state.logs,
        input: state.input,
        updatedAt: now,
        workspaceId: workspace.id,
      };

      // Update detail query cache
      const detailKey = orpc.agentRuns.get.key({
        input: { id: runId, workspaceSlug: workspace.slug },
      });

      queryClient.setQueryData<AgentRunsRouterOutputs["get"]>(
        detailKey,
        (old) => {
          if (!old) {
            // Create new entry if doesn't exist (optimistic insert)
            return {
              ...runData,
              createdAt: now,
              startedAt: now,
              completedAt:
                state.status === "succeeded" || state.status === "failed"
                  ? now
                  : null,
              error: state.error ?? null,
            } as AgentRunsRouterOutputs["get"];
          }
          return { ...old, ...runData } as AgentRunsRouterOutputs["get"];
        },
      );

      // Update list query cache
      queryClient.setQueriesData<AgentRunsRouterOutputs["list"] | undefined>(
        { queryKey: orpc.agentRuns.list.key() },
        (old) => {
          if (!old?.items) return old;

          const existingIndex = old.items.findIndex(
            (item) => item.id === runId,
          );

          if (existingIndex >= 0) {
            // Update existing item
            const items = [...old.items];
            items[existingIndex] = {
              ...items[existingIndex],
              ...runData,
            } as RunFeedItem;
            return { ...old, items };
          }

          // Insert new item at the beginning (optimistic)
          const newItem: RunFeedItem = {
            ...runData,
            createdAt: now,
            startedAt: now,
            completedAt: null,
            error: null,
          } as RunFeedItem;

          return { ...old, items: [newItem, ...old.items] };
        },
      );
    },
    [queryClient, workspace.id, workspace.slug],
  );

  const callUserHandler = useCallback(
    async <T extends VideoGenRealtime.Event["type"]>(
      type: T,
      data: VideoGenRealtime.EventDataMap[T],
    ) => {
      const handler = onEvent?.[type];
      if (handler) {
        await handler(data as never);
      }
    },
    [onEvent],
  );

  /**
   * Invalidate queries to fetch fresh data from DB
   * Called after run_completed to ensure UI shows correct final state
   */
  const invalidateRunQueries = useCallback(
    async (runId: string) => {
      console.log("[useVideoGenAgent] Invalidating queries for run:", runId);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.agentRuns.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.agentRuns.get.key({
            input: { id: runId, workspaceSlug: workspace.slug },
          }),
        }),
      ]);
    },
    [queryClient, workspace.slug],
  );

  // WebSocket event handlers - write directly to cache
  const handlers = useCallback(
    (): VideoGenRealtime.Handlers => ({
      ...onEvent,

      // sync_state: Only process for ACTIVE runs
      // Completed runs are handled via run_completed + DB fetch
      sync_state: async (data) => {
        console.log("[useVideoGenAgent] sync_state:", data.state.status);

        const { state } = data;

        // Only process for active runs
        if (state.runId && state.status === "running") {
          writeToCache(state.runId, state);
          setActiveRunId(state.runId);
          setGenerationStatus("running");
        } else if (!state.runId || state.status === "not_started") {
          // DO is idle, no active run
          setActiveRunId(null);
          setGenerationStatus("not_started");
        }
        // Ignore sync_state for succeeded/failed - those come via run_completed

        await callUserHandler("sync_state", data);
      },

      // run_completed: Final state is in DB, invalidate queries to fetch it
      run_completed: async (data) => {
        console.log(
          "[useVideoGenAgent] run_completed:",
          data.runId,
          data.status,
        );

        // Clear active run state
        setActiveRunId(null);
        setGenerationStatus("not_started");

        // Invalidate queries to fetch final state from DB (source of truth)
        await invalidateRunQueries(data.runId);

        await callUserHandler("run_completed", data);
      },
    }),
    [onEvent, callUserHandler, writeToCache, invalidateRunQueries],
  );

  const agent = useAgent<VideoGenRealtime.ServerAppState>({
    agent: "video-gen-agent",
    name: actorID,
    host: `${window.location.origin}/api/workspaces/${workspace.slug}/agents`,
    onOpen: () => {
      console.log("[useVideoGenAgent] Connected");
      setIsConnected(true);
    },
    onClose: () => {
      console.log("[useVideoGenAgent] Disconnected");
      setIsConnected(false);
    },
    onMessage: async (event) => {
      console.log("[useVideoGenAgent] Received message:", event.data);
      await VideoGenRealtime.onEvent(event.data, handlers());
    },
  });

  const chat = useAgentChat({
    agent,
    getInitialMessages: null,
  });

  const sendEvent = useCallback(
    <K extends VideoGenRealtime.Event["type"]>(
      type: K,
      data: VideoGenRealtime.EventDataMap[K],
    ) => {
      if (!agent) {
        console.warn("[useVideoGenAgent] Agent not connected");
        return;
      }
      VideoGenRealtime.sendEvent(agent as unknown as WebSocket, type, data);
    },
    [agent],
  );

  return {
    // Connection status
    isConnected,

    // Active run tracking (for UI indicators like "is this run live?")
    activeRunId,
    generationStatus,
    isGenerating: generationStatus === "running",

    // Actions
    startGeneration: (input: VideoGenRealtime.EventDataMap["set_input"]) => {
      setGenerationStatus("running");
      sendEvent("start_pipeline", { input });
    },
    resetState: () => {
      setActiveRunId(null);
      setGenerationStatus("not_started");
      sendEvent("reset_state", {});
    },

    // Low-level access
    agent,
    sendEvent,
    chat,
  };
}
