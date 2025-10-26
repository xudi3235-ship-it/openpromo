import { Log } from "@core/utils/log";
import * as z from "zod";

const log = Log.create({ namespace: "facebook-search" });

/**
 * Facebook Graph API Search Service
 * Unified service for searching places, pages, users, etc.
 * Reference: https://developers.facebook.com/docs/graph-api/reference/search
 */

// ============================================================================
// Types & Schemas
// ============================================================================

export type FacebookSearchType = "place" | "page" | "user" | "event";

export const FacebookPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z
    .object({
      city: z.string().optional(),
      country: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      street: z.string().optional(),
      zip: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  category: z.string().optional(),
  category_list: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  cover: z
    .object({
      id: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
  picture: z
    .object({
      data: z.object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    })
    .optional(),
});

export const FacebookPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().optional(),
  category: z.string().optional(),
  category_list: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  about: z.string().optional(),
  picture: z
    .object({
      data: z.object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    })
    .optional(),
  cover: z
    .object({
      id: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
  fan_count: z.number().optional(),
  verification_status: z.string().optional(),
  link: z.string().optional(),
});

export const FacebookUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  picture: z
    .object({
      data: z.object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    })
    .optional(),
});

export const FacebookSearchResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  paging: z
    .object({
      cursors: z
        .object({
          before: z.string().optional(),
          after: z.string().optional(),
        })
        .optional(),
      next: z.string().optional(),
      previous: z.string().optional(),
    })
    .optional(),
});

export type FacebookPlace = z.infer<typeof FacebookPlaceSchema>;
export type FacebookPage = z.infer<typeof FacebookPageSchema>;
export type FacebookUser = z.infer<typeof FacebookUserSchema>;
export type FacebookSearchResponse = z.infer<
  typeof FacebookSearchResponseSchema
>;

// ============================================================================
// Search Service
// ============================================================================

export interface FacebookSearchOptions {
  query: string;
  type: FacebookSearchType;
  accessToken: string;
  // Geolocation for place search
  center?: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // meters, default 1000
  // Pagination
  limit?: number; // default 25, max 100
  after?: string; // cursor for next page
  // Custom fields to fetch
  fields?: string[];
  // API version
  apiVersion?: string;
}

export interface FacebookSearchPlacesOptions
  extends Omit<FacebookSearchOptions, "type" | "fields"> {
  fields?: Array<
    | "id"
    | "name"
    | "location"
    | "category"
    | "category_list"
    | "cover"
    | "picture"
    | "about"
    | "checkins"
    | "phone"
    | "website"
  >;
}

export interface FacebookSearchPagesOptions
  extends Omit<FacebookSearchOptions, "type" | "fields"> {
  fields?: Array<
    | "id"
    | "name"
    | "username"
    | "category"
    | "category_list"
    | "about"
    | "picture"
    | "cover"
    | "fan_count"
    | "verification_status"
    | "link"
  >;
}

export interface FacebookSearchUsersOptions
  extends Omit<FacebookSearchOptions, "type" | "fields"> {
  fields?: Array<"id" | "name" | "picture">;
}

export class FacebookSearchService {
  private readonly baseUrl = "https://graph.facebook.com";
  private readonly defaultApiVersion = "v23.0";

  /**
   * Search for places (locations) on Facebook
   * Use for location tagging in posts
   *
   * @example
   * const places = await service.searchPlaces({
   *   query: "Starbucks",
   *   accessToken: pageToken,
   *   center: { latitude: 37.7749, longitude: -122.4194 },
   *   distance: 5000, // 5km radius
   * });
   */
  async searchPlaces(
    options: FacebookSearchPlacesOptions,
  ): Promise<FacebookPlace[]> {
    const defaultFields = [
      "id",
      "name",
      "location",
      "category",
      "category_list",
      "picture",
    ];

    const response = await this.search({
      ...options,
      type: "place",
      fields: options.fields ?? defaultFields,
    });

    return response.data.map((item) => FacebookPlaceSchema.parse(item));
  }

