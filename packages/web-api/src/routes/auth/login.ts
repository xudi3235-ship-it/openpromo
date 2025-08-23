import { Hono } from "hono";
import { Resource } from "sst";
import { getWorkOS, setAuthStateCookie } from "../../helpers/auth";

export const loginRoute = new Hono().get("/", (c) => {
  const workOS = getWorkOS();

  const returnTo = c.req.query("returnTo") ?? "/";

  const nonce = crypto.randomUUID();
  setAuthStateCookie(c, { nonce, returnTo });

  const authorizationUrl = workOS.userManagement.getAuthorizationUrl({
    provider: "authkit",
    redirectUri: `${Resource.Urls.site}/auth/callback`,
    clientId: Resource.WORKOS_CLIENT_ID.value,
    state: nonce,
  });

  return c.redirect(authorizationUrl);
});
