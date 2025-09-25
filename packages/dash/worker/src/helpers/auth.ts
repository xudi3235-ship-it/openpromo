import type { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { WORKOS_SESSION_COOKIE_NAME } from "@openpromo/core/helpers/auth";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { AppError } from "./error";

export { WORKOS_SESSION_COOKIE_NAME };
export const AUTH_STATE_COOKIE_NAME = "wos-auth-state";

const DEFAULT_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
} satisfies Parameters<typeof setCookie>[3];

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
  actor?: Actor.WorkspaceUser;
  codeVerifier?: string;
};

function serializeAuthState(state: AuthState): string {
  const params = new URLSearchParams();
  params.set("nonce", state.nonce);
  if (state.returnTo) params.set("returnTo", state.returnTo);
  if (state.actor) params.set("actor", JSON.stringify(state.actor));
  if (state.codeVerifier) params.set("codeVerifier", state.codeVerifier);
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
    const actorStr = params.get("actor") ?? undefined;
    const actor = actorStr
      ? (JSON.parse(actorStr) as Actor.WorkspaceUser)
      : undefined;
    const codeVerifier = params.get("codeVerifier") ?? undefined;

    return { nonce, returnTo, actor, codeVerifier };
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
 * @throws 500 if the user is not present.
 */
export function assertUser(ctx: Context<ApiEnv>) {
  const user = ctx.get("user");
  if (!user) {
    throw new AppError(500, {
      message: "Assertion failed: user is not present in context",
    });
  }
  return user;
}

/**
 * Asserts that the organization ID is present in the context.
 * @param ctx - The context object.
 * @returns The organization ID.
 * @throws 500 if the organization ID is not present.
 */
export function assertOrg(ctx: Context<ApiEnv>) {
  const organizationId = ctx.get("organizationId");
  if (!organizationId) {
    throw new AppError(500, {
      message: "Assertion failed: organizationId is not present in context",
    });
  }
  return organizationId;
}
