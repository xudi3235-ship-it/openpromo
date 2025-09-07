import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

type AppErrorStatus = 400 | 401 | 403 | 404 | 500;

type AppErrorOptions = {
  /**
   * The error message to be logged internally.
   */
  message?: string;
  /**
   * The error message to be shown to the user.
   */
  userMessage?: string;
  /**
   * The cause of the error.
   */
  cause?: unknown;
};

export class AppError extends HTTPException {
  readonly userMessage: string | undefined;

  constructor(status: AppErrorStatus, options?: AppErrorOptions) {
    super(status, { message: options?.message, cause: options?.cause });
    this.userMessage = options?.userMessage;
  }
}

/**
 * Logs the error and returns a JSON response with user error message if specified
 */
export const onError = (error: Error, c: Context<ApiEnv>) => {
  const user = c.get("user");
  const orgId = c.get("organizationId");

  // Log the error if it has a message
  if (error.message) {
    console.error({ user: user, orgId: orgId, error });
  }

  // Handle our custom AppError
  if (error instanceof AppError) {
    return c.json({ message: error.userMessage }, error.status);
  }

  // Handle HTTP exceptions
  if (error instanceof HTTPException) {
    return c.json({}, error.status);
  }

  // All other errors are treated as internal server errors
  return c.json({}, 500);
};
