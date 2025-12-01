/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenRealtime } from "@shared";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";

type UseVideoGenAgentProps = {
  userId: string;
  onEvent?: VideoGenRealtime.Handlers;
  _onMessage?: (event: MessageEvent) => Promise<void>;
};

export function useVideoGenAgent({
  userId,
  onEvent,
  _onMessage,
}: UseVideoGenAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [serverState, setServerState] =
    useState<VideoGenRealtime.ServerAppState>(
      VideoGenRealtime.initialServerAppState,
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

  const agent = useAgent<VideoGenRealtime.ServerAppState>({
    agent: "video-gen-agent",
    name: userId,
    host: `${window.location.origin}/api/agents`,
    onOpen: () => {
      console.log("[useVideoGenAgent] Connected");
      setIsConnected(true);
    },
    onClose: () => {
      console.log("[useVideoGenAgent] Disconnected");
      setIsConnected(false);
    },
    onMessage: async (event) => {
      _onMessage?.(event);
      console.log("[useVideoGenAgent] Received message:", event.data);
      const handlers: VideoGenRealtime.Handlers = {
        ...onEvent,
        sync_state: async (data) => {
          console.log(
            "[useVideoGenAgent] sync_state event received:",
            data.state,
          );
          setServerState(data.state);
          await callUserHandler("sync_state", data);
        },
        status_update: async (data) => {
          setServerState((prev) => ({
            ...prev,
            status: data.status,
            lastUpdated: new Date().toISOString(),
          }));
          await callUserHandler("status_update", data);
        },
        video_generated: async (data) => {
          setServerState((prev) => ({
            ...prev,
            finalVideoUrl: data.videoUrl,
            lastUpdated: new Date().toISOString(),
          }));
          await callUserHandler("video_generated", data);
        },
      };

      await VideoGenRealtime.onEvent(event.data, {
        ...handlers,
      });
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
    // Custom Event Sender
    sendEvent,
    // chat integration
    chat,
    // server state
    serverState,
  };
}
