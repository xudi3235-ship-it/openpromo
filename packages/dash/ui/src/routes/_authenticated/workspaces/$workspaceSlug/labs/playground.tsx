/** biome-ignore-all lint/suspicious/noConsole: test */
import { Button } from "@openpromo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { InstantAdChat } from "@/components/instant-ad-chat/instant-ad-chat";
import { AgentChatPanel } from "@/components/labs/AgentChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceWebSocket } from "@/hooks/useWorkspaceWebSocket";
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
  const [activeTab, setActiveTab] = useState<
    "websocket" | "agent-chat" | "instant-ad"
  >("websocket");

  // Use the shared WebSocket connection from the provider
  const { status, subscribe, refreshNotifications } = useWorkspaceWebSocket();

  // Subscribe to raw WebSocket messages for debugging
  useEffect(() => {
    const unsubscribe = subscribe((wsEvent) => {
      // Store all messages for debugging - wsEvent is already typed as WorkspaceEvent
      const event: WebSocketEvent = {
        ...wsEvent,
        type: wsEvent.type,
        message:
          "message" in wsEvent && typeof wsEvent.message === "string"
            ? wsEvent.message
            : undefined,
        timestamp: wsEvent.timestamp ?? Date.now(),
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
      default:
        return "Error";
    }
  }, [status]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Testing Playground</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("websocket")}
            className={`px-4 py-2 rounded ${
              activeTab === "websocket"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            WebSocket
          </button>
          <button
            onClick={() => setActiveTab("agent-chat")}
            className={`px-4 py-2 rounded ${
              activeTab === "agent-chat"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Agent Chat
          </button>
          <button
            onClick={() => setActiveTab("instant-ad")}
            className={`px-4 py-2 rounded ${
              activeTab === "instant-ad"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Instant Ad Chat
          </button>
        </div>
      </div>

      {activeTab === "websocket" && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">WebSocket Testing</h4>
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
                            event.type === "connection" ||
                            event.type === "connect"
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
                        <p className="text-xs text-gray-500">
                          DO: {event.doId}
                        </p>
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
        </>
      )}

      {activeTab === "agent-chat" && (
        <Suspense fallback={<div>Loading Agent Chat...</div>}>
          <AgentChatPanel userId={user?.id} />
        </Suspense>
      )}

      {activeTab === "instant-ad" && (
        <div className="h-[calc(100vh-12rem)]">
          <InstantAdChat
            products={[]}
            presets={[]}
            styles={[]}
            onGenerate={(request) => {
              console.log("Generating ad:", request);
            }}
          />
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/playground",
)({
  component: PlaygroundPage,
});
