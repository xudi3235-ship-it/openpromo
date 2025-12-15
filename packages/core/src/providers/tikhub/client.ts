import { env } from "@core/utils/env";

const API_BASE_URL = "https://api.tikhub.io";

async function makeApiCall<T>(
  endpoint: string,
  options: RequestInit,
): Promise<T> {
  const url = endpoint.startsWith("/")
    ? `${API_BASE_URL}${endpoint}`
    : endpoint;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.TIKHUB_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `TikHub API call failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export { makeApiCall, API_BASE_URL };
