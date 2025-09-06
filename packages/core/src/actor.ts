import * as z from "zod";
import type { OrganizationRole } from "./domain/workspace/auth";
import { ErrorCodes, VisibleError } from "./error";
import { createContext } from "./helpers/context";
import { Log } from "./util/log";

export namespace Actor {
  export const UserSchema = z.object({
    type: z.literal("user"),
    properties: z.object({
      userID: z.string(),
      email: z.email(),
      organizationID: z.string(),
      role: z.custom<OrganizationRole>(),
    }),
  });

  export const WorkspaceUserSchema = z.object({
    type: z.literal("workspace_user"),
    properties: z.object({
      userID: z.string(),
      email: z.email(),
      organizationID: z.string(),
      role: z.custom<OrganizationRole>(),
      workspaceID: z.string(),
      workspaceSlug: z.string(),
    }),
  });

  export const SystemSchema = z.object({
    type: z.literal("system"),
    properties: z.object({
      userID: z.string(),
    }),
  });

  export const PublicSchema = z.object({
    type: z.literal("public"),
    properties: z.object({}),
  });

  export const InfoSchema = z.union([
    UserSchema,
    WorkspaceUserSchema,
    SystemSchema,
    PublicSchema,
  ]);

  // Type inference from schemas
  export type User = z.infer<typeof UserSchema>;
  export type WorkspaceUser = z.infer<typeof WorkspaceUserSchema>;
  export type System = z.infer<typeof SystemSchema>;
  export type Public = z.infer<typeof PublicSchema>;
  export type Info = z.infer<typeof InfoSchema>;

  export const Context = createContext<Info>();

  export function userID() {
    const actor = Context.use();
    if ("userID" in actor.properties) return actor.properties.userID;
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `You don't have permission to access this resource.`,
    );
  }

  export function workspaceID() {
    const actor = Context.use();
    if (actor.type === "workspace_user") {
      return actor.properties.workspaceID;
    }
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `No workspace context set. User must select a workspace.`,
    );
  }

  export function workspaceSlug() {
    const actor = Context.use();
    if (actor.type === "workspace_user") {
      return actor.properties.workspaceSlug;
    }
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `No workspace context set. User must select a workspace.`,
    );
  }

  export function email(): string | import("drizzle-orm").SQLWrapper {
    const actor = Context.use();
    if ("email" in actor.properties) return actor.properties.email;
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `You don't have permission to access this resource.`,
    );
  }

  export function use() {
    try {
      return Context.use();
    } catch {
      return { type: "public", properties: {} } as Public;
    }
  }

  export function assert<T extends Info["type"]>(type: T) {
    const actor = use();
    if (actor.type !== type)
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.UNAUTHORIZED,
        `Actor is not "${type}"`,
      );
    return actor as Extract<Info, { type: T }>;
  }

  export function provide<
    T extends Info["type"],
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    Next extends (...args: any) => any,
  >(type: T, properties: Extract<Info, { type: T }>["properties"], fn: Next) {
    // Validate the actor data before providing it
    const actorData = { type, properties };
    const validatedActor = InfoSchema.parse(actorData);
    const enableLog = process.env.DEBUG === "true";

    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    return Context.provide(validatedActor as any, () =>
      enableLog
        ? Log.provide(
            {
              actor: type,
              ...properties,
            },
            fn,
          )
        : fn(),
    );
  }

  // Helper function to create validated actors
  export function create<T extends Info["type"]>(
    type: T,
    properties: Extract<Info, { type: T }>["properties"],
  ): Extract<Info, { type: T }> {
    const actorData = { type, properties };
    return InfoSchema.parse(actorData) as Extract<Info, { type: T }>;
  }

  // Helper function to validate actor data at runtime
  export function validate(data: unknown): Info {
    return InfoSchema.parse(data);
  }
}
