import { VideoGenRealtime } from "@shared/agents";
import type { Connection, WSMessage } from "agents";
import { MessageType as CfAgentMessageType } from "agents/ai-types";
import type { UIMessage } from "ai";

/**
 * WebSocket message handling utilities for video generation agent.
 *
 * Provides type-safe message routing and event processing using
 * the VideoGenRealtime protocol.
 */
export namespace WebSocketHandler {
  /**
   * Event handlers for WebSocket messages
   */
  export interface EventHandlers {
    onSetInput: (data: VideoGenRealtime.Input) => Promise<void>;
    onStartPipeline: (data: { input: VideoGenRealtime.Input }) => Promise<void>;
    onResetState: () => Promise<void>;
  }

  /**
   * Process incoming WebSocket message and route to appropriate handler.
   */
  export async function handleMessage(
    _connection: Connection,
    message: WSMessage,
    handlers: EventHandlers,
  ): Promise<void> {
    if (typeof message !== "string") {
      console.warn(
        `[WebSocketHandler] Received non-string message, ignoring:`,
        message,
      );
      return;
    }

    await VideoGenRealtime.onEvent(message, {
      set_input: async (data) => {
        await handlers.onSetInput(data);
      },
      start_pipeline: async (data) => {
        console.log(`[WebSocketHandler] start_pipeline:`, data);
        await handlers.onStartPipeline(data);
      },
      reset_state: async () => {
        console.log(`[WebSocketHandler] reset_state requested`);
        await handlers.onResetState();
      },
    });
  }

  /**
   * Sync chat messages to a newly connected client.
   */
  export function syncChatMessages(
    connection: Connection,
    messages: UIMessage[],
  ): void {
    if (messages.length === 0) return;
    console.log(
      `[WebSocketHandler] Syncing ${messages.length} messages to connection`,
    );
    connection.send(
      JSON.stringify({
        type: CfAgentMessageType.CF_AGENT_CHAT_MESSAGES,
        messages: messages,
      }),
    );
  }
}
