import type { ApiRoutes } from "@openpromo/web-api/src/types";
import { hc } from "hono/client";
import { API_BASE_URL } from "@/constants";

export const apiClient = hc<ApiRoutes>(API_BASE_URL);
