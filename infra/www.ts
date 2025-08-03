import { domain } from "./dns";

export const www = new sst.aws.Nextjs("WWW", {
    path: "packages/web",
    domain: {
        name: domain,
        dns: sst.cloudflare.dns(),
        redirects: [`www.${domain}`],
    },
});
