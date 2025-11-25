/**
 * Generate OpenAPI spec from ORPC internal routes
 *
 * This script generates an OpenAPI 3.1 specification for the internal API
 * that Modal uses to communicate with the Cloudflare Worker.
 *
 * Usage:
 *   cd packages/core && pnpm gen:openapi
 *
 * Output:
 *   packages/dash/worker/openapi-internal.json
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

// Import the internal router spec (schema definitions without runtime deps)
import { internalRouterSpec } from "./internal-api";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔧 Generating OpenAPI spec from ORPC routes...");

  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  const spec = await generator.generate(internalRouterSpec, {
    info: {
      title: "OpenPromo Internal API",
      version: "0.0.0",
      description:
        "Internal API for Modal → Cloudflare Worker communication. " +
        "These endpoints are designed to be called from Modal backend services.",
    },
    servers: [
      { url: "https://openpromo.app/api/orpc", description: "prod" },
      {
        url: "http://raydev.openpromo.app/api/orpc",
        description: "dev raydev",
      },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Admin API token for internal service authentication",
        },
      },
    },
  });

  // Output to dash/worker directory
  const outputPath = join(
    __dirname,
    "../../../dash/worker/openapi-internal.json",
  );
  await writeFile(outputPath, JSON.stringify(spec, null, 2));

  console.log(`✅ OpenAPI spec generated: ${outputPath}`);
}

main().catch(console.error);
