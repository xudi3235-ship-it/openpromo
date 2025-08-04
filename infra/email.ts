import { domain } from "./dns";

// biome-ignore lint/correctness/noUnusedVariables: TODO: fix later
const email = new sst.aws.Email("Email", {
  sender: domain,
  dns: sst.cloudflare.dns(),
  dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
});
