import { database } from "./database";
import { domain } from "./dns";
// import { email } from "./email";
import { allSecrets } from "./secret";
import { bucket } from "./storage";

export const urls = new sst.Linkable("Urls", {
  properties: {
    domain,
    api: `https://api.${domain}`,
    site: $dev ? "http://localhost:3000" : `https://${domain}`,
  },
});

export const api = new sst.aws.Function("ApiFn", {
  url: true,
  link: [bucket, ...allSecrets, database, urls],
  streaming: !$dev,
  handler: "packages/functions/src/api/deploy/lambda.handler",
});

// export const api = new sst.aws.Router("Api", {
//   routes: {
//     "/*": apiFn.url,
//   },
//   domain: {
//     name: `api.${domain}`,
//     dns: sst.cloudflare.dns(),
//   },
// });

// FIXME: workers' bindings are yelling about the Resource.<name> values,
// i think it's broken due to the bindings / build time.
// ------ cloudflare workers ------
export const worker = new sst.cloudflare.Worker("Worker", {
  handler: "packages/workers/src/index.ts",
  link: [urls, database, ...allSecrets, bucket],
  url: true,
});

export const outputs = {
  workerUrl: worker.url,
};
