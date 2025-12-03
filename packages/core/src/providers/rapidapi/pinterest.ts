import { rapidApiFetch } from "./client";

export interface PinterestRelevancePinsResponse {
  status: string;
  message: string;
  data: PinterestPin[];
}

export interface PinterestPin {
  node_id: string;
  has_required_attribution_provider: boolean;
  access: unknown[];
  alt_text?: string;
  domain: string;
  embed: unknown;
  grid_title: string;
  auto_alt_text: string;
  is_promoted: boolean;
  sponsorship: unknown;
  debug_info_html: unknown;
  is_eligible_for_related_products: boolean;
  ad_match_reason: number;
  title: string;
  videos: unknown;
  story_pin_data_id?: string;
  is_prefetch_enabled: boolean;
  is_oos_product: boolean;
  carousel_data: unknown;
  promoter: unknown;
  is_stale_product: boolean;
  image_crop: {
    min_y: number;
    max_y: number;
  };
  description: string;
  insertion_id: unknown;
  board: PinterestBoard;
  reaction_counts: Record<string, number>;
  should_open_in_stream: boolean;
  created_at: string;
  link_user_website: unknown;
  collection_pin: unknown;
  is_uploaded: boolean;
  did_its: unknown[];
  dominant_color: string;
  shopping_flags: unknown[];
  rich_summary?: {
    url: string;
    type: string;
    favicon_images: { orig: string };
    products: unknown[];
    apple_touch_icon_images?: { orig: string };
    site_name: string;
    display_description: string;
    actions: unknown[];
    display_name: string;
    id: string;
    type_name: string;
    favicon_link: string;
    apple_touch_icon_link?: string;
  };
  campaign_id: unknown;
  type: string;
  is_downstream_promotion: boolean;
  promoted_is_lead_ad: boolean;
  image_signature: string;
  images: {
    "170x": PinterestImage;
    "236x": PinterestImage;
    "474x": PinterestImage;
    "736x": PinterestImage;
    orig: PinterestImage;
  };
  link_domain?: {
    node_id: string;
    official_user?: {
      node_id: string;
      ads_only_profile_site: unknown;
      follower_count: number;
      id: string;
      image_small_url: string;
      full_name: string;
      image_large_url: string;
      is_verified_merchant: boolean;
      is_ads_only_profile: boolean;
      username: string;
      image_medium_url: string;
      verified_identity: { verified?: boolean; name?: string };
    };
  };
  attribution: unknown;
  is_eligible_for_web_closeup: boolean;
  aggregated_pin_data: { node_id: string; has_xy_tags: boolean };
  id: string;
  promoted_lead_form: unknown;
  is_eligible_for_pdp: boolean;
  call_to_action_text: unknown;
  promoted_is_removable: boolean;
  tracking_params: string;
  is_eligible_for_filters: boolean;
  link?: string;
  story_pin_data?: {
    node_id: string;
    pages: PinterestStoryPage[];
    id: string;
    has_product_pins: boolean;
    page_count: number;
    type: string;
    last_edited: unknown;
    static_page_count: number;
    pages_preview: PinterestStoryPage[];
    total_video_duration: number;
    metadata: {
      pin_title: string;
      version: string;
      canvas_aspect_ratio: number;
      diy_data: unknown;
      is_promotable: boolean;
      pin_image_signature: string;
      root_user_id: string;
      root_pin_id: string;
      is_compatible: boolean;
      compatible_version: string;
      template_type: unknown;
      basics: unknown;
      is_editable: boolean;
      recipe_data: unknown;
      showreel_data: unknown;
    };
    has_affiliate_products: boolean;
  };
  pinner: {
    node_id: string;
    ads_only_profile_site: unknown;
    follower_count: number;
    id: string;
    image_small_url: string;
    full_name: string;
    image_large_url: string;
    is_verified_merchant: boolean;
    is_ads_only_profile: boolean;
    username: string;
    image_medium_url: string;
    verified_identity: Record<string, unknown>;
  };
  is_go_linkless?: boolean;
  link_utm_applicable_and_replaced?: number;
  seo_alt_text?: string;
}

