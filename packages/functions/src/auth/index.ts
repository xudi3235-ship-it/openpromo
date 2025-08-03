import { issuer } from "@openauthjs/openauth";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { User } from "@openpromo/core/user/index";
import { subjects } from "./subjects";

// currently we only support github, later on we can add more providers
export const authApp = issuer({
  ttl: {
    access: 60 * 15,           // 15 minutes
    refresh: 60 * 60 * 24 * 7, // 7 days
  },
  providers: {
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
      const email = primary.email;

      // use this email to check if there's already a user in our DB
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
    }
    throw new Error("Invalid provider");
  }
})
