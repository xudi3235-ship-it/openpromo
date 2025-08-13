import { WorkOS } from "@workos-inc/node";
import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { Resource } from "sst";
import type { MyEnv } from "@/types";

export const WORKOS_SESSION_COOKIE_NAME = "wos-session";

export const getWorkOS = () => {
  return new WorkOS(Resource.WORKOS_API_KEY.value, {
    clientId: Resource.WORKOS_CLIENT_ID.value,
  });
};

export function setSessionCookie(c: Context<MyEnv>, sealedSession: string) {
  setCookie(c, WORKOS_SESSION_COOKIE_NAME, sealedSession, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
}
