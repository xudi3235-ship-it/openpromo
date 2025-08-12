import { database } from "./database";
import { domain } from "./dns";
import { email } from "./email";
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
  link: [bucket, ...allSecrets, database, urls, email],
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

// ------ cloudflare workers ------
// wip migration, if everything works on worker, we can deprecate the lambda fn
export const worker = new sst.cloudflare.Worker("WorkerApi", {
  handler: "packages/functions/src/api/deploy/worker.ts",
  link: [urls, database, ...allSecrets, bucket, email],
  url: true,
});

export const outputs = {
  workerUrl: worker.url,
};
