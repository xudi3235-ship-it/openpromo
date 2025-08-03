import { domain } from "./dns";

// export const www = new sst.aws.Nextjs("WWW", {
//     path: "packages/web",
//     domain: {
//         name: domain,
//         dns: sst.cloudflare.dns(),
//         redirects: [`www.${domain}`],
//     },
// });

// // react router v7
// const www_rr = new sst.aws.React("WWW_RR", {
//     path: "packages/www_rr",
// });

export const www = new sst.aws.StaticSite("WWW", {
    path: "packages/www_",
});
