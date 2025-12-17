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

// Schema for e-commerce category
const EcomCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  parent_id: z.string().optional(),
});

// Schema for getTopProducts API response
const GetTopProductsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      list: z.array(
        z.object({
          comment: z.number(),
          cost: z.number(),
          cover_url: z.string().nullable(),
          cpa: z.number(),
          ctr: z.number(),
          cvr: z.number(),
          ecom_type: z.string(),
          first_ecom_category: EcomCategorySchema,
          impression: z.number(),
          like: z.number(),
          play_six_rate: z.number(),
          post: z.number(),
          post_change: z.number(),
          second_ecom_category: EcomCategorySchema.optional(),
          share: z.number(),
          third_ecom_category: EcomCategorySchema.optional(),
          url_title: z.string(),
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

// Types for top products
export type TopProduct = z.infer<
  typeof GetTopProductsResponse
>["data"]["data"]["list"][0];
export type TopProductsResult = z.infer<typeof GetTopProductsResponse>;

// Schema for hashtag trend data point
const HashtagTrendSchema = z.object({
  time: z.number(),
  value: z.number(),
});

// Schema for hashtag creator
const HashtagCreatorSchema = z.object({
  nick_name: z.string(),
  avatar_url: z.string(),
});

// Schema for country/industry info
const CountryInfoSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
});

const IndustryInfoSchema = z.object({
  id: z.number(),
  value: z.string(),
  label: z.string(),
});

// Schema for getHashtagList API response
const GetHashtagListResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      list: z.array(
        z.object({
          hashtag_id: z.string(),
          hashtag_name: z.string(),
          country_info: CountryInfoSchema,
          industry_info: IndustryInfoSchema,
          is_promoted: z.boolean(),
          trend: z.array(HashtagTrendSchema),
          creators: z.array(HashtagCreatorSchema),
          publish_cnt: z.number(),
          video_views: z.number(),
          rank: z.number(),
          rank_diff: z.number(),
          rank_diff_type: z.number(),
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

// Types for hashtag list
export type Hashtag = z.infer<
  typeof GetHashtagListResponse
>["data"]["data"]["list"][0];
export type HashtagListResult = z.infer<typeof GetHashtagListResponse>;

// Schema for sound trend data point (reuse HashtagTrendSchema pattern)
const SoundTrendSchema = z.object({
  time: z.number(),
  value: z.number(),
});

// Schema for related item in sound
const SoundRelatedItemSchema = z.object({
  item_id: z.number(),
  cover_uri: z.string(),
});

// Schema for getSoundRankList API response
const GetSoundRankListResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      pagination: z.object({
        page: z.number(),
        size: z.number(),
        total: z.number(),
        has_more: z.boolean(),
      }),
      sound_list: z.array(
        z.object({
          author: z.string(),
          clip_id: z.string(),
          cml_mid: z.string(),
          country_code: z.string(),
          cover: z.string(),
          duration: z.number(),
          if_cml: z.boolean(),
          is_search: z.boolean(),
          link: z.string(),
          music_url: z.string(),
          on_list_times: z.number().nullable(),
          promoted: z.boolean(),
          rank: z.number(),
          rank_diff: z.number(),
          rank_diff_type: z.number(),
          related_items: z.array(SoundRelatedItemSchema),
          song_id: z.string(),
          title: z.string(),
          trend: z.array(SoundTrendSchema),
          url_title: z.string(),
        }),
      ),
    }),
  }),
});

// Types for sound rank list
export type Sound = z.infer<
  typeof GetSoundRankListResponse
>["data"]["data"]["sound_list"][0];
export type SoundRankListResult = z.infer<typeof GetSoundRankListResponse>;

