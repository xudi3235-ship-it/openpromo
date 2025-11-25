import { setModalAuth } from "@core/generated/modal-fetch";
import { orpcBuilder } from "../context";

/**
 * Middleware to automatically configure Modal API authentication.
 *
 * This middleware reads the Modal proxy credentials from the environment
 * and calls `setModalAuth()` before proceeding to the handler.
 *
 * Usage:
 * ```typescript
 * orpcBuilder
 *   .input(schema)
 *   .use(withModalAuth)
 *   .handler(async ({ input }) => {
 *     // Modal auth is already configured
 *     const result = await generateAgentVideoJobVideoGeneratePost(input);
 *     return result;
 *   })
 * ```
 */
export const withModalAuth = orpcBuilder.middleware(
  async ({ context, next }) => {
    const { honoContext } = context;
    const env = honoContext.env;

    // Configure Modal auth with proxy credentials from environment
    setModalAuth(
      env.MODAL_PROXY_AUTH_TOKEN_ID,
      env.MODAL_PROXY_AUTH_TOKEN_SECRET,
    );

    return next({ context });
  },
);
