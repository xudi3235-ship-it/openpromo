import { Container } from "@cloudflare/containers";

export class ContainerBackend extends Container {
  defaultPort = 8080;
  sleepAfter = "10s";
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
    console.log("Container error:", error);
  }

  async ping(): Promise<Response> {
    const res = await this.containerFetch("http://localhost:8080");
    return res;
  }
}