// Schema for getKeywordList API response
const GetKeywordListResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    keyword_info_list: z.array(
      z.object({
        keyword: z.string(),
        post: z.number(),
        video_list: z.array(z.string()),
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

// Types for keyword list
export type KeywordInfo = z.infer<
  typeof GetKeywordListResponse
>["data"]["keyword_info_list"][0];
export type KeywordListResult = z.infer<typeof GetKeywordListResponse>;

// Schema for video URL object (multiple quality levels)
const VideoUrlSchema = z.object({
  "360p": z.string().optional(),
  "480p": z.string().optional(),
  "540p": z.string().optional(),
  "720p": z.string().optional(),
});

// Schema for getTopAdsSpotlight API response
const GetTopAdsSpotlightResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      materials: z.array(
        z.object({
          cost: z.number(),
          ctr: z.number(),
          highlight: z.string(),
          id: z.string(),
          like: z.number(),
          video_info: z.object({
            vid: z.string(),
            duration: z.number(),
            cover: z.string(),
            video_url: VideoUrlSchema,
            width: z.number(),
            height: z.number(),
          }),
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

// Types for top ads spotlight
export type TopAdSpotlight = z.infer<
  typeof GetTopAdsSpotlightResponse
>["data"]["data"]["materials"][0];
export type TopAdsSpotlightResult = z.infer<typeof GetTopAdsSpotlightResponse>;

// Schema for getAdKeyframeAnalysis API response
const GetAdKeyframeAnalysisResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    keyframe_data: z.object({
      time_points: z.array(z.number()),
      retention_rates: z.array(z.number()),
      drop_points: z.array(z.number()),
      highlight_points: z.array(z.number()),
    }),
  }),
});

// Types for ad keyframe analysis
export type KeyframeData = z.infer<
  typeof GetAdKeyframeAnalysisResponse
>["data"]["keyframe_data"];
export type AdKeyframeAnalysisResult = z.infer<
  typeof GetAdKeyframeAnalysisResponse
>;

// Schema for industry average
const IndustryAverageSchema = z.object({
  ctr: z.number().optional(),
  cvr: z.number().optional(),
  engagement: z.number().optional(),
});

// Schema for getAdPercentile API response
const GetAdPercentileResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    percentile_data: z.object({
      ctr_percentile: z.number().optional(),
      cvr_percentile: z.number().optional(),
      engagement_percentile: z.number().optional(),
      view_percentile: z.number().optional(),
      industry_average: IndustryAverageSchema.optional(),
    }),
  }),
});

// Types for ad percentile
export type PercentileData = z.infer<
  typeof GetAdPercentileResponse
>["data"]["percentile_data"];
export type AdPercentileResult = z.infer<typeof GetAdPercentileResponse>;

// Schema for time series data point
const TimeSeriesDataSchema = z.object({
  time: z.number(),
  value: z.number(),
});

// Schema for getAdInteractiveAnalysis API response
const GetAdInteractiveAnalysisResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    interactive_data: z.object({
      time_series: z.array(TimeSeriesDataSchema),
      average_watch_time: z.number(),
      completion_rate: z.number(),
      peak_interaction_time: z.number(),
    }),
  }),
});

// Types for ad interactive analysis
export type InteractiveData = z.infer<
  typeof GetAdInteractiveAnalysisResponse
>["data"]["interactive_data"];
export type AdInteractiveAnalysisResult = z.infer<
  typeof GetAdInteractiveAnalysisResponse
>;

// Schema for recommended ad material
const RecommendedAdMaterialSchema = z.object({
  ad_title: z.string(),
  brand_name: z.string(),
  cost: z.number(),
  ctr: z.number(),
  favorite: z.boolean(),
  id: z.string(),
  industry_key: z.string(),
  is_search: z.boolean(),
  like: z.number(),
  objective_key: z.string(),
  tag: z.number(),
  video_info: z.object({
    vid: z.string(),
    duration: z.number(),
    cover: z.string(),
    video_url: VideoUrlSchema,
    width: z.number(),
    height: z.number(),
  }),
});

// Schema for getRecommendedAds API response
const GetRecommendedAdsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      materials: z.array(RecommendedAdMaterialSchema),
    }),
  }),
});

// Types for recommended ads
export type RecommendedAdMaterial = z.infer<typeof RecommendedAdMaterialSchema>;
export type RecommendedAdsResult = z.infer<typeof GetRecommendedAdsResponse>;

// Schema for getQuerySuggestions API response
const GetQuerySuggestionsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      query: z.array(z.string()),
    }),
  }),
});

// Types for query suggestions
export type QuerySuggestionsResult = z.infer<
  typeof GetQuerySuggestionsResponse
>;

// Schema for filter option
const FilterOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

// Schema for getKeywordFilters API response
const GetKeywordFiltersResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    country_list: z.array(FilterOptionSchema),
    industry_list: z.array(FilterOptionSchema),
    keyword_type: z.array(z.string()),
    objective_list: z.array(FilterOptionSchema),
  }),
});

// Types for keyword filters
export type KeywordFiltersResult = z.infer<typeof GetKeywordFiltersResponse>;

