import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@openpromo/core/drizzle/index"; 
import { handler } from "./email";
 
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: { 
        enabled: true, 
        requireEmailVerification: true,
    }, 
    emailVerification: {
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ( { user, url, token }, request) => {
          await handler({
            to: user.email,
            subject: "Verify your email address",
            text: `Click the link to verify your email: ${url}`,
          });
        },
        
      },
      socialProviders: {
        github: { 
            clientId: process.env.GITHUB_CLIENT_ID as string, 
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
        }, 
    },
});