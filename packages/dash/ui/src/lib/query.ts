export const QUERY_KEYS = {
  USER: ["user"],
  CURRENT_ORG: ["current-org"],
  ORGS: ["orgs"],
  WORKSPACES: ["workspaces"],
  CONTENT_LIST: ["content-list"],
  CONTENT_GROUP: (id: string) => ["content-group", id],
  CONNECTED_ACCOUNTS: (workspaceSlug: string) => [
    workspaceSlug,
    "connected_accounts",
  ],
} as const;