// Schema for related keyword item
const RelatedKeywordItemSchema = z.object({
  keyword: z.string(),
  relevance_score: z.number(),
  search_volume: z.string(),
  growth_rate: z.number().optional(),
  post_count: z.number(),
});

// Schema for getRelatedKeywords API response
const GetRelatedKeywordsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    list: z.array(RelatedKeywordItemSchema),
  }),
});

// Types for related keywords
export type RelatedKeywordItem = z.infer<typeof RelatedKeywordItemSchema>;
export type RelatedKeywordsResult = z.infer<typeof GetRelatedKeywordsResponse>;

// Schema for keyword detail item
const KeywordDetailItemSchema = z.object({
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
});

// Schema for getKeywordDetails API response
const GetKeywordDetailsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      keyword_list: z.array(KeywordDetailItemSchema),
      pagination: z.object({
        page: z.number(),
        size: z.number(),
        total: z.number(),
        has_more: z.boolean(),
      }),
    }),
  }),
});

// Types for keyword details
export type KeywordDetailItem = z.infer<typeof KeywordDetailItemSchema>;
export type KeywordDetailsResult = z.infer<typeof GetKeywordDetailsResponse>;

// Schema for label info
const LabelInfoSchema = z.object({
  value: z.string(),
  description: z.string(),
});

// Schema for creative pattern item
const CreativePatternItemSchema = z.object({
  label_info: LabelInfoSchema,
  ctr: z.number(),
  play_over_rate: z.number(),
  avg_watch_time: z.number(),
  example_count: z.number(),
});

// Schema for getCreativePatterns API response
const GetCreativePatternsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    list: z.array(CreativePatternItemSchema),
  }),
});

// Types for creative patterns
export type CreativePatternItem = z.infer<typeof CreativePatternItemSchema>;
export type CreativePatternsResult = z.infer<
  typeof GetCreativePatternsResponse
>;

// Schema for ecom category in product filters
const EcomCategoryFilterSchema = z.object({
  id: z.number(),
  value: z.string(),
  label: z.string(),
});

// Schema for country in product filters
const CountryFilterSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
});

// Schema for getProductFilters API response
const GetProductFiltersResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      country: z.array(CountryFilterSchema),
      ecom_category: z.array(EcomCategoryFilterSchema),
      latest_month: z.string(),
      latest_week: z.string(),
    }),
  }),
});

// Types for product filters
export type ProductFiltersResult = z.infer<typeof GetProductFiltersResponse>;

// Schema for time series metric in product metrics
const ProductMetricTimeSeriesSchema = z.object({
  time: z.number(),
  value: z.number(),
});

// Schema for product metrics info
const ProductMetricsInfoSchema = z.object({
  comment: z.number(),
  cost: z.number(),
  cover_url: z.string().nullable(),
  cpa: z.number(),
  ctr: z.number(),
  ctr_metrics: z.array(ProductMetricTimeSeriesSchema),
  cvr: z.number(),
  ecom_type: z.string(),
  first_ecom_category: z.string(),
  impression: z.number(),
  like: z.number(),
  play_six_rate: z.number(),
  post: z.number(),
  post_change: z.number(),
  post_metrics: z.array(ProductMetricTimeSeriesSchema),
  second_ecom_category: z.string().optional(),
  share: z.number(),
  third_ecom_category: z.string().optional(),
  url_title: z.string(),
});

// Schema for getProductMetrics API response
const GetProductMetricsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      info: ProductMetricsInfoSchema,
    }),
  }),
});

// Types for product metrics
export type ProductMetricsInfo = z.infer<typeof ProductMetricsInfoSchema>;
export type ProductMetricsResult = z.infer<typeof GetProductMetricsResponse>;

// Schema for audience age distribution
const AudienceAgeSchema = z.object({
  age_level: z.number(),
  score: z.number(),
});

// Schema for interest info
const InterestInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

// Schema for audience interest distribution
const AudienceInterestSchema = z.object({
  interest_info: InterestInfoSchema,
  score: z.number(),
});

// Schema for ecom category in product detail
const EcomCategoryDetailSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

// Schema for product detail info
const ProductDetailInfoSchema = z.object({
  audience_ages: z.array(AudienceAgeSchema),
  audience_interests: z.array(AudienceInterestSchema),
  cover_url: z.string().nullable(),
  ecom_type: z.string(),
  first_ecom_category: EcomCategoryDetailSchema,
  hashtags: z.array(z.string()),
  posts: z.array(z.string()),
  second_ecom_category: z.string().optional(),
  third_ecom_category: z.string().optional(),
  url_title: z.string(),
});

