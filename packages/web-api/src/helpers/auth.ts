import { WorkOS } from "@workos-inc/node";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";
import type { ApiEnv } from "../types";

export const WORKOS_SESSION_COOKIE_NAME = "wos-session";
export const AUTH_STATE_COOKIE_NAME = "wos-auth-state";

const DEFAULT_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
} satisfies Parameters<typeof setCookie>[3];

export const getWorkOS = () => {
  return new WorkOS(Resource.WORKOS_API_KEY.value, {
    clientId: Resource.WORKOS_CLIENT_ID.value,
  });
};

export function setSessionCookie(c: Context, sealedSession: string) {
  setCookie(
    c,
    WORKOS_SESSION_COOKIE_NAME,
    sealedSession,
    DEFAULT_COOKIE_OPTIONS,
  );
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, WORKOS_SESSION_COOKIE_NAME, {
    path: DEFAULT_COOKIE_OPTIONS.path,
  });
}

type AuthState = {
  nonce: string;
  returnTo?: string;
};

function serializeAuthState(state: AuthState): string {
  const params = new URLSearchParams();
  params.set("nonce", state.nonce);
  if (state.returnTo) params.set("returnTo", state.returnTo);
  return params.toString();
}

function deserializeAuthState(
  value: string | undefined,
): AuthState | undefined {
  if (!value) return undefined;
  try {
    const params = new URLSearchParams(value);
    const nonce = params.get("nonce") ?? undefined;
    if (!nonce) return undefined;
    const returnTo = params.get("returnTo") ?? undefined;
    return { nonce, returnTo };
  } catch {
    return undefined;
  }
}

export function setAuthStateCookie(
  c: Context,
  state: AuthState,
  options?: { maxAgeSeconds?: number },
) {
  setCookie(c, AUTH_STATE_COOKIE_NAME, serializeAuthState(state), {
    ...DEFAULT_COOKIE_OPTIONS,
    // 5 minutes should be enough for a single login attempt
    maxAge: options?.maxAgeSeconds ?? 300,
  });
}

export function getAuthState(c: Context): AuthState | undefined {
  const raw = getCookie(c, AUTH_STATE_COOKIE_NAME);
  return deserializeAuthState(raw);
}

export function clearAuthStateCookie(c: Context) {
  deleteCookie(c, AUTH_STATE_COOKIE_NAME, {
    path: DEFAULT_COOKIE_OPTIONS.path,
  });
}

/**
 * Asserts that the user object is present in the context
 * @param ctx - The context object.
 * @returns The user object.
 * @throws 401 if the user is not present.
 */
export function assertUser(ctx: Context<ApiEnv>) {
  const user = ctx.get("user");
  if (!user) {
    throw new HTTPException(401);
  }
  return user;
}

/**
 * Asserts that the organization ID is present in the context.
 * @param ctx - The context object.
 * @returns The organization ID.
 * @throws 401 if the organization ID is not present.
 */
export function assertOrg(ctx: Context<ApiEnv>) {
  const organizationId = ctx.get("organizationId");
  if (!organizationId) {
    throw new HTTPException(401);
  }
  return organizationId;
}
