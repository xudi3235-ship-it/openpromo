import { getWorkOS } from "@core/providers";
import { env } from "@core/utils/env";
import type { OrganizationRole } from "@shared/workspace/auth";
import type {
  AuthenticateWithSessionCookieFailureReason,
  AuthenticateWithSessionCookieSuccessResponse,
  RefreshAndSealSessionDataFailureReason,
} from "@workos-inc/node";

export const WORKOS_SESSION_COOKIE_NAME = "wos-session";

export interface AuthenticateWithCookieOptions {
  cookie: string;
  withRefresh?: boolean;
  onRefreshSuccess?: (sealedSession: string) => void;
  onRefreshFailure?: (reason: RefreshAndSealSessionDataFailureReason) => void;
}

export type AuthenticationSuccessResult =
  AuthenticateWithSessionCookieSuccessResponse & {
    organizationId: string;
    role: OrganizationRole;
    email: string;
    featureFlags: string[];
  };

export interface AuthenticationFailedResult {
  authenticated: false;
  reason:
    | RefreshAndSealSessionDataFailureReason
    | AuthenticateWithSessionCookieFailureReason;
}

export type AuthenticationResult =
  | AuthenticationSuccessResult
  | AuthenticationFailedResult;

export async function authenticateWithCookie(
  options: AuthenticateWithCookieOptions,
): Promise<AuthenticationResult> {
  const {
    cookie,
    withRefresh = false,
    onRefreshSuccess = () => {},
    onRefreshFailure = () => {},
  } = options;

  const workOS = getWorkOS();

  const session = workOS.userManagement.loadSealedSession({
    sessionData: cookie,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });

  const result = await session.authenticate();

  if (result.authenticated) {
    return {
      ...result,
      organizationId: result.organizationId as string,
      role: result.role as OrganizationRole,
      email: result.user.email,
      featureFlags: result.featureFlags || [],
    };
  }

  if (withRefresh) {
    const refreshResult = await session.refresh();
    if (refreshResult.authenticated) {
      onRefreshSuccess(refreshResult.sealedSession as string);
      return {
        organizationId: refreshResult.organizationId as string,
        // @ts-expect-error
        role: refreshResult.role as OrganizationRole,
        email: refreshResult.user.email,
        featureFlags: refreshResult.featureFlags || [],
        ...refreshResult,
      };
    } else {
      onRefreshFailure(refreshResult.reason);
      return {
        authenticated: false,
        reason: refreshResult.reason,
      };
    }
  }

  return {
    authenticated: false,
    reason: result.reason,
  };
}
