import { Container } from "@cloudflare/containers";
// TODO: use this codegen
// import { GreetService } from "./containers/gen/greet/v1/greet_pb";

export class ContainerBackend extends Container {
  defaultPort = 8080;
  sleepAfter = "3s";
  envVars = {
    MESSAGE: "I was passed in via the container class!",
    ...process.env,
    // R2 credentials
    ACCESS_KEY_ID: "TODO",
    SECRET_ACCESS_KEY: "TODO",
    BUCKET_NAME: "TODO",
    CLOUDFLARE_ACCOUNT_ID: "TODO",
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

  async ping(): Promise<Response> {
    return await this.containerFetch("http://localhost:8080/");
    // await this.startAndWaitForPorts();
    // // await this.ctx.container?.start();
    // const res = await this.containerFetch(
    //   "http://0.0.0.0:8080/greet.v1.GreetService/Greet",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ name: "Jane" }),
    //   },
    // );
    // await this.stop();
    // return res;
  }
}
