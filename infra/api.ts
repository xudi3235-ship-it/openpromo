/** biome-ignore-all lint/style/noNonNullAssertion: infra */
import { spawnSync } from "node:child_process";
import { bus, schedulerRole } from "./bus";
import { CloudflareWorkflow } from "./cloudflare";
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

// we construct a linkable for permissions so that
// cloudflare or other cloud resources can easily link.
const permissions = new sst.Linkable("SchedulingPermissions", {
  properties: {},
  include: [
    sst.aws.permission({
      actions: ["scheduler:CreateSchedule", "scheduler:DeleteSchedule"],
      resources: ["*"],
    }),
    sst.aws.permission({
      actions: ["iam:PassRole"],
      resources: [schedulerRole.arn],
    }),
  ],
});

export const api = new sst.cloudflare.Worker("WorkerApi", {
  handler: "packages/web-api/src/index.ts",
  build: {
    loader: {
      ".raw.js": "text", // Import raw js files as string
    },
  },
  environment: {
    DEBUG: "OFF", // only takes string
    DRIZZLE_LOG: "false",
    SCHEDULER_ROLE_ARN: schedulerRole.arn,
  },
  link: [permissions, urls, database, ...allSecrets, bucket, email, bus],
  domain,
  assets: $dev
    ? undefined
    : {
        directory: "packages/web-ui/dist",
      },
  transform: {
    worker: (args) => {
      args.logpush = true;
      args.bindings = $resolve(args.bindings).apply((bindings) => [
        ...bindings,
        // !!match the workflow as below
        {
          type: "workflow",
          name: "WORKFLOW",
          className: "MyWorkflow",
          workflowName: "WORKFLOW",
        },
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

// ============ cloudflare infra stuff ============
// for some reason, if we use hono along with the workflow
// bindings, it doesn't really work.
new CloudflareWorkflow(
  "WORKFLOW",
  {
    name: "WORKFLOW",
    scriptName: api.nodes.worker.scriptName,
    className: "MyWorkflow",
    accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  },
  {
    dependsOn: [api],
  },
);

export const outputs = {};