// Schema for getProductDetail API response
const GetProductDetailResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      info: ProductDetailInfoSchema,
    }),
  }),
});

// Types for product detail
export type ProductDetailInfo = z.infer<typeof ProductDetailInfoSchema>;
export type ProductDetailResult = z.infer<typeof GetProductDetailResponse>;

// Schema for simple filter option (id + value)
const SimpleFilterOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

// Schema for getHashtagFilters API response
const GetHashtagFiltersResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    country: z.array(SimpleFilterOptionSchema),
    industry: z.array(SimpleFilterOptionSchema),
  }),
});

// Types for hashtag filters
export type HashtagFiltersResult = z.infer<typeof GetHashtagFiltersResponse>;

// Schema for hashtag creator item (video/work)
const HashtagCreatorItemSchema = z.object({
  item_id: z.string(),
  cover_url: z.string(),
  tt_link: z.string(),
  vv: z.number(),
  liked_cnt: z.number(),
  create_time: z.number(),
});

// Schema for hashtag creator (detailed)
const HashtagCreatorDetailSchema = z.object({
  tcm_id: z.string(),
  user_id: z.string(),
  nick_name: z.string(),
  avatar_url: z.string(),
  follower_cnt: z.number(),
  liked_cnt: z.number(),
  tt_link: z.string(),
  tcm_link: z.string(),
  items: z.array(HashtagCreatorItemSchema),
});

// Schema for getHashtagCreator API response
const GetHashtagCreatorResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      creators: z.array(HashtagCreatorDetailSchema),
    }),
  }),
});

// Types for hashtag creator
export type HashtagCreatorItem = z.infer<typeof HashtagCreatorItemSchema>;
export type HashtagCreatorDetail = z.infer<typeof HashtagCreatorDetailSchema>;
export type HashtagCreatorResult = z.infer<typeof GetHashtagCreatorResponse>;

// Schema for country in sound filters
const SoundCountryFilterSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
});

// Schema for getSoundFilters API response
const GetSoundFiltersResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      country: z.array(SoundCountryFilterSchema),
    }),
  }),
});

// Types for sound filters
export type SoundFiltersResult = z.infer<typeof GetSoundFiltersResponse>;

// Schema for audience country in sound detail
const SoundAudienceCountrySchema = z.object({
  country_info: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  }),
  score: z.number(),
});

// Schema for audience interest in sound detail
const SoundAudienceInterestSchema = z.object({
  interest_info: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  }),
  score: z.number(),
});

// Schema for longevity in sound detail
const SoundLongevitySchema = z.object({
  popular_days: z.number().optional(),
  current_popularity: z.number().optional(),
});

// Schema for sound detail
const SoundDetailSchema = z.object({
  audience_ages: z.array(AudienceAgeSchema),
  audience_countries: z.array(SoundAudienceCountrySchema).optional(),
  audience_interests: z.array(SoundAudienceInterestSchema).optional(),
  author: z.string(),
  clip_id: z.string(),
  country_code: z.string(),
  cover: z.string(),
  duration: z.number(),
  if_cml: z.boolean(),
  is_search: z.boolean(),
  link: z.string(),
  longevity: SoundLongevitySchema.optional(),
  music_url: z.string().nullable(),
  on_list_times: z.number().nullable(),
  promoted: z.boolean(),
  rank: z.number().nullable(),
  rank_diff: z.number().nullable(),
  related_items: z.array(SoundRelatedItemSchema),
  song_id: z.string(),
  title: z.string(),
  trend: z.array(SoundTrendSchema),
  url_title: z.string(),
});

// Schema for getSoundDetail API response
const GetSoundDetailResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    disliked: z.boolean().nullable(),
    like_count: z.number().nullable(),
    liked: z.boolean().nullable(),
    sound: SoundDetailSchema,
  }),
});

// Types for sound detail
export type SoundDetail = z.infer<typeof SoundDetailSchema>;
export type SoundDetailResult = z.infer<typeof GetSoundDetailResponse>;

// Schema for sound hint item
const SoundHintItemSchema = z.object({
  title: z.string(),
  author: z.string(),
  match_type: z.string(),
  popularity: z.number(),
});

// Schema for searchSoundHint API response
const SearchSoundHintResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    sound_list: z.array(SoundHintItemSchema),
  }),
});

// Types for sound hint
export type SoundHintItem = z.infer<typeof SoundHintItemSchema>;
export type SoundHintResult = z.infer<typeof SearchSoundHintResponse>;

