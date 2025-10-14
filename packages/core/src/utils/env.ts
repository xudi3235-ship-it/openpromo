import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  server: {
    DATABASE_URL: z.string().min(1),
    ADMIN_API_TOKEN: z.string().min(1),
    FACEBOOK_APP_ID: z.string().min(1),
    FACEBOOK_APP_SECRET: z.string().min(1),
    FACEBOOK_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
    INSTAGRAM_APP_ID: z.string().min(1),
    INSTAGRAM_APP_SECRET: z.string().min(1),
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
    TIKTOK_APP_ID: z.string().min(1),
    TIKTOK_APP_SECRET: z.string().min(1),
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
    CLOUDFLARE_STREAM_CUSTOMER_DOMAIN: z.string().min(1),
    // AI
    OPENAI_API_KEY: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    REPLICATE_API_TOKEN: z.string().min(1),
    // R2
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
    // modal backend
    MODAL_PROXY_AUTH_TOKEN_ID: z.string().min(1),
    MODAL_PROXY_AUTH_TOKEN_SECRET: z.string().min(1),
    OPENPROMO_SECRET_KEY: z.string().min(32),
    // debug flag
    DEBUG: z.string().optional().default("false"),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with VITE_.
   */
  clientPrefix: "VITE_",
  client: {
    VITE_DASHBOARD_URL: z.string().min(1),
    VITE_ENVIRONMENT: z.string().default("local"),
  },
  /*
   * Specify what values should be validated by your schemas above.
   */
  runtimeEnv: process.env,
});
