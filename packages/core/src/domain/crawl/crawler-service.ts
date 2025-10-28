import { getFirecrawlClient } from "@core/providers/firecrawl";

export namespace FireCrawl {
  export async function urlToMarkdown(url: string): Promise<string> {
    const client = getFirecrawlClient();
    const scrapeResult = await client.scrape(url, {
      formats: ["markdown", "html"],
    });
    const md = scrapeResult.markdown;
    if (!md) throw new Error("Failed to scrape URL: no markdown content");
    return md;
  }
}
