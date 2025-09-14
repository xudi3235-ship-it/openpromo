import { useEffect } from "react";
export type WebSocketProps = {
  workspaceSlug: string;
};

export function WebSocketComponent({ workspaceSlug: _ }: WebSocketProps) {
  useEffect(() => {
    const socket = new WebSocket(`/api/workspaces/pusher`);

    socket.onmessage = (event) => {
      console.info(event.data);
    };
    socket.onopen = () => {
      console.info("WebSocket connected");
    };
    socket.onclose = () => {
      console.info("WebSocket closed");
    };

    return () => {
      socket.close();
    };
  }, []);

  return null;
}
