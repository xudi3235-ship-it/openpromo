import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import {
  type FacebookSearchPagesOptions,
  type FacebookSearchPlacesOptions,
  facebookSearchService,
} from "@core/domain/platform-search/facebook-search-service";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../helpers/error";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import { zValidator } from "../../../middleware/zod-validator";

/**
 * Platform Search Routes
 * Unified API for searching across social platforms
 * - Facebook/Instagram places (for location tagging)
 * - Facebook/Instagram pages (for @mentions, branded content)
 */

// ============================================================================
// Request Schemas
// ============================================================================

const SearchPlacesQuerySchema = z.object({
  q: z.string().min(1).describe("Search query"),
  connectedAccountId: z
    .string()
    .describe("Connected account ID (for access token)"),
  latitude: z.coerce.number().optional().describe("Latitude for geo search"),
  longitude: z.coerce.number().optional().describe("Longitude for geo search"),
  distance: z.coerce
    .number()
    .optional()
    .default(1000)
    .describe("Search radius in meters"),
  limit: z.coerce.number().optional().default(25).describe("Results limit"),
});

const SearchPagesQuerySchema = z.object({
  q: z.string().min(1).describe("Search query"),
  connectedAccountId: z
    .string()
    .describe("Connected account ID (for access token)"),
  limit: z.coerce.number().optional().default(25).describe("Results limit"),
});

const GetPlaceByIdParamSchema = z.object({
  placeId: z.string().describe("Facebook place ID"),
});

const GetPlaceByIdQuerySchema = z.object({
  connectedAccountId: z
    .string()
    .describe("Connected account ID (for access token)"),
});

// ============================================================================
// Routes
// ============================================================================

export const platformSearchRoute = new Hono<ApiEnv>()
  /**
   * Search for places (locations)
   * GET /api/workspaces/:workspaceSlug/platform-search/places
   *
   * Use cases:
   * - Location tagging for Facebook posts
   * - Location tagging for Instagram posts
   *
   * @example
   * GET /api/workspaces/acme/platform-search/places?q=Starbucks&connectedAccountId=123&latitude=37.7749&longitude=-122.4194
   */
  .use(withWorkspaceRole("workspace_editor"))
  .get("/places", zValidator("query", SearchPlacesQuerySchema), async (c) => {
    const { q, connectedAccountId, latitude, longitude, distance, limit } =
      c.req.valid("query");

    // Get access token from connected account
    const account = await ConnectedAccount.fromID(connectedAccountId);
    if (!account) {
      throw new AppError(404, {
        message: "Connected account not found",
      });
    }

    if (!account.encryptedAccessToken) {
      throw new AppError(400, {
        message: "Connected account missing access token",
      });
    }

    const searchOptions: FacebookSearchPlacesOptions = {
      query: q,
      accessToken: account.encryptedAccessToken,
      limit,
    };

    // Add geolocation if provided
    if (latitude !== undefined && longitude !== undefined) {
      searchOptions.center = { latitude, longitude };
      searchOptions.distance = distance;
    }

    const places = await facebookSearchService.searchPlaces(searchOptions);

    return c.json({
      data: places,
      query: q,
      count: places.length,
    });
  })

  /**
   * Get place details by ID
   * GET /api/workspaces/:workspaceSlug/platform-search/places/:placeId
   *
   * @example
   * GET /api/workspaces/acme/platform-search/places/123456789?connectedAccountId=123
   */
  .get(
    "/places/:placeId",
    zValidator("param", GetPlaceByIdParamSchema),
    zValidator("query", GetPlaceByIdQuerySchema),
    async (c) => {
      const { placeId } = c.req.valid("param");
      const { connectedAccountId } = c.req.valid("query");

      // Get access token from connected account
      const account = await ConnectedAccount.fromID(connectedAccountId);
      if (!account) {
        throw new AppError(404, {
          message: "Connected account not found",
        });
      }

      if (!account.encryptedAccessToken) {
        throw new AppError(400, {
          message: "Connected account missing access token",
        });
      }

      const place = await facebookSearchService.getPlaceById(
        placeId,
        account.encryptedAccessToken,
      );

      return c.json({ data: place });
    },
  )

  /**
   * Search for pages
   * GET /api/workspaces/:workspaceSlug/platform-search/pages
   *
   * Use cases:
   * - @mention other pages in posts
   * - Tag branded content partners
   * - Tag business partners
   *
   * @example
   * GET /api/workspaces/acme/platform-search/pages?q=Nike&connectedAccountId=123
   */
  .get("/pages", zValidator("query", SearchPagesQuerySchema), async (c) => {
    const { q, connectedAccountId, limit } = c.req.valid("query");

    // Get access token from connected account
    const account = await ConnectedAccount.fromID(connectedAccountId);
    if (!account) {
      throw new AppError(404, {
        message: "Connected account not found",
      });
    }

    if (!account.encryptedAccessToken) {
      throw new AppError(400, {
        message: "Connected account missing access token",
      });
    }

    const searchOptions: FacebookSearchPagesOptions = {
      query: q,
      accessToken: account.encryptedAccessToken,
      limit,
    };

    const pages = await facebookSearchService.searchPages(searchOptions);

    return c.json({
      data: pages,
      query: q,
      count: pages.length,
    });
  })

  /**
   * Get page details by ID
   * GET /api/workspaces/:workspaceSlug/platform-search/pages/:pageId
   *
   * @example
   * GET /api/workspaces/acme/platform-search/pages/123456789?connectedAccountId=123
   */
  .get(
    "/pages/:pageId",
    zValidator("param", z.object({ pageId: z.string() })),
    zValidator("query", GetPlaceByIdQuerySchema),
    async (c) => {
      const { pageId } = c.req.valid("param");
      const { connectedAccountId } = c.req.valid("query");

      // Get access token from connected account
      const account = await ConnectedAccount.fromID(connectedAccountId);
      if (!account) {
        throw new AppError(404, {
          message: "Connected account not found",
        });
      }

      if (!account.encryptedAccessToken) {
        throw new AppError(400, {
          message: "Connected account missing access token",
        });
      }

      const page = await facebookSearchService.getPageById(
        pageId,
        account.encryptedAccessToken,
      );

      return c.json({ data: page });
    },
  );
