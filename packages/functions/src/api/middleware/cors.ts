import { cors } from "hono/cors";
import { Resource } from "sst";

export const useCors = () =>
  cors({
    origin: (origin) => {
      const web = Resource.Urls.site;
      // Allow requests from your website domains
      const allowedOrigins = [
        "http://localhost:3000", // local
        `https://${web}`, // www
        `https://www.${web}`, // redirect
      ];

      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return "*";

      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true, // Required for cookies/auth
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours
  });