// Schema for sound item in search results
const SearchSoundItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  duration: z.number(),
  trend: z.array(SoundTrendSchema),
  related_items: z.number(),
  is_commercial: z.boolean(),
});

// Schema for searchSound API response
const SearchSoundResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    sound_list: z.array(SearchSoundItemSchema),
    pagination: z.object({
      page: z.number(),
      size: z.number(),
      total: z.number(),
      has_more: z.boolean(),
    }),
  }),
});

// Types for search sound
export type SearchSoundItem = z.infer<typeof SearchSoundItemSchema>;
export type SearchSoundResult = z.infer<typeof SearchSoundResponse>;

// Schema for recommended music item
const RecommendedMusicSchema = z.object({
  author: z.string(),
  cover: z.string(),
  music_id: z.string(),
  music_url: z.string(),
  title: z.string(),
});

// Schema for getSoundRecommendations API response
const GetSoundRecommendationsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      musics: z.array(RecommendedMusicSchema),
    }),
  }),
});

// Types for sound recommendations
export type RecommendedMusic = z.infer<typeof RecommendedMusicSchema>;
export type SoundRecommendationsResult = z.infer<
  typeof GetSoundRecommendationsResponse
>;

// Schema for creator filter option
const CreatorFilterOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
});

// Schema for getCreatorFilters API response
const GetCreatorFiltersResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    audience_country: z.array(CreatorFilterOptionSchema),
    creator_country: z.array(CreatorFilterOptionSchema),
    sort_by: z.array(z.string()),
  }),
});

// Types for creator filters
export type CreatorFiltersResult = z.infer<typeof GetCreatorFiltersResponse>;

// Schema for creator item in creator list
const CreatorListItemSchema = z.object({
  tcm_id: z.string(),
  user_id: z.string(),
  nick_name: z.string(),
  avatar_url: z.string(),
  country_code: z.string(),
  follower_cnt: z.number(),
  liked_cnt: z.number(),
  tt_link: z.string(),
  tcm_link: z.string(),
  items: z.array(HashtagCreatorItemSchema),
});

// Schema for getCreatorList API response
const GetCreatorListResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      creators: z.array(CreatorListItemSchema),
      pagination: z.object({
        page: z.number(),
        size: z.number(),
        total: z.number(),
        has_more: z.boolean(),
      }),
    }),
  }),
});

// Types for creator list
export type CreatorListItem = z.infer<typeof CreatorListItemSchema>;
export type CreatorListResult = z.infer<typeof GetCreatorListResponse>;

// Schema for searchCreators API response (reuses CreatorListItemSchema)
const SearchCreatorsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      creators: z.array(CreatorListItemSchema),
      pagination: z.object({
        page: z.number(),
        size: z.number(),
        total: z.number(),
        has_more: z.boolean(),
      }),
    }),
  }),
});

// Types for search creators
export type SearchCreatorsResult = z.infer<typeof SearchCreatorsResponse>;

// Schema for trend video
const TrendVideoSchema = z.object({
  country_code: z.string(),
  cover: z.string(),
  duration: z.number(),
  id: z.string(),
  item_id: z.string(),
  item_url: z.string(),
  region: z.string(),
  title: z.string(),
});

// Schema for getPopularTrends API response
const GetPopularTrendsResponse = z.object({
  code: z.number(),
  router: z.string(),
  params: z.record(z.string(), z.any()),
  data: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.object({
      pagination: z.object({
        has_more: z.boolean(),
        limit: z.number(),
        page: z.number(),
        total_count: z.number(),
      }),
      videos: z.array(TrendVideoSchema),
    }),
  }),
});

// Types for popular trends
export type TrendVideo = z.infer<typeof TrendVideoSchema>;
export type PopularTrendsResult = z.infer<typeof GetPopularTrendsResponse>;

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

export async function getTopProducts(params?: {
  last?: number;
  page?: number;
  limit?: number;
  country_code?: string;
  first_ecom_category_id?: string;
  ecom_type?: string;
  period_type?: string;
  order_by?: "post" | "ctr" | "cvr";
  order_type?: "desc" | "asc";
}): Promise<TopProductsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_top_products?${queryString}`
    : "/api/v1/tiktok/ads/get_top_products";

  const data = await makeApiCall<z.infer<typeof GetTopProductsResponse>>(url, {
    method: "GET",
  });

  return GetTopProductsResponse.parse(data);
}

export async function getHashtagList(params?: {
  page?: number;
  limit?: number;
  period?: number;
  country_code?: string;
  sort_by?: "popular" | "new";
  industry_id?: string;
  filter_by?: "" | "new_on_board";
}): Promise<HashtagListResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_hashtag_list?${queryString}`
    : "/api/v1/tiktok/ads/get_hashtag_list";

  const data = await makeApiCall<z.infer<typeof GetHashtagListResponse>>(url, {
    method: "GET",
  });

  return GetHashtagListResponse.parse(data);
}

