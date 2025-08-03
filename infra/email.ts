export const email = new sst.aws.Email("MyEmail", {
    sender: "example.com", // TODO: change this
    dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
});