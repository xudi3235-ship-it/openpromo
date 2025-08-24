import { zValidator } from "@hono/zod-validator";
import { ErrorCodes, VisibleError } from "@openpromo/core/error";
import { Hono } from "hono";
import { Resource } from "sst";
import { z } from "zod";
import { getWorkOS, setSessionCookie } from "../../helpers/auth";
import type { ApiEnv } from "../../types";

const sendPinSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const verifyPinSchema = z.object({
  email: z.email("Please enter a valid email address"),
  code: z.string().length(6, "Please enter the verification code"),
});

export const magicAuthRoute = new Hono<ApiEnv>()
  .post("/send", zValidator("json", sendPinSchema), async (c) => {
    const { email } = c.req.valid("json");
    const workOS = getWorkOS();
    // send OTP
    const magicAuth = await workOS.userManagement.createMagicAuth({
      email,
    });

    return c.json({
      success: true,
      message: "Pin code sent to your email",
      magicAuthId: magicAuth.id,
    });
  })
  // Verify OTP code endpoint
  .post("/verify", zValidator("json", verifyPinSchema), async (c) => {
    const { email, code } = c.req.valid("json");
    const workOS = getWorkOS();

    // Get client IP and user agent for security
    const ipAddress =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    const { user, sealedSession } =
      await workOS.userManagement.authenticateWithMagicAuth({
        clientId: Resource.WORKOS_CLIENT_ID.value,
        code,
        email,
        ipAddress,
        userAgent,
        session: {
          sealSession: true,
          cookiePassword: Resource.WORKOS_COOKIE_PASSWORD.value,
        },
      });

    if (!user || !sealedSession) {
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.INVALID_TOKEN,
        "Invalid or expired verification code",
      );
    }

    setSessionCookie(c, sealedSession);

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      message: "Successfully authenticated",
    });
  });
