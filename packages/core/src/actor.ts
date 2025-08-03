import { and, eq } from "drizzle-orm";
import { createContext } from "./context";
import { useTransaction } from "./drizzle/transaction";
import { UserFlags, userTable } from "./user/user.sql";
import { ErrorCodes, NotImplementedError, VisibleError } from "./error";
import { Log } from "./util/log";
import {
    connectedAccount,
    ConnectedAccountSelect,
    Platform,
} from "./connected_account/connected_account.sql";
import { db } from "./drizzle";

export namespace Actor {
    export interface User {
        type: "user";
        properties: {
            userID: string;
            clientID: string;
            email: string;
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
    export function workspaceID() {
        const actor = Context.use();
        if ("workspaceID" in actor.properties) return actor.properties.workspaceID;
        throw new VisibleError(
            "authentication",
            ErrorCodes.Authentication.UNAUTHORIZED,
            `You don't have permission to access this resource.`,
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

    export async function useConnectedAccounts(): Promise<ConnectedAccountSelect[]> {
        // loads all connected accounts
        const workspaceId = workspaceID();
        const accounts = await db
            .select()
            .from(connectedAccount)
            .where(eq(connectedAccount.workspaceID, workspaceId));
        return accounts;
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

    export function provide<T extends Info["type"], Next extends (...args: any) => any>(
        type: T,
        properties: Extract<Info, { type: T }>["properties"],
        fn: Next,
    ) {
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
