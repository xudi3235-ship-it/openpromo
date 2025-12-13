import { VideoGenRealtime } from "@shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback } from "react";
import { orpc } from "@/lib/orpc-client";
import { useLiveRunStore } from "@/stores/live-run-store";
import { useActor } from "./useActor";
import { useWorkspace } from "./useWorkspace";

type Props = {
  onEvent?: VideoGenRealtime.Handlers;
};

/**
 * Hook for managing video generation agent connection.
 *
 * Architecture: Zustand for Live State, React Query for Completed Runs
 * - LIVE runs: WebSocket events write to Zustand store (instant re-renders)
 * - COMPLETED runs: Query invalidation fetches from database
 *
 * This separation ensures reliable real-time updates because Zustand's set()
 * triggers immediate re-renders, unlike React Query's setQueryData.
 */
export function useVideoGenAgent({ onEvent }: Props) {
  const { workspace } = useWorkspace();
  const actorID = useActor().id;
  const queryClient = useQueryClient();

  // Zustand store actions and state
  const syncState = useLiveRunStore((s) => s.syncState);
  const clearActiveRun = useLiveRunStore((s) => s.clearActiveRun);
  const setConnected = useLiveRunStore((s) => s.setConnected);
  const isConnected = useLiveRunStore((s) => s.isConnected);
  const activeRun = useLiveRunStore((s) => s.activeRun);

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

  // WebSocket event handlers - write to Zustand store
  const handlers = useCallback(
    (): VideoGenRealtime.Handlers => ({
      ...onEvent,

      // sync_state: Write to Zustand for instant UI updates
      sync_state: async (data) => {
        syncState(data.state); // Zustand update = immediate re-render
        await callUserHandler("sync_state", data);
      },

      // run_completed: Clear Zustand, fetch final state from DB
      run_completed: async (data) => {
        clearActiveRun(); // Clear live state
        await invalidateRunQueries(data.runId); // Fetch from DB
        await callUserHandler("run_completed", data);
      },
    }),
    [onEvent, callUserHandler, syncState, clearActiveRun, invalidateRunQueries],
  );

  const agent = useAgent<VideoGenRealtime.ServerAppState>({
    agent: "video-gen-agent",
    name: actorID,
    host: `${window.location.origin}/api/workspaces/${workspace.slug}/agents`,
    onOpen: () => {
      setConnected(true);
    },
    onClose: () => {
      setConnected(false);
    },
    onMessage: async (event) => {
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
    // Connection status (from Zustand)
    isConnected,

    // Active run tracking (from Zustand)
    activeRunId: activeRun?.runId ?? null,
    generationStatus: activeRun?.status ?? "not_started",
    isGenerating: activeRun?.status === "running",

    // Actions
    startGeneration: (input: VideoGenRealtime.EventDataMap["set_input"]) => {
      sendEvent("start_pipeline", { input });
    },
    resetState: () => {
      clearActiveRun();
      sendEvent("reset_state", {});
    },

    // Low-level access
    agent,
    sendEvent,
    chat,
  };
}
