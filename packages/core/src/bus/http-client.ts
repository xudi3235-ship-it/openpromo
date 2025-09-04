import type { Event } from "./def";
export type HttpBusClientOptions = {
  baseUrl: string; // e.g. 'https://bus.example.com'
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
};

export function createHttpBusClient(opts: HttpBusClientOptions) {
  // biome-ignore lint/suspicious/noExplicitAny: lib
  async function post(path: string, body: any) {
    const headers = {
      "content-type": "application/json",
      ...(opts.getHeaders ? await opts.getHeaders() : {}),
    };
    const res = await fetch(new URL(path, opts.baseUrl).toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Bus ${path} failed ${res.status}: ${text}`);
    }
    return res.json().catch(() => ({}));
  }

  return {
    async publish<E extends Event.Definition>(
      def: E,
      properties: E["$input"],
      metadata?: E["$metadata"],
      topic?: string, // defaults to def.type
      eventId?: string, // optional
    ) {
      // biome-ignore lint/suspicious/noExplicitAny: lib
      const payload = await (def.create as any)(properties, metadata);
      return post("/publish", {
        topic: topic ?? def.type,
        eventId,
        payload,
      });
    },

    async subscribe(topic: string, subscriberId: string, endpoint: string) {
      return post("/subscribe", { topic, subscriberId, endpoint });
    },

    async unsubscribe(topic: string, subscriberId: string) {
      return post("/unsubscribe", { topic, subscriberId });
    },
  };
}
