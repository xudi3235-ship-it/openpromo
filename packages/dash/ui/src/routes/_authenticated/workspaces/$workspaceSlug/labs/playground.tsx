import { Button } from "@openpromo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceNotifications } from "@/hooks/useWorkspaceNotifications";
import { useHonoMutation } from "@/lib/hono-client";

type WebSocketEvent = {
  type: string;
  message?: string;
  timestamp: number;
  eventId?: string;
  doId?: string;
  [key: string]: unknown;
};

function PlaygroundPage() {
  const { workspaceSlug } = Route.useParams();
  const { data: user } = useAuth();
  const [events, setEvents] = useState<WebSocketEvent[]>([]);

  const { status, subscribe, sendJson, refreshNotifications } =
    useWorkspaceNotifications(workspaceSlug, {
      autoToast: true,
    });

  // Subscribe to raw WebSocket messages for debugging
  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      // Store all messages for debugging
      const event: WebSocketEvent = {
        type:
          typeof data === "object" &&
          data !== null &&
          "type" in data &&
          typeof data.type === "string"
            ? data.type
            : "unknown",
        message:
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : undefined,
        timestamp:
          typeof data === "object" &&
          data !== null &&
          "timestamp" in data &&
          typeof data.timestamp === "number"
            ? data.timestamp
            : Date.now(),
        ...(typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)
          : {}),
      };
      setEvents((prev) => [...prev, event]);
    });

    return unsubscribe;
  }, [subscribe]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const sendMessageMutation = useHonoMutation({
    mutationFn: (api, variables: { userId: string; message: string }) =>
      api.workspaces[":workspaceSlug"].pusher.message[":userId"].$post({
        param: { workspaceSlug, userId: variables.userId },
        json: { message: variables.message },
      }),
  });

  const sendTestNotificationMutation = useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].notifications.test.$post({
        param: { workspaceSlug },
      }),
    onSuccess: () => {
      void refreshNotifications();
    },
  });

  const connectionStatusLabel = useMemo(() => {
    switch (status) {
      case "open":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "closing":
        return "Closing";
      case "closed":
        return "Disconnected";
      case "error":
      default:
        return "Error";
    }
  }, [status]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">WebSocket Testing Playground</h3>
        <span
          className={`px-2 py-1 rounded text-sm ${
            connectionStatusLabel === "Connected"
              ? "bg-green-100 text-green-800"
              : connectionStatusLabel === "Connecting..."
                ? "bg-yellow-100 text-yellow-800"
                : connectionStatusLabel === "Closing"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-red-100 text-red-800"
          }`}
        >
          {connectionStatusLabel}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            const sent = sendJson({
              type: "dummy",
              message: "Test message from client",
              timestamp: Date.now(),
            });

            if (!sent) {
              console.warn(
                "WebSocket is not open. Unable to send dummy event.",
              );
            }
          }}
          disabled={status !== "open"}
        >
          Send Dummy Event
        </Button>

        <Button
          onClick={() => {
            if (user?.id) {
              sendMessageMutation.mutate({
                userId: user.id,
                message: JSON.stringify({
                  type: "server_to_user",
                  message: `Server push to user ${user.id}`,
                  timestamp: Date.now(),
                }),
              });
            }
          }}
          disabled={!user?.id || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending
            ? "Sending..."
            : "Test Server Push (Current User)"}
        </Button>

        <Button
          onClick={() => {
            sendMessageMutation.mutate({
              userId: "all",
              message: JSON.stringify({
                type: "server_to_all",
                message: "Server push to all users in workspace",
                timestamp: Date.now(),
              }),
            });
          }}
          disabled={sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending
            ? "Sending..."
            : "Test Server Push (All Users)"}
        </Button>
        <Button
          onClick={() => {
            sendTestNotificationMutation.mutate(undefined);
          }}
          disabled={sendTestNotificationMutation.isPending}
        >
          {sendTestNotificationMutation.isPending
            ? "Dispatching..."
            : "Send Dummy Notification"}
        </Button>

        <Button variant="outline" onClick={clearEvents}>
          Clear Events
        </Button>
      </div>

      <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
        <h4 className="font-medium mb-2">Events ({events.length})</h4>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No events received yet...</p>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => {
              return (
                <div
                  key={event.eventId || `${event.timestamp}-${index}`}
                  className="p-2 bg-white rounded border text-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        event.type === "connection" || event.type === "connect"
                          ? "bg-blue-100 text-blue-800"
                          : event.type === "periodic"
                            ? "bg-green-100 text-green-800"
                            : event.type === "dummy"
                              ? "bg-purple-100 text-purple-800"
                              : event.type === "server_to_user"
                                ? "bg-orange-100 text-orange-800"
                                : event.type === "server_to_all"
                                  ? "bg-red-100 text-red-800"
                                  : event.type === "session_evicted"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : event.type === "notification"
                                      ? "bg-indigo-100 text-indigo-800"
                                      : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-gray-700">{event.message}</p>
                  )}
                  {event.eventId && (
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {event.eventId}
                    </p>
                  )}
                  {event.doId && (
                    <p className="text-xs text-gray-500">DO: {event.doId}</p>
                  )}
                  <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs mt-2">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/playground",
)({
  component: PlaygroundPage,
});
