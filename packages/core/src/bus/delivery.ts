/** biome-ignore-all lint/suspicious/noExplicitAny: lib */
import type { Event } from "../event";

type UnionOf<T extends readonly any[]> = T[number];

export function createDeliveryHandler<
  const Events extends readonly Event.Definition[],
>(
  events: Events,
  onEvent: (
    evt: {
      [K in UnionOf<Events>["type"]]: Extract<
        UnionOf<Events>,
        { type: K }
      >["$payload"];
    }[UnionOf<Events>["type"]],
    req: Request,
  ) => Promise<Response> | Response,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST")
      return new Response("Method Not Allowed", { status: 405 });
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object")
      return new Response("Bad Request", { status: 400 });

    // Compile-time discrimination; runtime just trusts the bus payload shape
    const coerce =
      (events[0] as any).constructor?.coerce ?? ((_: any, x: any) => x);
    const typed = (coerce as any)(events as any, raw);

    // Optionally: reject if `typed.type` not in your union
    const types = new Set(events.map((e) => e.type));
    if (!types.has(typed.type))
      return new Response("Unknown type", { status: 400 });

    return onEvent(typed, req);
  };
}
