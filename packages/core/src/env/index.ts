import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URL: z.string().min(1),
    ADMIN_API_TOKEN: z.string().min(1),
    FACEBOOK_APP_ID: z.string().min(1),
    FACEBOOK_APP_SECRET: z.string().min(1),
    FACEBOOK_REDIRECT_URI: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    WORKOS_CLIENT_ID: z.string().min(1),
    WORKOS_API_KEY: z.string().min(1),
    WORKOS_COOKIE_PASSWORD: z.string().min(1),
    NEON_API_KEY: z.string().min(1),
    NEON_PROJECT_ID: z.string().min(1),
    LIQUID_API_URL: z.string().min(1),
    CLOUDFLARE_API_TOKEN: z.string().min(1),
    CLOUDFLARE_DEFAULT_ACCOUNT_ID: z.string().min(1),
    CLOUDFLARE_IMAGE_ACCOUNT_HASH: z.string().min(1),
    // dashboard url
    DASHBOARD_URL: z.string().min(1),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with VITE_.
   */
  clientPrefix: "VITE_",
  client: {},
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
