import { domain } from "./dns";
import { bucket } from "./storage";

export const urls = new sst.Linkable("Urls", {
  properties: {
    api: "https://api." + domain,
    auth: "https://auth." + domain,
    site: $dev ? "http://localhost:4321" : "https://www." + domain,
    openapi: "https://api." + domain + "/doc",
  },
});

const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [bucket],
  streaming: !$dev,
  handler: "packages/functions/src/index.handler",
});

export const api = new sst.aws.Router("Api", {
  routes: {
    "/*": apiFn.url,
  },
  domain: {
    name: "api." + domain,
    dns: sst.cloudflare.dns(),
  },
});
