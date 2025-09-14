import { Actor, type ActorConfiguration } from "@cloudflare/actors";
import type { ApiEnv } from "./api-env";

export abstract class Pusher extends Actor<ApiEnv> {
  static upgradePath: string;

  static configuration(_request: Request): ActorConfiguration {
    return {
      sockets: {
        // biome-ignore lint/complexity/noThisInStatic: accessing static property from static method
        upgradePath: this.upgradePath,
        autoResponse: {
          ping: "ping",
          pong: "pong",
        },
      },
    };
  }

  protected onRequest(_request: Request): Promise<Response> {
    return Promise.resolve(Response.json({ message: "Hello, World!" }));
  }

  protected shouldUpgradeSocket(_request: Request): boolean {
    return true;
  }

  protected onWebSocketConnect(_ws: WebSocket, _request: Request) {
    console.log("Base Pusher: Socket connected");
  }

  protected onWebSocketDisconnect(_ws: WebSocket) {
    console.log("Socket disconnected");
  }

  protected onWebSocketMessage(ws: WebSocket, _message: unknown) {
    // Echo message back to everyone except the sender
    this.sockets.message("Received!", "*", [ws]);
  }
}
