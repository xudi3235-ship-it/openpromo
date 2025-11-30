/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenMessageEvent } from "@shared";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";

type UseVideoGenAgentProps = {
  userId: string;
  // Optional: Additional handlers for custom logic alongside state updates
  onEvent?: VideoGenMessageEvent.Handlers;
};

export function useVideoGenAgent({ userId, onEvent }: UseVideoGenAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  // server app state synchronized via ws
  const [serverState, setServerState] =
    useState<VideoGenMessageEvent.VideoGenState>({
      status: "idle",
      error: null,
      prompt: null,
      generatedKeyframes: [],
      finalVideoUrl: null,
      productID: null,
      avatarImageUrl: null,
    });

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
      if (!onEvent) throw new Error("onEvent handler is not defined");
      console.log("[useVideoGenAgent] Received message:", event.data);
      // Use the shared helper to handle type-safe events
      await VideoGenMessageEvent.onEvent(event.data, {
        ...onEvent,
        sync_state: (data) => {
          console.log(
            "[useVideoGenAgent] sync_state event received:",
            data.state,
          );
          setServerState(data.state);
        },
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
  };
}
