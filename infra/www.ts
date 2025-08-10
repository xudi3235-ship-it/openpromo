import { api } from "./api";
import { domain } from "./dns";

export const www = new sst.aws.StaticSite("WWW", {
  path: "packages/www",
  domain: {
    name: domain,
    dns: sst.cloudflare.dns(),
    redirects: [`www.${domain}`],
  },
  build: {
    command: "pnpm build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: api.url,
    // VITE_AUTH_URL: auth.url,
    VITE_STAGE: $app.stage,
  },
});
