import { Container } from "@cloudflare/containers";

// WIP: not ready yet for production
// turns out we really need more ergonomic stuff like modal
// to manage ffmpeg, etc.
export class ContainerBackend extends Container {
  defaultPort = 8080;
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

  async ping(): Promise<Response> {
    return await this.containerFetch("http://localhost:8080/");
  }
  async resizeVideo({
    videoUrl,
    width,
    height,
  }: {
    videoUrl: string;
    width: number;
    height: number;
  }): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentType: string;
    contentLength?: number;
    filename?: string;
  }> {
    const response = await this.containerFetch(
      "http://localhost:8080/video/resize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl, width, height }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Container resize failed (${response.status} ${response.statusText})${
          errorText ? ` - ${errorText}` : ""
        }`,
      );
    }

    const stream = response.body;
    if (!stream) {
      throw new Error(
        "Container resize response did not include a body stream",
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    const contentLengthHeader = response.headers.get("content-length");
    const parsedLength = contentLengthHeader
      ? Number.parseInt(contentLengthHeader, 10)
      : undefined;
    const contentLength = Number.isFinite(parsedLength ?? NaN)
      ? parsedLength
      : undefined;

    const disposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = disposition.match(
      /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
    );
    const filename = filenameMatch
      ? decodeURIComponent(filenameMatch[1] ?? filenameMatch[2] ?? "")
      : undefined;

    return {
      stream,
      contentType,
      contentLength,
      filename,
    };
  }
}
