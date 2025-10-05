import type { Context, MiddlewareHandler, Next } from "hono";

export const logRequestBody =
  (): MiddlewareHandler => async (c: Context, next: Next) => {
    // Clone the request so we don't consume the original body
    const clonedRequest = c.req.raw.clone();

    try {
      const contentType = clonedRequest.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = await clonedRequest.json();
        console.log("📝 JSON Request Body:", body);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await clonedRequest.formData();
        const body: Record<string, string> = {};
        for (const [key, value] of formData.entries()) {
          body[key] = String(value);
        }
        console.log("📝 Form Request Body:", body);
      } else if (contentType.startsWith("text/")) {
        const text = await clonedRequest.text();
        console.log("📝 Text Request Body:", text);
      } else {
        console.log("📝 Non-text Request Body:", contentType);
      }
    } catch (err) {
      console.error("Failed to log request body:", err);
    }

    await next();
  };
