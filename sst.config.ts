/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "openpromo",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile: process.env.GITHUB_ACTIONS
            ? undefined
            : input.stage !== "production"
            ? "openpromo-dev"
            : undefined,
        },
        cloudflare: true,
        tls: true,
        random: true,
        planetscale: {
          serviceToken: process.env.PLANETSCALE_SERVICE_TOKEN!,
          serviceTokenId: process.env.PLANETSCALE_SERVICE_TOKEN_ID!,
        },
        // "@upstash/pulumi": {
        //   email: process.env.UPSTASH_EMAIL!,
        //   apiKey: process.env.UPSTASH_API_KEY!,
        // },
      },
    };
  },
  console: {
    autodeploy: {
      target(event) {
        if (event.type === "branch" && event.branch === "production") {
          return { stage: "production" };
        }
        if (event.type === "branch" && event.branch === "dev") {
          return { stage: "dev" };
        }
      },
      async workflow({ $, event }) {
        // workflow
        await $`npm i -g pnpm`;
        await $`pnpm install`;
        if (event.action === "removed") {
          await $`pnpm sst remove`;
          return;
        }

        await $`pnpm sst deploy`;
      },
    },
  },
  async run() {
    const outputs = {};
    const { readdirSync } = await import("fs");
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
