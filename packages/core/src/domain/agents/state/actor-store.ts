import { Actor } from "@core/helpers/actor";
import type { AgentContext } from "agents";

/**
 * Manages actor (workspace user) persistence for Durable Object agents.
 *
 * Provides in-memory caching and durable storage for actor context,
 * enabling async context propagation for agent operations.
 */
export class ActorStore {
  private cache: Actor.WorkspaceUser | null = null;
  private readonly key = "actor";

  constructor(private ctx: AgentContext) {}

  /**
   * Retrieve the stored actor, using cache if available.
   */
  async get(): Promise<Actor.WorkspaceUser | null> {
    if (this.cache) return this.cache;
    const storedActor = await this.ctx.storage.get(this.key);
    if (!storedActor) return null;
    this.cache = storedActor as Actor.WorkspaceUser;
    return this.cache;
  }

  /**
   * Persist the actor to both cache and durable storage.
   */
  async set(actor: Actor.WorkspaceUser) {
    this.cache = actor;
    await this.ctx.storage.put(this.key, actor);
  }

  /**
   * Execute a function within the actor's async context.
   * Throws if actor is not set.
   */
  async withContext<T>(fn: () => Promise<T>): Promise<T> {
    const actor = await this.get();
    if (!actor) throw new Error("Actor not set on VideoGenAgent");
    return Actor.provide("workspace_user", actor.properties, fn);
  }
}
