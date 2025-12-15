import { VideoGenRealtime } from "@shared/agents";
import type { Connection } from "agents";
import type { UIMessage } from "ai";
import { WebSocketHandler } from "./websocket-handler";

/**
 * State synchronization and broadcasting utilities for video generation agent.
 *
 * Provides methods to broadcast state updates to all connected WebSocket clients
 * and sync state to newly connected clients.
 */
export namespace StateBroadcaster {
  /**
   * Broadcast application state to all active WebSocket connections.
   */
  export function broadcastState(
    connections: WebSocket[],
    state: VideoGenRealtime.ServerAppState,
  ): void {
    for (const conn of connections) {
      VideoGenRealtime.sendEvent(conn as Connection, "sync_state", {
        state,
      });
    }
  }

  /**
   * Sync initial state to a newly connected client.
   * Includes both application state and chat message history.
   */
  export function syncToNewConnection(
    connection: Connection,
    state: VideoGenRealtime.ServerAppState,
    messages: UIMessage[],
  ): void {
    // Sync chat messages
    WebSocketHandler.syncChatMessages(connection, messages);

    // Sync application state
    VideoGenRealtime.sendEvent(connection, "sync_state", {
      state,
    });
  }
}
