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
  url: true,
  link: [bucket, ...allSecrets, database, urls, email],
  streaming: !$dev,
  handler: "packages/functions/src/api/deploy/lambda.handler",
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

// FIXME: workers' bindings are yelling about the Resource.<name> values,
// i think it's broken due to the bindings / build time.
// ------ cloudflare workers ------
// const _worker = new sst.cloudflare.Worker("Worker", {
//   handler: "packages/functions/src/api/deploy/worker.ts",
//   link: [email, urls, database, ...allSecrets],
//   environment: {
//     // WORKOS_API_KEY: secret.WORKOS_API_KEY.value,
//   },
//   url: true,
// });
