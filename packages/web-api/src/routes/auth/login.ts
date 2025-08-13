import { Hono } from "hono";
import { Resource } from "sst";
import { getWorkOS } from "@/helpers/workos";
import type { MyEnv } from "@/types";

export const loginRoute = new Hono<MyEnv>().get("/", (c) => {
  const workOS = getWorkOS();

  const returnTo = c.req.query("returnTo") ?? "/";

  const authorizationUrl = workOS.userManagement.getAuthorizationUrl({
    provider: "authkit",
    redirectUri: `${Resource.Urls.site}/auth/callback`,
    clientId: Resource.WORKOS_CLIENT_ID.value,
    state: new URLSearchParams({ returnTo }).toString(),
  });

  return c.redirect(authorizationUrl);
});
