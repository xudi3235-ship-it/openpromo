import { createClient } from "@openauthjs/openauth/client";
import { Actor } from "@openpromo/core/actor";
import { User } from "@openpromo/core/user/index";
import type { MiddlewareHandler } from "hono/types";
import { Resource } from "sst";
import { subjects } from "../../auth/subjects";

// Create OpenAuth client for token verification
const client = createClient({
  clientID: "openpromo-www", // Must match frontend client ID
  issuer: Resource.Auth.url,
});

export const jwtAuth: () => MiddlewareHandler = () => async (c, next) => {
  console.log("JWT middleware triggered");
  const authHeader = c.req.header("Authorization");
  console.log("Authorization header:", authHeader ? "present" : "missing");

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("No bearer token found, continuing to next middleware");
    // No bearer token, continue to next middleware (notPublic will handle the error)
    return next();
  }

  const token = authHeader.substring(7);
  console.log("Extracted JWT token:", token.substring(0, 50) + "...");

  try {
    console.log("Attempting to verify JWT token with OpenAuth client");
    console.log("Client issuer:", Resource.Auth.url);

    // Verify the JWT token using OpenAuth client
    const verified = await client.verify(subjects, token);
    console.log("JWT verification result:", verified);

    if (verified.err) {
      console.error("JWT verification failed:", verified.err);
      // Let notPublic() middleware handle the error
      return next();
    }

    if (!verified.subject) {
      console.error("No subject in verified JWT");
      return next();
    }

    console.log("JWT verified successfully, subject:", verified.subject);

    // Get user email from database to complete Actor context
    const user = await User.fromID(verified.subject.properties.id);
    console.log("User lookup result:", user ? "found" : "not found");

    if (!user) {
      console.error("User not found for ID:", verified.subject.properties.id);
      return next();
    }

    console.log("Setting up Actor context with user data");

    // Populate Actor context with verified user data (no workspace context yet)
    return Actor.provide(
      "user",
      {
        userID: verified.subject.properties.id,
        email: user.email || "",
        clientID: "openpromo-www", // This matches the OpenAuth client ID
        // workspaceID will be set by workspace middleware when needed
      },
      () => {
        console.log("Actor context set, proceeding to next middleware");
        return next();
      },
    );
  } catch (error) {
    console.error("JWT middleware error:", error);
    // Let notPublic() handle the authentication error
    return next();
  }
};
