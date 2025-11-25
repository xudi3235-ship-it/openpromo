import { defineConfig } from "orval";

export default defineConfig({
  "petstore-file": {
    input: "../../backend/openapi.json",
    output: {
      mode: "single",
      target: "../../core/src/generated/openpromo_backend.ts",
      client: "fetch",
      baseUrl: "http://localhost:3000",
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
});
