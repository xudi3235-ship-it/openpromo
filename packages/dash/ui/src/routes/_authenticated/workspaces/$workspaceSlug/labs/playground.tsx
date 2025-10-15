import { Button } from "@openpromo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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

  const { status, events, sendJson, clearEvents } = useWorkspaceNotifications(
    workspaceSlug,
    {
      autoToast: true,
    },
  );

  const sendMessageMutation = useHonoMutation({
    mutationFn: (api, variables: { userId: string; message: string }) =>
      api.workspaces[":workspaceSlug"].pusher.message[":userId"].$post({
        param: { workspaceSlug, userId: variables.userId },
        json: { message: variables.message },
      }),
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
              const normalized: WebSocketEvent = {
                // @ts-expect-error
                type: event.type,
                // @ts-expect-error
                message:
                  typeof event.message === "string" ? event.message : undefined,
                // @ts-expect-error
                timestamp: event.timestamp,
                eventId:
                  typeof event.eventId === "string" ? event.eventId : undefined,
                doId: typeof event.doId === "string" ? event.doId : undefined,
                ...event,
              };

              return (
                <div
                  key={normalized.eventId || `${normalized.timestamp}-${index}`}
                  className="p-2 bg-white rounded border text-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        normalized.type === "connection" ||
                        normalized.type === "connect"
                          ? "bg-blue-100 text-blue-800"
                          : normalized.type === "periodic"
                            ? "bg-green-100 text-green-800"
                            : normalized.type === "dummy"
                              ? "bg-purple-100 text-purple-800"
                              : normalized.type === "server_to_user"
                                ? "bg-orange-100 text-orange-800"
                                : normalized.type === "server_to_all"
                                  ? "bg-red-100 text-red-800"
                                  : normalized.type === "session_evicted"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : normalized.type === "notification"
                                      ? "bg-indigo-100 text-indigo-800"
                                      : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {normalized.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(normalized.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {normalized.message && (
                    <p className="text-gray-700">{normalized.message}</p>
                  )}
                  {normalized.eventId && (
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {normalized.eventId}
                    </p>
                  )}
                  {normalized.doId && (
                    <p className="text-xs text-gray-500">
                      DO: {normalized.doId}
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
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/playground",
)({
  component: PlaygroundPage,
});