  /**
   * Search for Facebook Pages
   * Use for @mentions or branded content partner tagging
   *
   * @example
   * // For @mentions
   * const pages = await service.searchPages({
   *   query: "@nike",
   *   accessToken: pageToken,
   * });
   *
   * // For branded content partners
   * const partners = await service.searchPages({
   *   query: "Nike",
   *   accessToken: pageToken,
   *   fields: ["id", "name", "verification_status"],
   * });
   */
  async searchPages(
    options: FacebookSearchPagesOptions,
  ): Promise<FacebookPage[]> {
    const defaultFields = [
      "id",
      "name",
      "username",
      "category",
      "picture",
      "verification_status",
    ];

    const response = await this.search({
      ...options,
      type: "page",
      fields: options.fields ?? defaultFields,
    });

    return response.data.map((item) => FacebookPageSchema.parse(item));
  }

  /**
   * Search for Facebook Users
   * Use for user tagging (if permissions allow)
   *
   * Note: User search is restricted and requires special permissions
   */
  async searchUsers(
    options: FacebookSearchUsersOptions,
  ): Promise<FacebookUser[]> {
    const defaultFields = ["id", "name", "picture"];

    const response = await this.search({
      ...options,
      type: "user",
      fields: options.fields ?? defaultFields,
    });

    return response.data.map((item) => FacebookUserSchema.parse(item));
  }

  /**
   * Generic search method - use specific methods above for type safety
   */
  private async search(
    options: FacebookSearchOptions,
  ): Promise<FacebookSearchResponse> {
    const {
      query,
      type,
      accessToken,
      center,
      distance = 1000,
      limit = 25,
      after,
      fields = [],
      apiVersion = this.defaultApiVersion,
    } = options;

    const url = new URL(`${this.baseUrl}/${apiVersion}/search`);
    url.searchParams.set("type", type);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", accessToken);

    if (limit) {
      url.searchParams.set("limit", Math.min(limit, 100).toString());
    }

    if (after) {
      url.searchParams.set("after", after);
    }

    if (fields.length > 0) {
      url.searchParams.set("fields", fields.join(","));
    }

    // Add geolocation params for place search
    if (type === "place" && center) {
      url.searchParams.set("center", `${center.latitude},${center.longitude}`);
      url.searchParams.set("distance", distance.toString());
    }

    log.info("facebook search request", {
      type,
      query,
      center,
      distance,
      limit,
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorBody = await response.text();
      log.warn("facebook search failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(
        `Facebook search failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return FacebookSearchResponseSchema.parse(data);
  }

  /**
   * Get place details by ID
   * Useful after user selects a place from search results
   */
  async getPlaceById(
    placeId: string,
    accessToken: string,
    fields?: FacebookSearchPlacesOptions["fields"],
  ): Promise<FacebookPlace> {
    const defaultFields = [
      "id",
      "name",
      "location",
      "category",
      "category_list",
      "picture",
      "about",
      "phone",
      "website",
    ];

    const fieldsParam = (fields ?? defaultFields).join(",");
    const url = new URL(`${this.baseUrl}/${this.defaultApiVersion}/${placeId}`);
    url.searchParams.set("fields", fieldsParam);
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorBody = await response.text();
      log.warn("get place by id failed", {
        placeId,
        status: response.status,
        body: errorBody,
      });
      throw new Error(`Failed to get place: ${response.status}`);
    }

    const data = await response.json();
    return FacebookPlaceSchema.parse(data);
  }

  /**
   * Get page details by ID
   * Useful for branded content partner validation
   */
  async getPageById(
    pageId: string,
    accessToken: string,
    fields?: FacebookSearchPagesOptions["fields"],
  ): Promise<FacebookPage> {
    const defaultFields = [
      "id",
      "name",
      "username",
      "category",
      "picture",
      "about",
      "verification_status",
      "fan_count",
      "link",
    ];

    const fieldsParam = (fields ?? defaultFields).join(",");
    const url = new URL(`${this.baseUrl}/${this.defaultApiVersion}/${pageId}`);
    url.searchParams.set("fields", fieldsParam);
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorBody = await response.text();
      log.warn("get page by id failed", {
        pageId,
        status: response.status,
        body: errorBody,
      });
      throw new Error(`Failed to get page: ${response.status}`);
    }

    const data = await response.json();
    return FacebookPageSchema.parse(data);
  }
}

/**
 * Singleton instance for convenience
 */
export const facebookSearchService = new FacebookSearchService();
