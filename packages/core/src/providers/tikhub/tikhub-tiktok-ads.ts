import { omitNull } from "@core/utils/common";
import z from "zod";
import { makeApiCall } from "./client";

// Schema for getAdDetail API response
const GetAdDetailResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.object({
    ads_id: z.string(),
  }),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      ad_title: z.string(),
      brand_name: z.string(),
      comment: z.number(),
      cost: z.number().min(1).max(5),
      country_code: z.array(z.string()),
      ctr: z.number(),
      favorite: z.boolean(),
      has_summary: z.boolean(),
      highlight_text: z.string(),
      id: z.string(),
      industry_key: z.string(),
      is_search: z.boolean(),
      keyword_list: z.array(z.string()),
      landing_page: z.string().url(),
      like: z.number(),
      objective_key: z.string(),
      objectives: z.array(
        z.object({
          label: z.string(),
          value: z.number(),
        }),
      ),
      pattern_label: z.array(z.string()),
      share: z.number(),
      source: z.string(),
      source_key: z.number(),
      tag: z.number(),
      video_info: z.object({
        vid: z.string(),
        duration: z.number(),
        cover: z.string().url(),
        video_url: z.object({
          "720p": z.string().url(),
        }),
        width: z.number(),
        height: z.number(),
      }),
      voice_over: z.boolean(),
    }),
  }),
});

// Schema for searchAds API response
const SearchAdsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    materials: z.array(
      z.object({
        id: z.string(),
        aweme_id: z.string(),
        desc: z.string(),
        create_time: z.number(),
        video_info: z.object({
          cover: z.string().url(),
          duration: z.number(),
        }),
        statistics: z.object({
          digg_count: z.number(),
          comment_count: z.number(),
          share_count: z.number(),
        }),
        ads_info: z.object({
          advertiser_name: z.string(),
          landing_page: z.string().url(),
        }),
      }),
    ),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      has_more: z.boolean(),
    }),
  }),
});

// Types
export type AdDetail = z.infer<typeof GetAdDetailResponse>["data"]["data"];
export type SearchAdsMaterial = z.infer<
  typeof SearchAdsResponse
>["data"]["materials"][0];
export type SearchAdsResult = z.infer<typeof SearchAdsResponse>;

// Schema for getKeywordInsights API response
const GetKeywordInsightsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      keyword_list: z.array(
        z.object({
          comment: z.number(),
          cost: z.number(),
          cpa: z.number(),
          ctr: z.number(),
          cvr: z.number(),
          impression: z.number(),
          keyword: z.string(),
          like: z.number(),
          play_six_rate: z.number(),
          post: z.number(),
          post_change: z.number(),
          share: z.number(),
          video_list: z.array(z.string()),
        }),
      ),
      pagination: z.object({
        page: z.number(),
        size: z.number(),
        total: z.number(),
        has_more: z.boolean(),
      }),
    }),
  }),
});

// Types
export type KeywordInsight = z.infer<
  typeof GetKeywordInsightsResponse
>["data"]["data"]["keyword_list"][0];
export type KeywordInsightsResult = z.infer<typeof GetKeywordInsightsResponse>;

// API Functions
export async function getAdDetail(
  adsId: string,
): Promise<z.infer<typeof GetAdDetailResponse>> {
  if (!adsId) {
    throw new Error("ads_id is required");
  }

  const data = await makeApiCall<z.infer<typeof GetAdDetailResponse>>(
    `/api/v1/tiktok/ads/get_ads_detail?ads_id=${adsId}`,
    {
      method: "GET",
    },
  );

  return GetAdDetailResponse.parse(data);
}

export async function searchAds(params?: {
  keyword?: string;
  objective?: number;
  like?: number;
  period?: number;
  industry?: string;
  page?: number;
  limit?: number;
  order_by?: "for_you" | "likes";
  country_code?: string;
  ad_format?: number;
  ad_language?: string;
  search_id?: string;
}): Promise<SearchAdsResult> {
  if (!params) {
    const data = await makeApiCall<z.infer<typeof SearchAdsResponse>>(
      "/api/v1/tiktok/ads/search_ads",
      {
        method: "GET",
      },
    );
    return SearchAdsResponse.parse(data);
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/search_ads?${queryString}`
    : "/api/v1/tiktok/ads/search_ads";

  const data = await makeApiCall<z.infer<typeof SearchAdsResponse>>(url, {
    method: "GET",
  });

  return SearchAdsResponse.parse(data);
}

export async function getKeywordInsights(params?: {
  page?: number;
  limit?: number;
  period?: number;
  country_code?: string;
  order_by?: string;
  order_type?: string;
  industry?: string;
  objective?: string;
  keyword_type?: string;
  keyword?: string;
}): Promise<KeywordInsightsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_keyword_insights?${queryString}`
    : "/api/v1/tiktok/ads/get_keyword_insights";

  const data = await makeApiCall<z.infer<typeof GetKeywordInsightsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetKeywordInsightsResponse.parse(data);
}
