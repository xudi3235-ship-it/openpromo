export const QUERY_KEYS = {
  USER: ["user"],
  CURRENT_ORG: ["current-org"],
  ORGS: ["orgs"],
  WORKSPACES: ["workspaces"],
  CONTENT_LIST: (page?: number, pageSize?: number) => [
    "content-list",
    { page, pageSize },
  ],
  CONTENT_GROUP: (id: string) => ["content-group", id],
  CONNECTED_ACCOUNTS: (workspaceSlug: string) => [
    workspaceSlug,
    "connected_accounts",
  ],
  WORKSPACE_MEMBERS: (workspaceSlug: string) => [
    workspaceSlug,
    "workspace_members",
  ],
  WORKSPACE_INSIGHTS_SUMMARY: (workspaceSlug: string) => [
    workspaceSlug,
    "insights",
    "summary",
  ],
  WORKSPACE_INSIGHTS_TIMESERIES: (
    workspaceSlug: string,
    start: Date,
    end: Date,
    interval: "day" | "week",
  ) => [
    workspaceSlug,
    "insights",
    "timeseries",
    start.toISOString(),
    end.toISOString(),
    interval,
  ],
  WORKSPACE_INSIGHTS_TOP_CONTENT: (
    workspaceSlug: string,
    limit: number,
    sortBy: "impressions" | "engagement",
  ) => [workspaceSlug, "insights", "top-content", limit, sortBy],
  WORKSPACE_INSIGHTS_INBOX_SUMMARY: (workspaceSlug: string) => [
    workspaceSlug,
    "insights",
    "inbox",
    "summary",
  ],
} as const;
