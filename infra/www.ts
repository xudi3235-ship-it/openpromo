import { domain } from "./dns";

export const www = new sst.aws.StaticSite("WWW", {
  path: "packages/www_v2",
  domain: {
    name: domain,
    dns: sst.cloudflare.dns(),
    redirects: [`www.${domain}`],
  },
  build: {
    command: "pnpm build",
    output: "dist",
  },
});
