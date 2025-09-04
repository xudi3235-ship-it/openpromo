// src/cf-bus/publisher.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: lib */
import type { Event } from "../event";

export type CfBusEnv = {
  TopicActor: DurableObjectNamespace;
};

export type PublishOptions = {
  topic?: string; // defaults to event.type
  eventId?: string; // defaults to crypto.randomUUID()
};

export function createCfPublisher(env: CfBusEnv) {
  async function publish<E extends Event.Definition>(
    def: E,
    properties: E["$input"],
    metadata?: E["$metadata"],
    opts?: PublishOptions,
  ) {
    const topic = opts?.topic ?? def.type;
    const id = env.TopicActor.idFromName(topic);
    // The TopicActor is in the same Worker; call its RPC method directly.
    const stub: any = env.TopicActor.get(id);
    const payload = await (def.create as any)(properties, metadata);
    const eventId = opts?.eventId ?? crypto.randomUUID();
    // TopicActor.publish(eventId: string, payload: unknown)
    return stub.publish(eventId, payload);
  }

  async function subscribe(
    topic: string,
    subscriberId: string,
    endpoint: string,
  ) {
    const id = env.TopicActor.idFromName(topic);
    const stub: any = env.TopicActor.get(id);
    return stub.subscribe(subscriberId, endpoint);
  }

  async function unsubscribe(topic: string, subscriberId: string) {
    const id = env.TopicActor.idFromName(topic);
    const stub: any = env.TopicActor.get(id);
    return stub.unsubscribe(subscriberId);
  }

  return { publish, subscribe, unsubscribe };
}
