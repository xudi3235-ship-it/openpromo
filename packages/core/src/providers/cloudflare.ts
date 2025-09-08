import { env } from "@core/utils/env";
import Cloudflare from "cloudflare";

export const getCloudflareClient = () =>
  new Cloudflare({
    apiToken: env.CLOUDFLARE_API_TOKEN,
  });
