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
        cloudflare: {
          version: "6.8.0",
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
        },
        command: true,
        tls: true,
        random: true,
        planetscale: {
          serviceToken: process.env.PLANETSCALE_SERVICE_TOKEN,
          serviceTokenId: process.env.PLANETSCALE_SERVICE_TOKEN_ID,
        },
        neon: {
          version: "0.9.0",
          apiKey: process.env.NEON_API_KEY,
        },
      },
    };
  },
  async run() {
    const outputs = {};
    const { readdirSync } = await import("node:fs");
    // skip some wip stuff
    const blocklist = ["wrangler", "cloudflare"];
    for (const value of readdirSync("./infra/")) {
      if (blocklist.includes(value)) continue;
      const result = await import(`./infra/${value}`);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
