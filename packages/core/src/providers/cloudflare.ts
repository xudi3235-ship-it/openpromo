import Cloudflare from "cloudflare";
import { env } from "../helpers/env";

export const getCloudflareClient = () =>
  new Cloudflare({
    apiToken: env.CLOUDFLARE_API_TOKEN,
  });
