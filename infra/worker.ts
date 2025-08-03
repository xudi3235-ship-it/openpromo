const worker = new sst.cloudflare.Worker("Worker", {
    handler: "packages/workers/src/index.ts",
    url: true,
});