export async function getSoundRankList(params?: {
  period?: number;
  page?: number;
  limit?: number;
  rank_type?: "popular" | "surging";
  new_on_board?: boolean;
  commercial_music?: boolean;
  country_code?: string;
}): Promise<SoundRankListResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_sound_rank_list?${queryString}`
    : "/api/v1/tiktok/ads/get_sound_rank_list";

  const data = await makeApiCall<z.infer<typeof GetSoundRankListResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetSoundRankListResponse.parse(data);
}

export async function getKeywordList(params?: {
  keyword?: string;
  period?: number;
  page?: number;
  limit?: number;
  country_code?: string;
  industry?: string;
}): Promise<KeywordListResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_keyword_list?${queryString}`
    : "/api/v1/tiktok/ads/get_keyword_list";

  const data = await makeApiCall<z.infer<typeof GetKeywordListResponse>>(url, {
    method: "GET",
  });

  return GetKeywordListResponse.parse(data);
}

export async function getTopAdsSpotlight(params?: {
  industry?: string;
  page?: number;
  limit?: number;
}): Promise<TopAdsSpotlightResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_top_ads_spotlight?${queryString}`
    : "/api/v1/tiktok/ads/get_top_ads_spotlight";

  const data = await makeApiCall<z.infer<typeof GetTopAdsSpotlightResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetTopAdsSpotlightResponse.parse(data);
}

export async function getAdKeyframeAnalysis(params: {
  material_id: string;
  metric?:
    | "retain_ctr"
    | "retain_cvr"
    | "click_cnt"
    | "convert_cnt"
    | "play_retain_cnt";
}): Promise<AdKeyframeAnalysisResult> {
  if (!params.material_id) {
    throw new Error("material_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_ad_keyframe_analysis?${queryString}`
    : "/api/v1/tiktok/ads/get_ad_keyframe_analysis";

  const data = await makeApiCall<z.infer<typeof GetAdKeyframeAnalysisResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetAdKeyframeAnalysisResponse.parse(data);
}

