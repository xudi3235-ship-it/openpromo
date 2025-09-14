import { Button } from "@openpromo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type WebSocketEvent = {
  type: string;
  message: string;
  timestamp: number;
  eventId?: string;
  doId?: string;
};

function PlaygroundPage() {
  const { workspaceSlug } = Route.useParams();
  const socketRef = useRef<WebSocket | null>(null);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");

  useEffect(() => {
    const socket = new WebSocket(
      `/api/workspaces/pusher?workspaceSlug=${workspaceSlug}`,
    );

    socketRef.current = socket;

    socket.onmessage = (event) => {
      console.info("WebSocket message received:", event.data);

      try {
        // Try to parse as JSON first
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
      } catch {
        // If not JSON, treat as plain text
        const textEvent: WebSocketEvent = {
          type: "text",
          message: event.data,
          timestamp: Date.now(),
        };
        setEvents((prev) => [...prev, textEvent]);
      }
    };

    socket.onopen = () => {
      console.info("WebSocket connected");
      setConnectionStatus("Connected");
      socket.send(
        JSON.stringify({
          type: "client_hello",
          message: "Hello from client",
          timestamp: Date.now(),
        }),
      );
    };

    socket.onclose = () => {
      console.info("WebSocket closed");
      setConnectionStatus("Disconnected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("Error");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [workspaceSlug]);

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">WebSocket Testing Playground</h3>
        <span
          className={`px-2 py-1 rounded text-sm ${
            connectionStatus === "Connected"
              ? "bg-green-100 text-green-800"
              : connectionStatus === "Connecting..."
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {connectionStatus}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(
                JSON.stringify({
                  type: "dummy",
                  message: "Test message from client",
                  timestamp: Date.now(),
                }),
              );
            } else {
              console.warn(
                "WebSocket is not open. Unable to send dummy event.",
              );
            }
          }}
        >
          Send Dummy Event
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
            {events.map((event, index) => (
              <div
                key={event.eventId || `${event.timestamp}-${index}`}
                className="p-2 bg-white rounded border text-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      event.type === "connection"
                        ? "bg-blue-100 text-blue-800"
                        : event.type === "periodic"
                          ? "bg-green-100 text-green-800"
                          : event.type === "dummy"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {event.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700">{event.message}</p>
                {event.eventId && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {event.eventId}
                  </p>
                )}
                {event.doId && (
                  <p className="text-xs text-gray-500">DO: {event.doId}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/playground",
)({
  component: PlaygroundPage,
});
