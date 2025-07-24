import { eq } from "drizzle-orm";
import { createContext } from "./context";
import { useTransaction } from "./drizzle/transaction";
import { UserFlags, userTable } from "./user/user.sql";
import { ErrorCodes, VisibleError } from "./error";
import { Log } from "./util/log";

export namespace Actor {
  export interface User {
    type: "user";
    properties: {
      userID: string;
      clientID: string;
      workspaceID: string;
    };
  }

  export interface System {
    type: "system";
    properties: {
      userID: string;
    };
  }

  export interface Token {
    type: "token";
    properties: {
      userID: string;
      tokenID: string;
    };
  }

  export interface Public {
    type: "public";
    properties: {};
  }

  export type Info = User | Public | Token | System;

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

  export async function assertFlag(flag: keyof UserFlags) {
    return useTransaction((tx) =>
      tx
        .select({ flags: userTable.flags })
        .from(userTable)
        .where(eq(userTable.id, userID()))
        .then((rows) => {
          const flags = rows[0]?.flags;
          if (!flags)
            throw new VisibleError(
              "forbidden",
              ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
              "Actor does not have " + flag + " flag",
            );
        }),
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
    Next extends (...args: any) => any,
  >(type: T, properties: Extract<Info, { type: T }>["properties"], fn: Next) {
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
