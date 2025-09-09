import { exec } from "node:child_process";

async function main() {
  const api = process.env.LIQUID_API_URL;
  if (!api) {
    console.error("LIQUID_API_URL is not set");
    return;
  }
  const spec = `${api}/docs/openapi.json`;
  const out = `../web-api/src/generated/api`;
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
  exec(cmd.join(" "), (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.debug(`stdout: ${stdout}`);
  });
}

main().catch(console.error);
