// import { and, eq } from "drizzle-orm";
// import {
//   type ConnectedAccountSelect,
//   connectedAccount,
// } from "./connected_account/connected_account.sql";
// import { createContext } from "./context";
// import { db } from "./drizzle";
// import { useTransaction } from "./drizzle/transaction";
// import { ErrorCodes, VisibleError } from "./error";
// import { type UserFlags, userTable } from "./user/user.sql";
// import { userWorkspaceTable } from "./user_workspace/user_workspace.sql";
// import { Log } from "./util/log";

// export namespace Actor {
//   export interface User {
//     type: "user";
//     properties: {
//       userID: string;
//       clientID: string; // currently just openpromo-www
//       email: string;
//     };
//   }

//   export interface WorkspaceUser {
//     type: "workspace_user";
//     properties: {
//       userID: string;
//       clientID: string;
//       email: string;
//       workspaceID: string;
//     };
//   }

//   export interface System {
//     type: "system";
//     properties: {
//       userID: string;
//     };
//   }

//   export interface Token {
//     type: "token";
//     properties: {
//       userID: string;
//       tokenID: string;
//     };
//   }

//   export interface Public {
//     type: "public";
//     // biome-ignore lint/complexity/noBannedTypes: TODO: fix later
//     properties: {};
//   }

//   export type Info = User | WorkspaceUser | Public | Token | System;

//   export const Context = createContext<Info>();

//   export function userID() {
//     const actor = Context.use();
//     if ("userID" in actor.properties) return actor.properties.userID;
//     throw new VisibleError(
//       "authentication",
//       ErrorCodes.Authentication.UNAUTHORIZED,
//       `You don't have permission to access this resource.`,
//     );
//   }
//   export function workspaceID() {
//     const actor = Context.use();
//     if (actor.type === "workspace_user") {
//       return actor.properties.workspaceID;
//     }
//     throw new VisibleError(
//       "authentication",
//       ErrorCodes.Authentication.UNAUTHORIZED,
//       `No workspace context set. User must select a workspace.`,
//     );
//   }

//   export function email(): string | import("drizzle-orm").SQLWrapper {
//     const actor = Context.use();
//     if ("email" in actor.properties) return actor.properties.email;
//     throw new VisibleError(
//       "authentication",
//       ErrorCodes.Authentication.UNAUTHORIZED,
//       `You don't have permission to access this resource.`,
//     );
//   }

//   export async function useConnectedAccounts(): Promise<
//     ConnectedAccountSelect[]
//   > {
//     // loads all connected accounts
//     const workspaceId = workspaceID();
//     const accounts = await db()
//       .select()
//       .from(connectedAccount)
//       .where(eq(connectedAccount.workspaceID, workspaceId));
//     return accounts;
//   }

//   // Assert user has access to workspace
//   /* Guard case: What if user know someone's workspace ID and try to directly access? */
//   export async function assertWorkspaceAccess(
//     workspaceId?: string,
//   ): Promise<void> {
//     const uid = userID();
//     const wid = workspaceId || workspaceID();

//     const hasAccess = await useTransaction(async (tx) => {
//       const membership = await tx
//         .select({ id: userWorkspaceTable.id })
//         .from(userWorkspaceTable)
//         .where(
//           and(
//             eq(userWorkspaceTable.userID, uid),
//             eq(userWorkspaceTable.workspaceID, wid),
//           ),
//         )
//         .then((rows) => rows.at(0));

//       return !!membership;
//     });

//     if (!hasAccess) {
//       throw new VisibleError(
//         "forbidden",
//         ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
//         `User does not have access to workspace ${wid}`,
//       );
//     }
//   }

//   export async function assertFlag(flag: keyof UserFlags) {
//     return useTransaction((tx) =>
//       tx
//         .select({ flags: userTable.flags })
//         .from(userTable)
//         .where(eq(userTable.id, userID()))
//         .then((rows) => {
//           const flags = rows[0]?.flags;
//           if (!flags)
//             throw new VisibleError(
//               "forbidden",
//               ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
//               `Actor does not have ${flag} flag`,
//             );
//         }),
//     );
//   }
//   export function use() {
//     try {
//       return Context.use();
//     } catch {
//       return { type: "public", properties: {} } as Public;
//     }
//   }

//   export function assert<T extends Info["type"]>(type: T) {
//     const actor = use();
//     if (actor.type !== type)
//       throw new VisibleError(
//         "authentication",
//         ErrorCodes.Authentication.UNAUTHORIZED,
//         `Actor is not "${type}"`,
//       );
//     return actor as Extract<Info, { type: T }>;
//   }

//   export function provide<
//     T extends Info["type"],
//     // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
//     Next extends (...args: any) => any,
//   >(type: T, properties: Extract<Info, { type: T }>["properties"], fn: Next) {
//     // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
//     return Context.provide({ type, properties } as any, () =>
//       Log.provide(
//         {
//           actor: type,
//           ...properties,
//         },
//         fn,
//       ),
//     );
//   }
// }
