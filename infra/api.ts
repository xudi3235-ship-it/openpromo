import { spawnSync } from "node:child_process";
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
    site: $dev ? "http://localhost:3000" : `https://${domain}`,
  },
});

export const apiFn = new sst.aws.Function("ApiFn", {
  url: true,
  link: [bucket, ...allSecrets, database, urls, email, bus],
  streaming: !$dev,
  handler: "packages/functions/src/api/deploy/lambda.handler",
});

// ------ cloudflare workers ------
// wip migration, if everything works on worker, we can deprecate the lambda fn

// Run web-ui locally in dev mode
new sst.x.DevCommand("WebUI", {
  dev: {
    directory: "packages/web-ui",
    command: "pnpm dev",
  },
  link: [urls],
});

// Build web-ui package to be used as worker assets in non-dev mode
if (!$dev) {
  spawnSync("pnpm", ["build"], { cwd: "packages/web-ui", stdio: "inherit" });
}

export const api = new sst.cloudflare.Worker("WorkerApi", {
  handler: "packages/web-api/src/index.ts",
  link: [urls, database, ...allSecrets, bucket, email, bus],
  domain,
  assets: $dev
    ? undefined
    : {
        directory: "packages/web-ui/dist",
      },
  // TODO: uncomment after https://github.com/sst/sst/issues/5947 is fixed
  // transform: {
  //   worker: {
  //     assets: {
  //       config: {
  //         notFoundHandling: "single-page-application",
  //       },
  //     },
  //   },
  // },
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

export const outputs = {};
