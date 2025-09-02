import Cloudflare from "cloudflare";
import { Resource } from "sst";

export const getCloudflareClient = () =>
  new Cloudflare({
    apiToken: Resource.CLOUDFLARE_API_TOKEN.value,
  });
