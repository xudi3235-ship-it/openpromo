import { cn } from "@openpromo/ui/lib/utils";
import { useWorkspaceWebSocket } from "@/hooks/useWorkspaceWebSocket";

/**
 * Minimal WebSocket connection status indicator
 * Shows a small colored dot based on connection state
 */
export function WebSocketStatusIndicator() {
  const { status } = useWorkspaceWebSocket();

  const statusConfig = {
    open: {
      color: "bg-green-500",
      label: "Connected",
    },
    connecting: {
      color: "bg-yellow-500",
      label: "Connecting...",
    },
    closing: {
      color: "bg-orange-500",
      label: "Closing",
    },
    closed: {
      color: "bg-gray-400",
      label: "Disconnected",
    },
    error: {
      color: "bg-red-500",
      label: "Error",
    },
  } as const;

  const config = statusConfig[status];

  return (
    <div
      className="flex items-center justify-center shrink-0"
      title={`WebSocket: ${config.label}`}
    >
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full transition-colors",
          config.color,
          status === "connecting" && "animate-pulse",
        )}
      />
    </div>
  );
}
