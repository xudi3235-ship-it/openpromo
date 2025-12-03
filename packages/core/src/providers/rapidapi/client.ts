import { env } from "@core/utils/env";

export type RapidApiRequestOptions = {
  path: string;
  searchParams?: Record<string, string | number | undefined>;
  init?: RequestInit;
  host?: string;
  apiKey?: string;
};

export async function rapidApiFetch<T>(
  options: RapidApiRequestOptions,
): Promise<T> {
  const host = options.host ?? env.RAPIDAPI_PINTEREST_HOST;
  const apiKey = options.apiKey ?? env.RAPIDAPI_KEY;
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;

  const url = new URL(`https://${host}${path}`);
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: HeadersInit = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": host,
    ...(options.init?.headers ?? {}),
  };

  const response = await fetch(url.toString(), {
    ...options.init,
    headers,
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `RapidAPI request failed (${response.status}): ${response.statusText}. Body: ${raw}`,
    );
  }

  try {
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch (error) {
    throw new Error(
      `RapidAPI response JSON parse failed: ${
        (error as Error).message
      }. Body: ${raw}`,
    );
  }
}
