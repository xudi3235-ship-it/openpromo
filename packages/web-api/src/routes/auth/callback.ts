import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";
import { getWorkOS, setSessionCookie } from "@/helpers/workos";
import type { MyEnv } from "@/types";

export const callbackRoute = new Hono<MyEnv>().get("/", async (c) => {
  const workOS = getWorkOS();

  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code) {
    throw new HTTPException(400, { message: "Missing code" });
  }

  try {
    const authenticatedUser = await workOS.userManagement.authenticateWithCode({
      code,
      clientId: Resource.WORKOS_CLIENT_ID.value,
      session: {
        sealSession: true,
        cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
      },
    });

    const { sealedSession } = authenticatedUser;

    if (!sealedSession) {
      throw new Error("No sealed session");
    }

    setSessionCookie(c, sealedSession);

    // Default to homepage if no state/returnTo
    let returnToPath = `${Resource.Urls.site}`;
    if (state) {
      try {
        const params = new URLSearchParams(state);
        const candidate = params.get("returnTo") ?? undefined;
        if (candidate?.startsWith("/")) {
          returnToPath += candidate;
        }
      } catch {
        // ignore malformed state
      }
    }

    return c.redirect(returnToPath);
  } catch (error) {
    console.error(error);
    return c.redirect(`${Resource.Urls.site}/login`);
  }
});
