/** biome-ignore-all lint/suspicious/noConsole: test */
import { VideoGenMessageEvent } from "@shared";
import { useAgent } from "agents/react";
import { useCallback, useState } from "react";

type UseVideoGenAgentProps = {
  userId: string;
  onEvent?: VideoGenMessageEvent.Handlers;
};

export function useVideoGenAgent({ userId, onEvent }: UseVideoGenAgentProps) {
  const [isConnected, setIsConnected] = useState(false);

  const agent = useAgent({
    agent: "video-gen-agent",
    name: userId || "default", // Ensure a name is always provided
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
      await VideoGenMessageEvent.onEvent(event.data, onEvent);
    },
  });

  const sendEvent = useCallback(
    (event: VideoGenMessageEvent.Event) => {
      if (!agent) throw new Error("Agent is not connected");
      agent.send(JSON.stringify(event));
    },
    [agent],
  );

  return {
    agent,
    isConnected,
    sendEvent,
  };
}
