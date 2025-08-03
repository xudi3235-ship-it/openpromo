const email = new sst.aws.Email("MyEmail", {
    sender: "openpromo.app",
    dns: sst.cloudflare.dns(),
    dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
});
