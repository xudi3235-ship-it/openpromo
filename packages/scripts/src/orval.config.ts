import { defineConfig } from "orval";

export default defineConfig({
  // Generate the fetch client with Modal auth
  "openpromo-backend": {
    input: "../../backend/openapi.json",
    output: {
      mode: "single",
      target: "../../core/src/generated/openpromo_backend.ts",
      client: "fetch",
      baseUrl: {
        getBaseUrlFromSpecification: true,
        index: 0,
      },
      headers: true,
      mock: false,
      biome: true,
      override: {
        mutator: {
          path: "../../core/src/generated/modal-fetch.ts",
          name: "modalFetch",
        },
      },
    },
  },
  // Generate Zod schemas for validation (reusable in ORPC)
  // Output to shared package as single source of truth
  "openpromo-backend-zod": {
    input: "../../backend/openapi.json",
    output: {
      mode: "single",
      target: "../../shared/src/generated/openpromo_backend.zod.ts",
      client: "zod",
      biome: true,
      override: {
        zod: {
          strict: {
            body: true,
            response: true,
          },
          generate: {
            body: true,
            response: true,
            query: true,
            param: true,
            header: false,
          },
        },
      },
    },
  },
});
