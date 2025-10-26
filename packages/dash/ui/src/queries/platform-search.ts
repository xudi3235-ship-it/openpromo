import { useWorkspace } from "@/hooks/useWorkspace";
import { type apiClient, useHonoQuery } from "@/lib/hono-client";

/**
 * Platform Search Queries
 * React Query hooks for searching places, pages, and users across platforms
 */

// ============================================================================
// Inferred Types from API Responses
// ============================================================================

type SearchPlacesApiResponse = Awaited<
  ReturnType<
    (typeof apiClient)["workspaces"][":workspaceSlug"]["platform-search"]["places"]["$get"]
  >
>;

type SearchPagesApiResponse = Awaited<
  ReturnType<
    (typeof apiClient)["workspaces"][":workspaceSlug"]["platform-search"]["pages"]["$get"]
  >
>;

// Extract data from the JSON response
type ExtractData<T> = T extends { json: () => Promise<infer U> } ? U : never;

// Inferred response types
type SearchPlacesResponse = ExtractData<SearchPlacesApiResponse>;
type SearchPagesResponse = ExtractData<SearchPagesApiResponse>;

// Export individual item types for external use
export type FacebookPlace = NonNullable<SearchPlacesResponse["data"]>[number];
export type FacebookPage = NonNullable<SearchPagesResponse["data"]>[number];

// ============================================================================
// Query Keys
// ============================================================================

export const PLATFORM_SEARCH_KEYS = {
  places: (
    workspaceSlug: string,
    query: string,
    params?: Record<string, unknown>,
  ) => ["platform-search", "places", workspaceSlug, query, params] as const,
  placeById: (
    workspaceSlug: string,
    placeId: string,
    connectedAccountId: string,
  ) =>
    [
      "platform-search",
      "place",
      workspaceSlug,
      placeId,
      connectedAccountId,
    ] as const,
  pages: (
    workspaceSlug: string,
    query: string,
    params?: Record<string, unknown>,
  ) => ["platform-search", "pages", workspaceSlug, query, params] as const,
  pageById: (
    workspaceSlug: string,
    pageId: string,
    connectedAccountId: string,
  ) =>
    [
      "platform-search",
      "page",
      workspaceSlug,
      pageId,
      connectedAccountId,
    ] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export interface UseSearchPlacesOptions {
  query: string;
  connectedAccountId: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Search for places (locations) on Facebook/Instagram
 *
 * @example
 * const { data: places, isLoading } = useSearchPlaces({
 *   query: "Starbucks",
 *   connectedAccountId: "123",
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   distance: 5000,
 * });
 */
export function useSearchPlaces(options: UseSearchPlacesOptions) {
  const { workspace } = useWorkspace();
  const {
    query,
    connectedAccountId,
    latitude,
    longitude,
    distance,
    limit,
    enabled = true,
  } = options;

  // Build query params with proper types
  const queryParams = {
    q: query,
    connectedAccountId,
    ...(latitude !== undefined && { latitude: latitude.toString() }),
    ...(longitude !== undefined && { longitude: longitude.toString() }),
    ...(distance !== undefined && { distance: distance.toString() }),
    ...(limit !== undefined && { limit: limit.toString() }),
  };

  return useHonoQuery({
    queryKey: PLATFORM_SEARCH_KEYS.places(workspace.slug, query, {
      connectedAccountId,
      latitude,
      longitude,
      distance,
      limit,
    }),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"]["platform-search"].places.$get({
        param: { workspaceSlug: workspace.slug },
        query: queryParams,
      }),
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - places don't change often
  });
}

export interface UseGetPlaceByIdOptions {
  placeId: string;
  connectedAccountId: string;
  enabled?: boolean;
}

/**
 * Get detailed information about a specific place
 *
 * @example
 * const { data: place } = useGetPlaceById({
 *   placeId: "123456789",
 *   connectedAccountId: "123",
 * });
 */
export function useGetPlaceById(options: UseGetPlaceByIdOptions) {
  const { workspace } = useWorkspace();
  const { placeId, connectedAccountId, enabled = true } = options;

  return useHonoQuery({
    queryKey: PLATFORM_SEARCH_KEYS.placeById(
      workspace.slug,
      placeId,
      connectedAccountId,
    ),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"]["platform-search"].places[
        ":placeId"
      ].$get({
        param: { workspaceSlug: workspace.slug, placeId },
        query: { connectedAccountId },
      }),
    enabled: enabled && !!placeId && !!connectedAccountId,
    staleTime: 30 * 60 * 1000, // 30 minutes - place details are stable
  });
}

export interface UseSearchPagesOptions {
  query: string;
  connectedAccountId: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Search for Facebook/Instagram pages
 * Use for @mentions or branded content partner tagging
 *
 * @example
 * const { data: pages, isLoading } = useSearchPages({
 *   query: "Nike",
 *   connectedAccountId: "123",
 * });
 */
export function useSearchPages(options: UseSearchPagesOptions) {
  const { workspace } = useWorkspace();
  const { query, connectedAccountId, limit, enabled = true } = options;

  // Build query params with proper types
  const queryParams = {
    q: query,
    connectedAccountId,
    ...(limit !== undefined && { limit: limit.toString() }),
  };

  return useHonoQuery({
    queryKey: PLATFORM_SEARCH_KEYS.pages(workspace.slug, query, {
      connectedAccountId,
      limit,
    }),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"]["platform-search"].pages.$get({
        param: { workspaceSlug: workspace.slug },
        query: queryParams,
      }),
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface UseGetPageByIdOptions {
  pageId: string;
  connectedAccountId: string;
  enabled?: boolean;
}

/**
 * Get detailed information about a specific page
 *
 * @example
 * const { data: page } = useGetPageById({
 *   pageId: "123456789",
 *   connectedAccountId: "123",
 * });
 */
export function useGetPageById(options: UseGetPageByIdOptions) {
  const { workspace } = useWorkspace();
  const { pageId, connectedAccountId, enabled = true } = options;

  return useHonoQuery({
    queryKey: PLATFORM_SEARCH_KEYS.pageById(
      workspace.slug,
      pageId,
      connectedAccountId,
    ),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"]["platform-search"].pages[":pageId"].$get(
        {
          param: { workspaceSlug: workspace.slug, pageId },
          query: { connectedAccountId },
        },
      ),
    enabled: enabled && !!pageId && !!connectedAccountId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
