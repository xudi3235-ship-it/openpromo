import { domain } from "./dns";

export const www = new sst.aws.TanStackStart("WWW", {
  path: "packages/www",
  domain: {
    name: domain,
    dns: sst.cloudflare.dns(),
    redirects: [`www.${domain}`],
  },
  buildCommand: "pnpm build",
});
