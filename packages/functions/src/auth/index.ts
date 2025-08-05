import { issuer } from "@openauthjs/openauth";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { Email } from "@openpromo/core/email/index";
import { User } from "@openpromo/core/user/index";
import { handle } from "hono/aws-lambda";
import { logger } from "hono/logger";
import { Resource } from "sst";
import { subjects } from "./subjects";

// check docs: https://docs.github.com/en/rest/users/emails?apiVersion=2022-11-28
interface GithubUserEmail {
  email: string;
  verified: boolean;
  primary: boolean;
  visibility: string | null;
}

export const app = issuer({
  ttl: {
    access: 60 * 15, // 15 minutes
    refresh: 60 * 60 * 24 * 7, // 7 days
  },

  providers: {
    email: CodeProvider(
      CodeUI({
        async sendCode(claims, code) {
          console.log(`Sending code ${code} to ${claims.email}`);
          // TODO: Fix SES configuration - for now just log the code
          console.log(`📧 EMAIL CODE FOR ${claims.email}: ${code}`);

          await Email.send(
            "no-reply",
            claims.email,
            `Openpromo Code: ${code}`,
            `Your Openpromo login code is: ${code}`,
          );
        },
      }),
    ),
    github: GithubProvider({
      clientID: Resource.GITHUB_OAUTH_CLIENT_ID.value,
      clientSecret: Resource.GITHUB_OAUTH_CLIENT_SECRET.value,
      scopes: ["user:email"],
      // this is required by github, i think user:email is enough for now?
    }),
  },
  subjects,
  success: async (ctx, value) => {
    let email = undefined as string | undefined;

    console.log("Success handler called with:", JSON.stringify(value, null, 2));

    if (value.provider === "email") {
      // For CodeUI, the email comes from the claims object
      email = value.claims?.email;
      console.log("Extracted email:", email);
      console.log("Claims object:", JSON.stringify(value.claims, null, 2));
    }

    if (value.provider === "github") {
      const access_token = value.tokenset.access;
      const response = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const emails = (await response.json()) as GithubUserEmail[];
      const primary = emails.find((email) => email.primary);

      if (!primary) {
        throw new Error("No primary email found");
      }

      console.log("Currently logged-in user is:", primary.email);

      if (!primary.verified) {
        throw new Error("Email not verified by GitHub");
      }

      email = primary.email;
    }

    // use email to check if there's already a user in our DB
    if (email) {
      const matching = await User.fromEmail(email);
      if (matching.length === 0) {
        const { id, workspaceID } = await User.create({
          email,
        });
        return ctx.subject("user", {
          id,
          workspaceID,
        });
      }
      if (matching.length === 1) {
        const user = matching[0];
        if (!user) {
          throw new Error("User not found");
        }
        return ctx.subject("user", {
          id: user.id,
          workspaceID: user.workspaceID,
        });
      }
      if (matching.length > 1) {
        // Multiple workspaces - use the first one (they're already ordered by timeCreated ASC from User.fromEmail)
        // TODO: Implement proper workspace selection logic:
        // - Could check for a preferred workspace in JWT claims
        // - Could implement a "last used workspace" preference
        // - Could prompt user to select workspace during login
        const user = matching[0]; // Using first (oldest) for consistency
        if (!user) throw new Error("User not found");

        console.log(
          `User ${email} has ${matching.length} workspaces, selected workspace: ${user.workspaceID}`,
        );

        return ctx.subject("user", {
          id: user.id,
          workspaceID: user.workspaceID,
        });
      }
    }

    throw new Error("Invalid provider");
  },
  async allow(input) {
    const url = new URL(input.redirectURI);
    return (
      url.hostname.endsWith("localhost") ||
      url.hostname.endsWith("openpromo.app") ||
      url.hostname === "localhost"
    );
  },
}).use(logger());

export const handler = handle(app);
