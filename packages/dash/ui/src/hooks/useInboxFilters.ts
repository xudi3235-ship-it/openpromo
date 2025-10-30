import type { AllPlatforms } from "@shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";

export type InboxChannel = "dm" | "post_comment" | null;

export function useInboxFilters() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const selectedPlatform = useMemo(() => {
    if (
      searchParams.platform &&
      searchParams.platform !== "all" &&
      ["FACEBOOK", "INSTAGRAM", "TIKTOK"].includes(searchParams.platform)
    ) {
      return searchParams.platform as AllPlatforms;
    }
    return null;
  }, [searchParams.platform]);

  const selectedChannel = useMemo(() => {
    if (
      searchParams.channel &&
      searchParams.channel !== "all" &&
      ["dm", "post_comment"].includes(searchParams.channel)
    ) {
      return searchParams.channel as "dm" | "post_comment";
    }
    return null;
  }, [searchParams.channel]);

  const search = useMemo(() => {
    return searchParams.q || "";
  }, [searchParams.q]);

  const setPlatform = useCallback(
    (platform: AllPlatforms | null) => {
      navigate({
        search: {
          ...searchParams,
          platform: platform || "all",
        },
      });
    },
    [navigate, searchParams],
  );

  const setChannel = useCallback(
    (channel: InboxChannel) => {
      navigate({
        search: {
          ...searchParams,
          channel: channel || "all",
        },
      });
    },
    [navigate, searchParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      navigate({
        search: {
          ...searchParams,
          q: search || undefined,
        },
      });
    },
    [navigate, searchParams],
  );

  const clearFilters = useCallback(() => {
    navigate({
      search: {
        channel: "all",
        platform: "all",
        q: undefined,
      },
    });
  }, [navigate]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(search.trim() || selectedChannel || selectedPlatform);
  }, [search, selectedChannel, selectedPlatform]);

  return {
    selectedPlatform,
    selectedChannel,
    search,
    setPlatform,
    setChannel,
    setSearch,
    clearFilters,
    hasActiveFilters,
  };
}
