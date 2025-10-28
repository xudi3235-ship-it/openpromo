import { openai } from "@ai-sdk/openai";
import { FireCrawl } from "@core/domain/crawl/crawler-service";
import {
  type ProductLinkExtraction,
  ProductLinkExtractionSchema,
} from "@shared/product";
import { generateObject } from "ai";

const MAX_MARKDOWN_LENGTH = 20_000;

export interface ProductLinkProcessingResult {
  markdown: string;
  extraction: ProductLinkExtraction;
}

export async function processProductLink(
  url: string,
): Promise<ProductLinkProcessingResult> {
  const markdown = await FireCrawl.urlToMarkdown(url);

  const truncatedMarkdown = createMarkdownSnippet(markdown);

  const { object: extraction } = await generateObject({
    model: openai("gpt-5-mini"),
    schema: ProductLinkExtractionSchema,
    temperature: 0,
    maxOutputTokens: 1_200,
    messages: [
      {
        role: "system",
        content: `You transform crawled product pages into structured data for downstream automation. Be precise, concise, and prefer information that helps merchants create marketing assets.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `URL: ${url}`,
              "",
              "Markdown content:",
              truncatedMarkdown,
            ].join("\n"),
          },
        ],
      },
    ],
  });
  console.log("raw extraction", extraction);

  return { markdown, extraction };
}

export function createMarkdownSnippet(markdown: string): string {
  if (markdown.length <= MAX_MARKDOWN_LENGTH) {
    return markdown;
  }

  const suffix = "\n\n[truncated]";
  const available =
    MAX_MARKDOWN_LENGTH > suffix.length
      ? MAX_MARKDOWN_LENGTH - suffix.length
      : MAX_MARKDOWN_LENGTH;

  const base = markdown.slice(0, available);
  const candidate = `${base}${suffix}`;

  return candidate.length <= MAX_MARKDOWN_LENGTH
    ? candidate
    : candidate.slice(0, MAX_MARKDOWN_LENGTH);
}

export type { ProductLinkExtraction };
