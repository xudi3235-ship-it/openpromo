import { database } from "./database";
import { domain } from "./dns";
import { allSecrets } from "./secret";
import { bucket } from "./storage";
// import { email } from "./email";

export const urls = new sst.Linkable("Urls", {
  properties: {
    api: `https://api.${domain}`,
    auth: `https://auth.${domain}`,
    site: $dev ? "http://localhost:4321" : `https://www.${domain}`,
    openapi: `https://api.${domain}/doc`,
  },
});

const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [bucket, ...allSecrets, database],
  streaming: !$dev,
  handler: "packages/functions/src/index.handler",
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
