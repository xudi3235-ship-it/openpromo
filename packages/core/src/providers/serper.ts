import { env } from "@core/utils/env";
import { z } from "zod";

const SerperSearchParametersSchema = z
  .object({
    q: z.string(),
    type: z.string().optional(),
    engine: z.string().optional(),
    num: z.number().optional(),
    gl: z.string().optional(),
    hl: z.string().optional(),
    location: z.string().optional(),
    tbs: z.string().optional(),
  })
  .passthrough();

const SerperImageSchema = z.object({
  title: z.string().optional().default(""),
  imageUrl: z.string(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailWidth: z.number().optional(),
  thumbnailHeight: z.number().optional(),
  source: z.string().optional(),
  domain: z.string().optional(),
  link: z.string().optional(),
  googleUrl: z.string().optional(),
  position: z.number().optional(),
});

const SerperImagesResponseSchema = z.object({
  searchParameters: SerperSearchParametersSchema,
  images: z.array(SerperImageSchema).default([]),
  credits: z.number().optional(),
});

const SerperAnswerBoxSchema = z
  .object({
    title: z.string().optional(),
    answer: z.string().optional(),
  })
  .optional();

const SerperKnowledgeGraphSchema = z
  .object({
    title: z.string().optional(),
    type: z.string().optional(),
    website: z.string().optional(),
    imageUrl: z.string().optional(),
    description: z.string().optional(),
    descriptionSource: z.string().optional(),
    descriptionLink: z.string().optional(),
    attributes: z.record(z.string(), z.string()).optional(),
  })
  .optional();

const SerperOrganicResultSchema = z.object({
  title: z.string().optional(),
  link: z.string().optional(),
  snippet: z.string().optional(),
  sitelinks: z
    .array(
      z.object({ title: z.string().optional(), link: z.string().optional() }),
    )
    .optional(),
  date: z.string().optional(),
  position: z.number().optional(),
});

const SerperTopStorySchema = z.object({
  title: z.string().optional(),
  link: z.string().optional(),
  source: z.string().optional(),
  date: z.string().optional(),
  imageUrl: z.string().optional(),
});

const SerperPeopleAlsoAskSchema = z.object({
  question: z.string().optional(),
  snippet: z.string().optional(),
  title: z.string().optional(),
  link: z.string().optional(),
});

const SerperRelatedSearchSchema = z.object({
  query: z.string().optional(),
});

const SerperSearchResponseSchema = z.object({
  searchParameters: SerperSearchParametersSchema,
  answerBox: SerperAnswerBoxSchema,
  knowledgeGraph: SerperKnowledgeGraphSchema,
  organic: z.array(SerperOrganicResultSchema).default([]),
  topStories: z.array(SerperTopStorySchema).default([]),
  peopleAlsoAsk: z.array(SerperPeopleAlsoAskSchema).default([]),
  relatedSearches: z.array(SerperRelatedSearchSchema).default([]),
  credits: z.number().optional(),
});

export type SerperImageResult = z.infer<typeof SerperImageSchema>;
export type SerperImagesResponse = z.infer<typeof SerperImagesResponseSchema>;

export type SerperImageSearchParams = {
  q: string;
  num?: number;
  gl?: string;
  hl?: string;
  location?: string;
  tbs?: string;
  apiKey?: string;
};

const SerperShoppingItemSchema = z.object({
  title: z.string().optional().default(""),
  source: z.string().optional(),
  link: z.string().optional(),
  price: z.string().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  productId: z.string().optional(),
  position: z.number().optional(),
});

const SerperShoppingResponseSchema = z.object({
  searchParameters: SerperSearchParametersSchema,
  shopping: z.array(SerperShoppingItemSchema).default([]),
  credits: z.number().optional(),
});

export type SerperShoppingItem = z.infer<typeof SerperShoppingItemSchema>;
export type SerperShoppingResponse = z.infer<
  typeof SerperShoppingResponseSchema
>;

export type SerperShoppingSearchParams = {
  q: string;
  num?: number;
  page?: number;
  gl?: string;
  hl?: string;
  location?: string;
  tbs?: string;
  apiKey?: string;
};

export type SerperSearchResponse = z.infer<typeof SerperSearchResponseSchema>;
export type SerperSearchParams = {
  q: string;
  num?: number;
  page?: number;
  gl?: string;
  hl?: string;
  location?: string;
  tbs?: string;
  apiKey?: string;
};

export namespace SerperSearch {
  /**
   * Search images via serper.dev Google Images endpoint.
   */
  export async function searchImages(
    params: SerperImageSearchParams,
  ): Promise<SerperImagesResponse> {
    const apiKey = params.apiKey ?? env.SERPER_API_KEY;
    const payload = {
      q: params.q,
      num: params.num,
      gl: params.gl,
      hl: params.hl,
      location: params.location,
      tbs: params.tbs,
    };

    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(
        `Serper images request failed (${response.status} ${response.statusText}): ${raw}`,
      );
    }

    const parsed = SerperImagesResponseSchema.safeParse(
      raw ? JSON.parse(raw) : {},
    );
    if (!parsed.success) {
      throw new Error(
        `Serper images response parse failed: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  /**
   * Search shopping results via serper.dev shopping endpoint.
   */
  export async function searchShopping(
    params: SerperShoppingSearchParams,
  ): Promise<SerperShoppingResponse> {
    const apiKey = params.apiKey ?? env.SERPER_API_KEY;
    const payload = {
      q: params.q,
      num: params.num,
      page: params.page,
      gl: params.gl,
      hl: params.hl,
      location: params.location,
      tbs: params.tbs,
      type: "shopping",
    };

    const response = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(
        `Serper shopping request failed (${response.status} ${response.statusText}): ${raw}`,
      );
    }

    const parsed = SerperShoppingResponseSchema.safeParse(
      raw ? JSON.parse(raw) : {},
    );
    if (!parsed.success) {
      throw new Error(
        `Serper shopping response parse failed: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  /**
   * Search web results via serper.dev search endpoint.
   */
  export async function search(
    params: SerperSearchParams,
  ): Promise<SerperSearchResponse> {
    const apiKey = params.apiKey ?? env.SERPER_API_KEY;
    const payload = {
      q: params.q,
      num: params.num,
      page: params.page,
      gl: params.gl,
      hl: params.hl,
      location: params.location,
      tbs: params.tbs,
      type: "search",
    };

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(
        `Serper search request failed (${response.status} ${response.statusText}): ${raw}`,
      );
    }

    const parsed = SerperSearchResponseSchema.safeParse(
      raw ? JSON.parse(raw) : {},
    );
    if (!parsed.success) {
      throw new Error(
        `Serper search response parse failed: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }
}
