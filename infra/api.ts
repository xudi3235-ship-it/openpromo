import { spawnSync } from "node:child_process";
import {
  bus,
  eventBridgePermissions,
  schedulerPermissions,
  schedulerRole,
} from "./bus";
import { database, hyperdrive } from "./database";
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
  const result = spawnSync("pnpm", ["build"], {
    cwd: "packages/web-ui",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

export const api = new sst.cloudflare.Worker("WorkerApi", {
  handler: "packages/web-api/src/index.ts",
  environment: {
    DEBUG: "OFF", // only takes string
    DRIZZLE_LOG: "false",
    SCHEDULER_ROLE_ARN: schedulerRole.arn,
  },
  link: [
    urls,
    database,
    ...allSecrets,
    bucket,
    email,
    bus,
    schedulerPermissions,
    eventBridgePermissions,
  ],
  domain,
  assets: $dev
    ? undefined
    : {
        directory: "packages/web-ui/dist",
      },
  transform: {
    worker: (args) => {
      // available on workers paid plan or enterprise plan
      // args.logpush = true;
      args.bindings = $resolve(args.bindings).apply((bindings) => [
        ...bindings,
        {
          type: "hyperdrive",
          name: "HYPERDRIVE",
          id: hyperdrive.id,
        },
      ]);
      args.observability = {
        enabled: true,
        headSamplingRate: 1,
      };
      args.compatibilityFlags = ["nodejs_compat"];
      args.compatibilityDate = "2025-08-23";
      args.placement = {
        mode: "smart",
      };
      // TODO: enable after upstream issue is fixed
      // args.assets = {
      // config: {
      //   headers: "/assets/*\n  Cache-Control: public,max-age=31536000,immutable",
      //   notFoundHandling: "single-page-application",
      //   runWorkerFirst: ["/api/*", "/auth/*"],
      // },
      // };
      // TODO: figure out service bindings for containers, haven't found
      // any docs on this yet
    },
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

export const outputs = {};
