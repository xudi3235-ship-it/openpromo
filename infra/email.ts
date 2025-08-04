import { domain } from "./dns";

export const email = new sst.aws.Email("Email", {
  sender: domain,
  dns: sst.cloudflare.dns(),
  dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
});
