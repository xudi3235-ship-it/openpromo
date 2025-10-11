import { exec } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const GENERATED_LINT_MARKER = "biome-ignore-all lint: generated file";
const TS_NOCHECK_MARKER = "// @ts-nocheck";
const GENERATED_HEADER_LINES = [
  "/** biome-ignore-all lint: generated file */",
  "",
];

async function main() {
  const spec = `../backend/openapi.json`;
  const out = `../core/src/generated/v2`;
  const cmd = [
    "npx",
    "@hey-api/openapi-ts",
    "-i",
    spec,
    "-o",
    out,
    "-c",
    "@hey-api/client-fetch",
  ];
  try {
    const { stdout, stderr } = await execAsync(cmd.join(" "));
    if (stdout) {
      console.debug(stdout);
    }
    if (stderr) {
      console.warn(stderr);
    }
  } catch (error) {
    console.error("Error running OpenAPI code generation");
    throw error;
  }
  await suppressGeneratedLint(out);
}

async function suppressGeneratedLint(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await suppressGeneratedLint(entryPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }
    const fileContents = await readFile(entryPath, "utf8");
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
        lines[insertIndex]?.startsWith("// This file is auto-generated") ===
        true
      ) {
        insertIndex += 1;
      }
      lines.splice(insertIndex, 0, ...GENERATED_HEADER_LINES);
      modified = true;
    }

    if (modified) {
      await writeFile(entryPath, lines.join("\n"));
    }
  }
}

main().catch(console.error);
