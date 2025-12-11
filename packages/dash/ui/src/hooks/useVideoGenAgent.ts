/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenRealtime } from "@shared";
import { useQueryClient } from "@tanstack/react-query";
import type { AgentRunsRouterOutputs } from "@worker/orpc";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";
import { orpc } from "@/lib/orpc-client";
import { useActor } from "./useActor";
import { useWorkspace } from "./useWorkspace";

type Props = {
  onEvent?: VideoGenRealtime.Handlers;
};

export function useVideoGenAgent({ onEvent }: Props) {
  const { workspace } = useWorkspace();
  const actorID = useActor().id;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [serverState, setServerState] =
    useState<VideoGenRealtime.ServerAppState>(
      VideoGenRealtime.initialServerAppState,
    );

  const setRunSnapshot = useCallback(
    (runId: string, nextState: VideoGenRealtime.ServerAppState) => {
      const runQueryKey = orpc.agentRuns.get.key({
        input: { id: runId, workspaceSlug: workspace.slug },
      });

      queryClient.setQueryData<AgentRunsRouterOutputs["get"]>(
        runQueryKey,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            status: nextState.status,
            artifacts: nextState.artifacts,
            output: nextState.output,
            logs: nextState.logs,
            input: nextState.input,
            updatedAt: new Date(nextState.lastUpdated),
          };
        },
      );
    },
    [queryClient, workspace.slug],
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

  // Memoize the internal handlers to prevent recreation on every message
  const handlers = useCallback(
    (): VideoGenRealtime.Handlers => ({
      ...onEvent,
      sync_state: async (data) => {
        console.log(
          "[useVideoGenAgent] sync_state event received:",
          data.state,
        );
        setServerState(data.state);

        // Invalidate individual run query if we have a runId
        if (data.state.runId) {
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.get.key({
              input: { id: data.state.runId, workspaceSlug: workspace.slug },
            }),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.list.key(),
          });
          setRunSnapshot(data.state.runId, data.state);
        }

        await callUserHandler("sync_state", data);
      },
      status_update: async (data) => {
        let runIdForInvalidation: string | null = null;
        setServerState((prev) => {
          runIdForInvalidation = prev.runId;
          return {
            ...prev,
            status: data.status,
            lastUpdated: new Date().toISOString(),
          };
        });

        if (runIdForInvalidation) {
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.get.key({
              input: {
                id: runIdForInvalidation,
                workspaceSlug: workspace.slug,
              },
            }),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.list.key(),
          });
          setRunSnapshot(runIdForInvalidation, {
            ...serverState,
            status: data.status,
            lastUpdated: new Date().toISOString(),
          });
        }

        await callUserHandler("status_update", data);
      },
      video_generated: async (data) => {
        let runIdForInvalidation: string | null = null;
        setServerState((prev) => {
          runIdForInvalidation = prev.runId;
          return {
            ...prev,
            artifacts: {
              ...prev.artifacts,
              videos: [
                ...(prev.artifacts.videos ?? []),
                { id: data.assetId, videoUrl: data.videoUrl },
              ],
            },
            lastUpdated: new Date().toISOString(),
          };
        });

        if (runIdForInvalidation) {
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.get.key({
              input: {
                id: runIdForInvalidation,
                workspaceSlug: workspace.slug,
              },
            }),
          });
          queryClient.invalidateQueries({
            queryKey: orpc.agentRuns.list.key(),
          });
          setRunSnapshot(runIdForInvalidation, {
            ...serverState,
            artifacts: {
              ...serverState.artifacts,
              videos: [
                ...(serverState.artifacts.videos ?? []),
                { id: data.assetId, videoUrl: data.videoUrl },
              ],
            },
            lastUpdated: new Date().toISOString(),
          });
        }

        await callUserHandler("video_generated", data);
      },
    }),
    [
      onEvent,
      callUserHandler,
      queryClient,
      serverState,
      setRunSnapshot,
      workspace.slug,
    ],
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

  // 2. Integrate Chat State
  const chat = useAgentChat({
    agent,
    // Disable HTTP fetch for initial messages, rely on WS sync (handled by AIChatAgent)
    getInitialMessages: null,
  });

  // 3. ws event sender
  const sendEvent = useCallback(
    <K extends VideoGenRealtime.Event["type"]>(
      type: K,
      data: VideoGenRealtime.EventDataMap[K],
    ) => {
      if (!agent) {
        console.warn("[useVideoGenAgent] Agent not connected");
        return;
      }
      // Use the shared helper to send type-safe events
      VideoGenRealtime.sendEvent(agent as unknown as WebSocket, type, data);
    },
    [agent],
  );

  return {
    // Connection
    isConnected,
    agent,
    // Application State
    state: serverState,
    // Combined agent setup and pipeline start in one call
    startGeneration: (input: VideoGenRealtime.EventDataMap["set_input"]) => {
      sendEvent("start_pipeline", { input });
    },
    // low level event sender on ws
    sendEvent,
    // chat integration
    chat,
    // server state
    serverState,
    // rpc wrappers around sendEvent for operations
    // ...
    resetState: () => {
      sendEvent("reset_state", {});
    },
  };
}
