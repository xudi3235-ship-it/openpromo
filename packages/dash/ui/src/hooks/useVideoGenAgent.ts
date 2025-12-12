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

      const applyServerState = <T extends { id: string } | null | undefined>(
        old: T,
      ) => {
        if (!old) return old;

        return {
          ...old,
          status: nextState.status,
          artifacts: nextState.artifacts,
          output: nextState.output,
          logs: nextState.logs,
          input: nextState.input,
          updatedAt: new Date(nextState.lastUpdated),
        } as T;
      };

      queryClient.setQueryData<AgentRunsRouterOutputs["get"]>(
        runQueryKey,
        (old) => applyServerState(old) as AgentRunsRouterOutputs["get"],
      );

      queryClient.setQueriesData<AgentRunsRouterOutputs["list"] | undefined>(
        { queryKey: orpc.agentRuns.list.key() },
        (old) => {
          if (!old || !Array.isArray(old.items)) {
            return old;
          }

          const items = old.items.map((item) =>
            item.id === runId ? (applyServerState(item) as typeof item) : item,
          );

          if (items === old.items) return old;

          return {
            ...old,
            items,
          } satisfies AgentRunsRouterOutputs["list"];
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

        setServerState((prev) => {
          const next = data.state;

          if (next.runId) {
            setRunSnapshot(next.runId, next);
          } else if (prev.runId) {
            setRunSnapshot(prev.runId, next);
          }

          return next;
        });

        await callUserHandler("sync_state", data);
      },
      status_update: async (data) => {
        setServerState((prev) => {
          const next = {
            ...prev,
            status: data.status,
            lastUpdated: new Date().toISOString(),
          };

          if (prev.runId) {
            setRunSnapshot(prev.runId, next);
          }

          return next;
        });

        await callUserHandler("status_update", data);
      },
      video_generated: async (data) => {
        setServerState((prev) => {
          const next = {
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

          if (prev.runId) {
            setRunSnapshot(prev.runId, next);
          }

          return next;
        });

        await callUserHandler("video_generated", data);
      },
    }),
    [onEvent, callUserHandler, setRunSnapshot],
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
