import { issuer } from "@openauthjs/openauth";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { Email } from "@openpromo/core/email/index";
import { User } from "@openpromo/core/user/index";
import { subjects } from "./subjects";

// support PIN code and github for now

export const authApp = issuer({
  ttl: {
    access: 60 * 15,           // 15 minutes
    refresh: 60 * 60 * 24 * 7, // 7 days
  },

  providers: {
    code: CodeProvider<{ email: string }>(
        CodeUI({
          sendCode: async (user_email, code) => {
            console.log(`Sending code ${code} to ${user_email.email}`);
            await Email.send(
              "no-reply",
              user_email.email,
              'OpenPromo Login Code',
              '', // the email body, but we choose to use styled HTML instead, can enrich it later. see below
              {
                html: `<p>Your login verification code is: ${code}</p>`
              }
            );
          },
        }),
      ),
    github: GithubProvider({
      clientID: process.env.GITHUB_CLIENT_ID!,
      // a better way to write this would be -- clientID: Resource.GithubClientID.value,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!, 
      // using assertion here to make sure the safety
      scopes: ["user:email"],
      // this is required by github, i think user:email is enough for now?
    })
  },
  subjects,
  success: async (ctx, value) => {
    let email = undefined as string | undefined;

    if (value.provider === "code") {
        // get email from client side
        email = value.claims.email;
        console.log("User logged in with email:", email);
    }

    if (value.provider === "github") {
      const access_token = value.tokenset.access;
      const response = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const emails = (await response.json()) as any[];
      const primary = emails.find((email: any) => email.primary);
      // check docs: https://docs.github.com/en/rest/users/emails?apiVersion=2022-11-28

      console.log("Currently logged-in user is:", primary);

      if (!primary.verified) {
        throw new Error("Email not verified by GitHub");
      }

      email = primary.email;

    }


      // use email to check if there's already a user in our DB
      if (email) {
        const matching = await User.fromEmail(email);
        if (matching.length === 0) {
          const id = await User.create({
            email,
          });
          return ctx.subject("user", {
            id,
          });
        }
        if (matching.length === 1) {
          return ctx.subject("user", {
            id: matching[0]!.id,
          });
        }
        if (matching.length > 1) {
          // For multiple users with same email, use the first one
          // In a production app, you might want to implement proper merging logic
          const id = matching[0]!.id;
          return ctx.subject("user", {
            id,
          });
        }
      }

        throw new Error("Invalid provider");
  }
})
