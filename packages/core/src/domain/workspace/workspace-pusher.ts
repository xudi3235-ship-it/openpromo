import { Pusher } from "@core/helpers/pusher";

export class WorkspacePusher extends Pusher {
  static override upgradePath = "/api/workspaces/pusher";

  protected onWebSocketConnect(ws: WebSocket, _request: Request) {
    console.log("Socket connected");

    ws.send(`id:${this.identifier?.toString() ?? ""}`);
  }
}
