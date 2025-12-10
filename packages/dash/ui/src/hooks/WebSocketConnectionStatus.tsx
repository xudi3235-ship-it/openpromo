import type React from "react";
import { useWorkspaceWebSocket } from "./useWorkspaceWebSocket";

/**
 * Simple connection status indicator for workspace WebSocket
 * Shows a subtle indicator when connection is lost
 */
export function WebSocketConnectionStatus() {
  const { status } = useWorkspaceWebSocket();

  // Only show when there's an issue
  if (status === "open" || status === "connecting") {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case "closed":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "closing":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "closed":
        return "Disconnected";
      case "error":
        return "Connection error";
      case "closing":
        return "Disconnecting";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {status !== "closing" && (
        <button
          onClick={() => window.location.reload()}
          className="text-blue-500 hover:text-blue-700 underline"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
