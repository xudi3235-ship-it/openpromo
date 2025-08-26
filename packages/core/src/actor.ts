import { createContext } from "./context";
import { ErrorCodes, VisibleError } from "./error";
import { Log } from "./util/log";
import type { OrganizationRole } from "./workspace/auth";

export namespace Actor {
  export interface User {
    type: "user";
    properties: {
      userID: string;
      email: string;
      organizationID: string;
      role: OrganizationRole;
    };
  }
  export interface WorkspaceUser {
    type: "workspace_user";
    properties: {
      userID: string;
      email: string;
      organizationID: string;
      role: OrganizationRole;
      workspaceID: string; // scoped to workspace
      workspaceSlug: string;
    };
  }

  export interface System {
    type: "system";
    properties: {
      userID: string;
    };
  }

  export interface Public {
    type: "public";
    // biome-ignore lint/complexity/noBannedTypes: TODO: fix later
    properties: {};
  }

  export type Info = User | WorkspaceUser | Public | System;

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
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    return Context.provide({ type, properties } as any, () =>
      Log.provide(
        {
          actor: type,
          ...properties,
        },
        fn,
      ),
    );
  }
}
