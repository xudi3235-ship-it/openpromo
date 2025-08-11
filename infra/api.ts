import { database } from "./database";
import { domain } from "./dns";
import { email } from "./email";
import { allSecrets } from "./secret";
import { bucket } from "./storage";

export const urls = new sst.Linkable("Urls", {
  properties: {
    domain,
    api: `https://api.${domain}`,
    site: $dev ? "http://localhost:3000" : `https://${domain}`,
  },
});

const apiFn = new sst.aws.Function("ApiFn", {
  url: {
    cors: {
      allowOrigins: [urls.properties.site],
      allowCredentials: true,
    },
  },
  link: [bucket, ...allSecrets, database, urls, email],
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
