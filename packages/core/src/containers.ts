import { Container } from "@cloudflare/containers";
import type { Client } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  ContainerService,
  type PingResponse,
  type ResizeVideoResponse,
} from "./containers/gen/containers/v1/container_pb";

// WIP: not ready yet for production
// turns out we really need more ergonomic stuff like modal
// to manage ffmpeg, etc.
export class ContainerBackend extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = "60s";
  envVars = {
    MESSAGE: "I was passed in via the container class!",
    ...process.env,
  };

  override onStart() {
    console.log("Container successfully started");
  }

  override onStop() {
    console.log("Container successfully shut down");
  }

  override onError(error: unknown) {
    console.log("Container error:", JSON.stringify(error));
  }
  /**
   * RPC calls via connect-rpc to our go backend
   */
  async ping(): Promise<PingResponse> {
    const c = await this.getClient();
    return await c.ping({});
  }

  private client?: Client<typeof ContainerService>;

  private async getClient() {
    if (!this.client) {
      const transport = createConnectTransport({
        baseUrl: "http://localhost:8080",
        // Worker fetch is provided by the container runtime
        fetch: (input, init) =>
          this.containerFetch(input, {
            ...init,
            redirect: "manual",
          }),
        useBinaryFormat: false,
      });
      this.client = createClient(ContainerService, transport);
    }
    await this.startAndWaitForPorts(this.defaultPort);
    return this.client;
  }

  async resizeVideo({
    videoUrl,
    width,
    height,
  }: {
    videoUrl: string;
    width: number;
    height: number;
  }): Promise<ResizeVideoResponse> {
    const client = await this.getClient();
    return await client.resizeVideo({
      videoUrl,
      width,
      height,
    });
  }
}
