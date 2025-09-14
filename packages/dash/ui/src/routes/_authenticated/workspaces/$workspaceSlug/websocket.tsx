import { useEffect } from "react";
export type WebSocketProps = {
  workspaceSlug: string;
};

export function WebSocketComponent({ workspaceSlug }: WebSocketProps) {
  useEffect(() => {
    const socket = new WebSocket(
      `/api/workspaces/pusher?workspaceSlug=${workspaceSlug}`,
    );

    socket.onmessage = (event) => {
      console.info("WebSocket message received:", event.data);
    };
    socket.onopen = () => {
      console.info("WebSocket connected");
      socket.send("Hello from client");
    };
    socket.onclose = () => {
      console.info("WebSocket closed");
    };

    return () => {
      socket.close();
    };
  }, [workspaceSlug]);

  return null;
}
