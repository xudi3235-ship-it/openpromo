import type { HashtagSuggestion } from "@shared/hashtags";
import type { UseQueryResult } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { useMemo } from "react";
import { type apiClient, useHonoQuery } from "@/lib/hono-client";

const QUERY_KEY = "hashtag-search";

type RemoteHashtagSearchResponse = InferResponseType<
  (typeof apiClient)["hashtags"]["search"]["$get"]
>;

export const useHashtagSearchQuery = (
  query: string,
  enabled: boolean,
): UseQueryResult<RemoteHashtagSearchResponse, Error> =>
  useHonoQuery<RemoteHashtagSearchResponse>({
    queryKey: [QUERY_KEY, query],
    enabled,
    queryFn: (api) =>
      api.hashtags.search.$get({
        query: { q: query },
      }),
  });

export type HashtagSuggestionsResult = UseQueryResult<
  RemoteHashtagSearchResponse,
  Error
> & {
  suggestions: HashtagSuggestion[];
  shouldFetch: boolean;
};

export const useHashtagSuggestions = (
  query: string,
  enabled: boolean,
  options?: {
    minimumLength?: number;
  },
): HashtagSuggestionsResult => {
  const minLength = options?.minimumLength ?? 2;
  const trimmed = query.trim();
  const shouldFetch = enabled && trimmed.length >= minLength;

  const result = useHashtagSearchQuery(trimmed, shouldFetch);

  const suggestions = useMemo(() => {
    const raw = result.data?.suggestions ?? [];
    return raw.map((suggestion) => ({
      ...suggestion,
      stats: suggestion.stats.map((stat) => ({
        ...stat,
        lastFetchedAt: new Date(stat.lastFetchedAt),
      })),
    }));
  }, [result.data]);

  return {
    ...result,
    suggestions,
    shouldFetch,
  };
};
