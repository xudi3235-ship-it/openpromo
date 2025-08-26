export const ORGANIZATION_ROLE = {
  OWNER: "org_owner",
  ADMIN: "org_admin",
  MEMBER: "org_member",
} as const;

export type OrganizationRole =
  (typeof ORGANIZATION_ROLE)[keyof typeof ORGANIZATION_ROLE];

export const WORKSPACE_ROLE = {
  ADMIN: "workspace_admin",
  EDITOR: "workspace_editor",
  VIEWER: "workspace_viewer",
} as const;

export type WorkspaceRole =
  (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];
