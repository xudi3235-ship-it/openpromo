import { getWorkOS } from "@core/providers/workos";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import { setAuthStateCookie } from "../../helpers/auth";

export const loginRoute = new Hono().get("/", (c) => {
  const workOS = getWorkOS();

  const returnTo = c.req.query("returnTo") ?? "/";

  const nonce = crypto.randomUUID();
  setAuthStateCookie(c, { nonce, returnTo });

  const authorizationUrl = workOS.userManagement.getAuthorizationUrl({
    provider: "authkit",
    redirectUri: `${env.DASHBOARD_URL}/auth/callback`,
    clientId: env.WORKOS_CLIENT_ID,
    state: nonce,
  });

  return c.redirect(authorizationUrl);
});
