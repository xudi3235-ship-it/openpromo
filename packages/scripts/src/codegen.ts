import { exec } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createClient } from "@hey-api/openapi-ts";

const execAsync = promisify(exec);

const GENERATED_LINT_MARKER = "biome-ignore-all lint: generated file";
const TS_NOCHECK_MARKER = "// @ts-nocheck";
const GENERATED_HEADER_LINES = [
  "/** biome-ignore-all lint: generated file */",
  "",
];

const HEYAPI_OUTPUT_DIR = "../core/src/generated/v2";
const ORVAL_OUTPUT_FILE = "../core/src/generated/openpromo_backend.ts";

/**
 * Code generation script for OpenAPI clients.
 *
 * This script generates TypeScript clients from the backend OpenAPI spec using:
 * 1. hey-api/openapi-ts - For the main API client
 * 2. orval - For the Modal backend client (with auth headers)
 *
 * @example hey-api usage:
 * ```ts
 * import { client } from "@openpromo/core/generated/v2/client.gen";
 * import { echoGet, transcodeVideoVideoTranscodePost } from "@openpromo/core/generated/v2/sdk.gen";
 *
 * // Configure the client (once at app init)
 * client.setConfig({
 *   baseUrl: "https://api.example.com",
 * });
 *
 * // Make API calls
 * const response = await echoGet();
 * console.log(response.data);
 *
 * // With request body
 * const transcodeResponse = await transcodeVideoVideoTranscodePost({
 *   body: {
 *     input_url: "https://example.com/video.mp4",
 *     output_format: "webm",
 *   },
 * });
 * ```
 *
 * @example orval usage (Modal backend):
 * ```ts
 * import { setModalAuth, echoGet } from "@openpromo/core/generated/openpromo_backend";
 *
 * // Set up Modal auth (once at app init)
 * setModalAuth(process.env.MODAL_KEY, process.env.MODAL_SECRET);
 *
 * // All API calls automatically include Modal-Key and Modal-Secret headers
 * const response = await echoGet();
 * ```
 */
async function main() {
  // Generate hey-api client
  console.log("🚀 Running hey-api codegen...");
  try {
    await createClient({
      input: "../backend/openapi.json",
      output: HEYAPI_OUTPUT_DIR,
      plugins: ["@hey-api/client-fetch"],
    });
  } catch (error) {
    console.error("Error running hey-api code generation");
    throw error;
  }
  await suppressGeneratedLint(HEYAPI_OUTPUT_DIR);

  // Generate orval client
  console.log("🍺 Running orval codegen...");
  try {
    await execAsync("pnpm orval");
  } catch (error) {
    console.error("Error running orval code generation");
    throw error;
  }
  await suppressGeneratedLint(ORVAL_OUTPUT_FILE);

  console.log("✅ All code generation complete!");
}

async function suppressGeneratedLint(pathOrDir: string) {
  const stats = await stat(pathOrDir);

  if (stats.isFile()) {
    await processFile(pathOrDir);
    return;
  }

  const entries = await readdir(pathOrDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(pathOrDir, entry.name);
    if (entry.isDirectory()) {
      await suppressGeneratedLint(entryPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }
    await processFile(entryPath);
  }
}

async function processFile(filePath: string) {
  const fileContents = await readFile(filePath, "utf8");
  const lines = fileContents.split("\n");
  let modified = false;

  const hasTsNocheck = lines
    .slice(0, 5)
    .some((line) => line === TS_NOCHECK_MARKER);
  if (!hasTsNocheck) {
    lines.unshift(TS_NOCHECK_MARKER);
    modified = true;
  }

  const hasLintMarker = lines.some((line) =>
    line.includes(GENERATED_LINT_MARKER),
  );
  if (!hasLintMarker) {
    let insertIndex = 0;
    if (lines[insertIndex] === TS_NOCHECK_MARKER) {
      insertIndex += 1;
    }
    if (
      lines[insertIndex]?.startsWith("// This file is auto-generated") === true
    ) {
      insertIndex += 1;
    }
    lines.splice(insertIndex, 0, ...GENERATED_HEADER_LINES);
    modified = true;
  }

  if (modified) {
    await writeFile(filePath, lines.join("\n"));
  }
}

main().catch(console.error);
