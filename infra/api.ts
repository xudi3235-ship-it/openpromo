import { bus } from "./bus";
import { database } from "./database";
import { domain } from "./dns";
import { email } from "./email";
import { allSecrets } from "./secret";
import { bucket } from "./storage";

export const urls = new sst.Linkable("Urls", {
  properties: {
    domain,
    api: `https://api.${domain}`,
    auth: `https://auth.${domain}`,
    site: $dev ? "http://localhost:3000" : `https://www.${domain}`,
    openapi: `https://api.${domain}/doc`,
  },
});

export const authFn = new sst.aws.Function("AuthFn", {
  url: true,
  handler: "packages/functions/src/auth/index.handler",
  link: [bus, ...allSecrets, database, email, urls],
});

export const auth = new sst.aws.Router("Auth", {
  routes: {
    "/*": authFn.url,
  },
  domain: {
    name: `auth.${domain}`,
    dns: sst.cloudflare.dns(),
  },
});

const apiFn = new sst.aws.Function("ApiFn", {
  url: {
    cors: {
      allowOrigins: [urls.properties.site],
      allowCredentials: true,
    },
  },
  link: [bucket, ...allSecrets, database, auth, urls],
  streaming: !$dev,
  handler: "packages/functions/src/api/index.handler",
});

export const api = new sst.aws.Router("Api", {
  routes: {
    "/*": apiFn.url,
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
