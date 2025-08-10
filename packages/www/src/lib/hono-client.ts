import type { Routes } from "@openpromo/functions/src/api/routes";
import { hc } from "hono/client";

const client = hc<Routes>("");
type Client = typeof client;

const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<Routes>(...args);

export const apiClient = hcWithType(import.meta.env.VITE_API_URL, {
  init: {
    credentials: "include",
  },
});
