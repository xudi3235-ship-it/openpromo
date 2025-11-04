import { getPostHogClient } from "@core/providers/posthog";
import {
  ErrorCodes,
  type ErrorResponseType,
  VisibleError,
} from "@core/utils/error";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

type HttpStatus = 400 | 401 | 403 | 404 | 500;

type VisibleErrorOptions = {
  message?: string;
  userMessage?: string;
  cause?: unknown;
  code?: string;
  type?: ErrorResponseType["type"];
};

const DEFAULT_USER_MESSAGES: Record<HttpStatus, string> = {
  400: "Your request was invalid.",
  401: "Authentication required.",
  403: "You do not have permission to perform this action.",
  404: "We couldn't find what you were looking for.",
  500: "Something went wrong on our end.",
};

const STATUS_METADATA: Record<
  HttpStatus,
  { type: ErrorResponseType["type"]; code: string }
> = {
  400: { type: "validation", code: ErrorCodes.Validation.INVALID_PARAMETER },
  401: { type: "authentication", code: ErrorCodes.Authentication.UNAUTHORIZED },
  403: { type: "forbidden", code: ErrorCodes.Permission.FORBIDDEN },
  404: { type: "not_found", code: ErrorCodes.NotFound.RESOURCE_NOT_FOUND },
  500: { type: "internal", code: ErrorCodes.Server.INTERNAL_ERROR },
};

export function createVisibleError(
  status: HttpStatus,
  options: VisibleErrorOptions = {},
): VisibleError {
  const metadata = STATUS_METADATA[status];
  const type = options.type ?? metadata.type;
  const code = options.code ?? metadata.code;
  const userMessage =
    options.userMessage ?? options.message ?? DEFAULT_USER_MESSAGES[status];

  const error = new VisibleError(type, code, userMessage);

  const details: Record<string, unknown> = {};
  if (options.message) {
    details.internalMessage = options.message;
  }
  if (options.cause) {
    details.cause = options.cause;
    // preserve cause for stack traces in runtimes that support it
    try {
      error.cause = options.cause;
    } catch {
      // ignore if assigning cause fails
    }
  }
  if (Object.keys(details).length > 0) {
    error.details = { ...(error.details ?? {}), ...details };
  }

  return error;
}

/**
 * Logs the error and returns a JSON response with user error message if specified
 */
export const onError = async (error: Error, c: Context<ApiEnv>) => {
  const user = c.get("user");
  const orgId = c.get("organizationId");

  const posthog = getPostHogClient();
  posthog.captureException(error, user?.id, {
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    headers: c.req.header(),
  });
  await posthog.flush();

  const logPayload = {
    user,
    orgId,
    error,
  };

  if (error instanceof VisibleError) {
    const internalMessage =
      (error.details &&
        (error.details as Record<string, unknown>).internalMessage) ??
      error.message;
    console.error({ ...logPayload, internalMessage });
    return c.json(error.toResponse(), error.statusCode());
  }

  // Handle HTTP exceptions
  if (error instanceof HTTPException) {
    console.error(logPayload);
    return c.json({}, error.status);
  }

  // All other errors are treated as internal server errors
  console.error(logPayload);
  return c.json({}, 500);
};
