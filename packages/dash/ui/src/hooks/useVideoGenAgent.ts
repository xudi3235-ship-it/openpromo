/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenMessageEvent } from "@shared";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";

type UseVideoGenAgentProps = {
  userId: string;
  onEvent?: VideoGenMessageEvent.Handlers;
  _onMessage?: (event: MessageEvent) => Promise<void>;
};

export function useVideoGenAgent({
  userId,
  onEvent,
  _onMessage,
}: UseVideoGenAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [serverState, setServerState] =
    useState<VideoGenMessageEvent.ServerAppState>({
      _internal: {},
      status: "not_started",
      lastUpdated: new Date().toISOString(),
      error: null,
      input: {
        productImages: [],
        avatarImages: [],
        prompt: "empty prompt",
      },
      finalVideoUrl: null,
    });

  const callUserHandler = useCallback(
    async <T extends VideoGenMessageEvent.Event["type"]>(
      type: T,
      data: VideoGenMessageEvent.EventDataMap[T],
    ) => {
      const handler = onEvent?.[type];
      if (handler) {
        await handler(data as never);
      }
    },
    [onEvent],
  );

  const agent = useAgent({
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
      const handlers: VideoGenMessageEvent.Handlers = {
        ...onEvent,
        sync_state: async (data) => {
          console.log(
            "[useVideoGenAgent] sync_state event received:",
            data.state,
          );
          setServerState({
            ...data.state,
            _internal: {},
          });
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

      await VideoGenMessageEvent.onEvent(event.data, {
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
    <K extends VideoGenMessageEvent.Event["type"]>(
      type: K,
      data: VideoGenMessageEvent.EventDataMap[K],
    ) => {
      if (!agent) {
        console.warn("[useVideoGenAgent] Agent not connected");
        return;
      }
      // Use the shared helper to send type-safe events
      VideoGenMessageEvent.sendEvent(agent as unknown as WebSocket, type, data);
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
