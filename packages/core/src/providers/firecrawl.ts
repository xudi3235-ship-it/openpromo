import { env } from "@core/utils/env";
import Firecrawl from "@mendable/firecrawl-js";

export function getFirecrawlClient() {
  const client = new Firecrawl({
    apiKey: env.FIRE_CRAWL_API_KEY,
  });
  return client;
}
