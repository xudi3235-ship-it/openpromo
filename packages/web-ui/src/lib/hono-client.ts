import type { ApiRoutes, AuthRoutes } from "@openpromo/web-api/src/types";
import { hc } from "hono/client";
import { API_BASE_URL, AUTH_BASE_URL } from "@/constants";

export const apiClient = hc<ApiRoutes>(API_BASE_URL);
export const authClient = hc<AuthRoutes>(AUTH_BASE_URL);
