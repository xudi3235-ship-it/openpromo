import { bus } from "./bus";
import { database } from "./database";
import { domain } from "./dns";
import { email } from "./email";
import { allSecrets } from "./secret";
import { bucket } from "./storage";

export const urls = new sst.Linkable("Urls", {
  properties: {
    api: `https://api.${domain}`,
    auth: `https://auth.${domain}`,
    site: $dev ? "http://localhost:4321" : `https://www.${domain}`,
    openapi: `https://api.${domain}/doc`,
  },
});

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    link: [bus, ...allSecrets, database, email],
    permissions: [
      {
        actions: ["ses:SendEmail"],
        resources: ["*"],
      },
    ],
    handler: "./packages/functions/src/auth/index.handler",
    environment: {
      AUTH_FRONTEND_URL: $dev ? "http://localhost:3000" : `https://${domain}`,
    },
  },
  domain: {
    name: `auth.${domain}`,
    dns: sst.cloudflare.dns(),
  },
  forceUpgrade: "v2",
});

const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [bucket, ...allSecrets, database, auth],
  streaming: !$dev,
  handler: "packages/functions/src/api/index.handler",
});

const emailFn = new sst.aws.Function("EmailFn", {
  url: true,
  link: [...allSecrets], // email,
  streaming: !$dev,
  handler: "packages/functions/src/email.handler",
});

export const api = new sst.aws.Router("Api", {
  routes: {
    "/*": apiFn.url,
    "/email": emailFn.url,
  },
  domain: {
    name: `api.${domain}`,
    dns: sst.cloudflare.dns(),
  },
});

export const outputs = {
  auth: auth.url,
  api: api.url,
};