export interface PinterestImage {
  width: number;
  height?: number;
  url: string;
  dominant_color?: string;
}

export interface PinterestStoryPage {
  blocks: PinterestStoryBlock[];
  music_attributions: unknown[];
  id: string;
  video_signature: unknown;
  video: unknown;
  type: string;
  image_adjusted: unknown;
  image: unknown;
  image_signature_adjusted: string;
  image_signature: string;
  should_mute: boolean;
  style: { media_fit: unknown; background_color: string };
  layout: number;
}

export interface PinterestStoryBlock {
  type: string;
  image: unknown;
  block_type: number;
  block_style: {
    height: number;
    rotation: number;
    y_coord: number;
    width: number;
    corner_radius: number;
    x_coord: number;
  };
  text: string;
  image_signature: string;
  tracking_id: string;
}

export interface PinterestBoard {
  node_id: string;
  name?: string;
  url?: string;
  id?: string;
  cover_images?: Record<
    string,
    { url: string; width?: number; height?: number; dominant_color?: string }
  >;
  images?: Record<string, PinterestImage[]>;
  image_cover_url?: string;
  image_cover_hd_url?: string;
  pin_count?: number;
  section_count?: number;
  collaborating_users?: unknown[];
  collaborator_count?: number;
  is_collaborative?: boolean;
  owner?: {
    node_id?: string;
    is_ads_only_profile?: boolean;
    image_large_url?: string;
    username?: string;
    id?: string;
    is_verified_merchant?: boolean;
    verified_identity?: Record<string, unknown>;
    image_small_url?: string;
    image_medium_url?: string;
    follower_count?: number;
    full_name?: string;
  };
  type?: string;
  board_order_modified_at?: string;
}

export type PinterestRelevancePinsParams = {
  keyword: string;
  num?: number;
};

export namespace Pinterest {
  /**
   * Fetch relevance pins from Pinterest via RapidAPI.
   * Endpoint: /pins/relevant on the configured RapidAPI host.
   */
  export async function fetchRelevancePins(
    params: PinterestRelevancePinsParams,
  ): Promise<PinterestRelevancePinsResponse> {
    return rapidApiFetch<PinterestRelevancePinsResponse>({
      path: "/pinterest/pins/relevance",
      searchParams: {
        keyword: params.keyword,
        num: params.num,
      },
    });
  }

  export interface SimplifiedPin {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    dominantColor?: string;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
    boardName?: string;
    boardUrl?: string;
    pinnerName?: string;
    pinnerUsername?: string;
    reactions?: Record<string, number>;
    link?: string;
    seoAltText?: string;
  }

  /**
   * Fetch relevance pins and simplify to essential fields with the highest-res image.
   */
  export async function fetchRelevancePinsSimple(
    params: PinterestRelevancePinsParams,
  ): Promise<SimplifiedPin[]> {
    const resp = await fetchRelevancePins(params);
    const pins = resp.data ?? [];

    return pins.map((pin) => {
      const images = pin.images;
      const candidates = [
        images?.orig,
        images?.["736x"],
        images?.["474x"],
        images?.["236x"],
        images?.["170x"],
      ].filter(Boolean) as PinterestImage[];

      const best = candidates.find((img) => img?.url) ?? images?.orig;

      return {
        id: pin.id,
        title: pin.title ?? "",
        description: pin.description ?? "",
        createdAt: pin.created_at,
        dominantColor: pin.dominant_color,
        imageUrl: best?.url ?? "",
        imageWidth: best?.width,
        imageHeight: best?.height,
        boardName: pin.board?.name,
        boardUrl: pin.board?.url,
        pinnerName: pin.pinner?.full_name,
        pinnerUsername: pin.pinner?.username,
        reactions: pin.reaction_counts,
        link: pin.link,
        seoAltText: (pin as { seo_alt_text?: string }).seo_alt_text,
      };
    });
  }
}
