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
      status: "idle",
      currentStep: "idle",
      lastUpdated: new Date().toISOString(),
      pendingAction: null,
      error: null,
      assets: [],
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

  const upsertAsset = useCallback(
    (asset: VideoGenMessageEvent.GeneratedAsset) => {
      setServerState((prev) => {
        const exists = prev.assets.some((a) => a.id === asset.id);
        const assets = exists
          ? prev.assets.map((a) => (a.id === asset.id ? asset : a))
          : [...prev.assets, asset];
        return {
          ...prev,
          assets,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [],
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
        asset_added: async (data) => {
          upsertAsset(data.asset);
          await callUserHandler("asset_added", data);
        },
        asset_updated: async (data) => {
          upsertAsset(data.asset);
          await callUserHandler("asset_updated", data);
        },
        asset_progress: async (data) => {
          setServerState((prev) => ({
            ...prev,
            assets: prev.assets.map((asset) =>
              asset.id === data.assetId
                ? {
                    ...asset,
                    status: data.status ?? asset.status,
                    updatedAt: new Date().toISOString(),
                  }
                : asset,
            ),
          }));
          await callUserHandler("asset_progress", data);
        },
        status_update: async (data) => {
          setServerState((prev) => ({
            ...prev,
            status: data.status,
            currentStep: data.currentStep,
            lastUpdated: new Date().toISOString(),
          }));
          await callUserHandler("status_update", data);
        },
        action_required: async (data) => {
          setServerState((prev) => ({
            ...prev,
            pendingAction: data.action,
            lastUpdated: new Date().toISOString(),
          }));
          await callUserHandler("action_required", data);
        },
        history_snapshot: async (data) => {
          setServerState((prev) => ({
            ...prev,
            assets: data.assets,
            lastUpdated: new Date().toISOString(),
          }));
          await callUserHandler("history_snapshot", data);
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

  const submitAction = useCallback(
    (payload: VideoGenMessageEvent.SubmitActionPayload) => {
      sendEvent("submit_action", payload);
    },
    [sendEvent],
  );

  return {
    // Connection
    isConnected,
    agent,
    // Application State
    state: serverState,
    // Custom Event Sender
    sendEvent,
    submitAction,
    // chat integration
    chat,
    // server state
    serverState,
  };
}