export async function getAdPercentile(params: {
  material_id: string;
  metric?:
    | "ctr_percentile"
    | "time_attr_conversion_rate_percentile"
    | "click_cnt_percentile"
    | "time_attr_convert_cnt_percentile"
    | "show_cnt_percentile";
  period_type?: number;
}): Promise<AdPercentileResult> {
  if (!params.material_id) {
    throw new Error("material_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_ad_percentile?${queryString}`
    : "/api/v1/tiktok/ads/get_ad_percentile";

  const data = await makeApiCall<z.infer<typeof GetAdPercentileResponse>>(url, {
    method: "GET",
  });

  return GetAdPercentileResponse.parse(data);
}

export async function getAdInteractiveAnalysis(params: {
  material_id: string;
  metric_type?: "ctr" | "cvr" | "clicks" | "conversion" | "remain";
  period_type?: number;
}): Promise<AdInteractiveAnalysisResult> {
  if (!params.material_id) {
    throw new Error("material_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_ad_interactive_analysis?${queryString}`
    : "/api/v1/tiktok/ads/get_ad_interactive_analysis";

  const data = await makeApiCall<
    z.infer<typeof GetAdInteractiveAnalysisResponse>
  >(url, {
    method: "GET",
  });

  return GetAdInteractiveAnalysisResponse.parse(data);
}

export async function getRecommendedAds(params: {
  material_id: string;
  industry?: string;
  country_code?: string;
}): Promise<RecommendedAdsResult> {
  if (!params.material_id) {
    throw new Error("material_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_recommended_ads?${queryString}`
    : "/api/v1/tiktok/ads/get_recommended_ads";

  const data = await makeApiCall<z.infer<typeof GetRecommendedAdsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetRecommendedAdsResponse.parse(data);
}

export async function getQuerySuggestions(params?: {
  count?: number;
  scenario?: number;
}): Promise<QuerySuggestionsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_query_suggestions?${queryString}`
    : "/api/v1/tiktok/ads/get_query_suggestions";

  const data = await makeApiCall<z.infer<typeof GetQuerySuggestionsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetQuerySuggestionsResponse.parse(data);
}

export async function getKeywordFilters(): Promise<
  z.infer<typeof GetKeywordFiltersResponse>
> {
  const data = await makeApiCall<z.infer<typeof GetKeywordFiltersResponse>>(
    "/api/v1/tiktok/ads/get_keyword_filters",
    {
      method: "GET",
    },
  );

  return GetKeywordFiltersResponse.parse(data);
}

export async function getRelatedKeywords(params?: {
  keyword?: string;
  period?: number;
  country_code?: string;
  rank_type?: "popular" | "breakout";
  content_type?: "keyword" | "hashtag";
  page?: number;
  limit?: number;
}): Promise<RelatedKeywordsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_related_keywords?${queryString}`
    : "/api/v1/tiktok/ads/get_related_keywords";

  const data = await makeApiCall<z.infer<typeof GetRelatedKeywordsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetRelatedKeywordsResponse.parse(data);
}

export async function getKeywordDetails(params?: {
  keyword?: string;
  page?: number;
  limit?: number;
  period?: number;
  country_code?: string;
  order_by?: string;
  order_type?: "desc" | "asc";
  industry?: string;
  objective?: string;
  keyword_type?: string;
}): Promise<KeywordDetailsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_keyword_details?${queryString}`
    : "/api/v1/tiktok/ads/get_keyword_details";

  const data = await makeApiCall<z.infer<typeof GetKeywordDetailsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetKeywordDetailsResponse.parse(data);
}

export async function getCreativePatterns(params?: {
  first_industry_id?: string;
  period_type?: "week" | "month";
  order_field?: "ctr" | "play_over_rate";
  order_type?: "desc" | "asc";
  week?: string;
  page?: number;
  limit?: number;
}): Promise<CreativePatternsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_creative_patterns?${queryString}`
    : "/api/v1/tiktok/ads/get_creative_patterns";

  const data = await makeApiCall<z.infer<typeof GetCreativePatternsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetCreativePatternsResponse.parse(data);
}

export async function getProductFilters(): Promise<ProductFiltersResult> {
  const data = await makeApiCall<z.infer<typeof GetProductFiltersResponse>>(
    "/api/v1/tiktok/ads/get_product_filters",
    {
      method: "GET",
    },
  );

  return GetProductFiltersResponse.parse(data);
}

export async function getProductMetrics(params: {
  id: string;
  last?: number;
  metrics?: string;
  ecom_type?: string;
  period_type?: string;
  country_code?: string;
}): Promise<ProductMetricsResult> {
  if (!params.id) {
    throw new Error("id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_product_metrics?${queryString}`
    : "/api/v1/tiktok/ads/get_product_metrics";

  const data = await makeApiCall<z.infer<typeof GetProductMetricsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetProductMetricsResponse.parse(data);
}

export async function getProductDetail(params: {
  id: string;
  last?: number;
  ecom_type?: string;
  period_type?: string;
  country_code?: string;
}): Promise<ProductDetailResult> {
  if (!params.id) {
    throw new Error("id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_product_detail?${queryString}`
    : "/api/v1/tiktok/ads/get_product_detail";

  const data = await makeApiCall<z.infer<typeof GetProductDetailResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetProductDetailResponse.parse(data);
}

export async function getHashtagFilters(): Promise<HashtagFiltersResult> {
  const data = await makeApiCall<z.infer<typeof GetHashtagFiltersResponse>>(
    "/api/v1/tiktok/ads/get_hashtag_filters",
    {
      method: "GET",
    },
  );

  return GetHashtagFiltersResponse.parse(data);
}

export async function getHashtagCreator(params: {
  hashtag: string;
}): Promise<HashtagCreatorResult> {
  if (!params.hashtag) {
    throw new Error("hashtag is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_hashtag_creator?${queryString}`
    : "/api/v1/tiktok/ads/get_hashtag_creator";

  const data = await makeApiCall<z.infer<typeof GetHashtagCreatorResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetHashtagCreatorResponse.parse(data);
}

export async function getSoundFilters(params?: {
  rank_type?: "popular" | "surging";
}): Promise<SoundFiltersResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_sound_filters?${queryString}`
    : "/api/v1/tiktok/ads/get_sound_filters";

  const data = await makeApiCall<z.infer<typeof GetSoundFiltersResponse>>(url, {
    method: "GET",
  });

  return GetSoundFiltersResponse.parse(data);
}

export async function getSoundDetail(params: {
  clip_id: string;
  period?: number;
  country_code?: string;
}): Promise<SoundDetailResult> {
  if (!params.clip_id) {
    throw new Error("clip_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_sound_detail?${queryString}`
    : "/api/v1/tiktok/ads/get_sound_detail";

  const data = await makeApiCall<z.infer<typeof GetSoundDetailResponse>>(url, {
    method: "GET",
  });

  return GetSoundDetailResponse.parse(data);
}

export async function searchSoundHint(params: {
  keyword: string;
  period?: number;
  page?: number;
  limit?: number;
  rank_type?: "popular" | "surging";
  country_code?: string;
  filter_by_checked?: boolean;
  commercial_music?: boolean;
}): Promise<SoundHintResult> {
  if (!params.keyword) {
    throw new Error("keyword is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/search_sound_hint?${queryString}`
    : "/api/v1/tiktok/ads/search_sound_hint";

  const data = await makeApiCall<z.infer<typeof SearchSoundHintResponse>>(url, {
    method: "GET",
  });

  return SearchSoundHintResponse.parse(data);
}

export async function searchSound(params: {
  keyword: string;
  period?: number;
  page?: number;
  limit?: number;
  rank_type?: "popular" | "surging";
  new_on_board?: boolean;
  commercial_music?: boolean;
  country_code?: string;
}): Promise<SearchSoundResult> {
  if (!params.keyword) {
    throw new Error("keyword is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/search_sound?${queryString}`
    : "/api/v1/tiktok/ads/search_sound";

  const data = await makeApiCall<z.infer<typeof SearchSoundResponse>>(url, {
    method: "GET",
  });

  return SearchSoundResponse.parse(data);
}

export async function getSoundRecommendations(params: {
  clip_id: string;
  limit?: number;
}): Promise<SoundRecommendationsResult> {
  if (!params.clip_id) {
    throw new Error("clip_id is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_sound_recommendations?${queryString}`
    : "/api/v1/tiktok/ads/get_sound_recommendations";

  const data = await makeApiCall<
    z.infer<typeof GetSoundRecommendationsResponse>
  >(url, {
    method: "GET",
  });

  return GetSoundRecommendationsResponse.parse(data);
}

export async function getCreatorFilters(): Promise<CreatorFiltersResult> {
  const data = await makeApiCall<z.infer<typeof GetCreatorFiltersResponse>>(
    "/api/v1/tiktok/ads/get_creator_filters",
    {
      method: "GET",
    },
  );

  return GetCreatorFiltersResponse.parse(data);
}

export async function getCreatorList(params?: {
  page?: number;
  limit?: number;
  sort_by?: "follower" | "engagement" | "avg_views";
  creator_country?: string;
  audience_country?: string;
  audience_count?: number;
  keyword?: string;
}): Promise<CreatorListResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_creator_list?${queryString}`
    : "/api/v1/tiktok/ads/get_creator_list";

  const data = await makeApiCall<z.infer<typeof GetCreatorListResponse>>(url, {
    method: "GET",
  });

  return GetCreatorListResponse.parse(data);
}

export async function searchCreators(params: {
  keyword: string;
  page?: number;
  limit?: number;
  sort_by?: "follower" | "avg_views";
  creator_country?: string;
}): Promise<SearchCreatorsResult> {
  if (!params.keyword) {
    throw new Error("keyword is required");
  }

  const filteredParams = omitNull(params);
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/search_creators?${queryString}`
    : "/api/v1/tiktok/ads/search_creators";

  const data = await makeApiCall<z.infer<typeof SearchCreatorsResponse>>(url, {
    method: "GET",
  });

  return SearchCreatorsResponse.parse(data);
}

export async function getPopularTrends(params?: {
  period?: number;
  page?: number;
  limit?: number;
  order_by?: "vv" | "like" | "comment" | "repost";
  country_code?: string;
}): Promise<PopularTrendsResult> {
  const filteredParams = omitNull(params || {});
  const queryParams = new URLSearchParams();

  Object.entries(filteredParams).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/tiktok/ads/get_popular_trends?${queryString}`
    : "/api/v1/tiktok/ads/get_popular_trends";

  const data = await makeApiCall<z.infer<typeof GetPopularTrendsResponse>>(
    url,
    {
      method: "GET",
    },
  );

  return GetPopularTrendsResponse.parse(data);
}
