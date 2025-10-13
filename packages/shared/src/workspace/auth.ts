/**
 * Organization and Workspace Role & Permission Constants
 * Shared across all packages for consistent authorization
 */

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

/**
 * Workspace-level permissions
 * Format: resource:action
 */
export const WORKSPACE_PERMISSION = {
  // Wildcard - all permissions
  ALL: "*",

  // Content permissions
  CONTENT_VIEW: "content:view",
  CONTENT_CREATE: "content:create",
  CONTENT_EDIT: "content:edit",
  CONTENT_DELETE: "content:delete",
  CONTENT_PUBLISH: "content:publish",

  // Media permissions
  MEDIA_VIEW: "media:view",
  MEDIA_UPLOAD: "media:upload",
  MEDIA_DELETE: "media:delete",

  // Product permissions
  PRODUCT_VIEW: "product:view",
  PRODUCT_CREATE: "product:create",
  PRODUCT_EDIT: "product:edit",
  PRODUCT_DELETE: "product:delete",

  // Style permissions
  STYLE_VIEW: "style:view",
  STYLE_CREATE: "style:create",
  STYLE_EDIT: "style:edit",
  STYLE_DELETE: "style:delete",

  // Team permissions
  TEAM_VIEW: "team:view",
  TEAM_INVITE: "team:invite",
  TEAM_REMOVE: "team:remove",
  TEAM_MANAGE_ROLES: "team:manage_roles",

  // Connected accounts permissions
  CONNECTED_ACCOUNT_VIEW: "connected_account:view",
  CONNECTED_ACCOUNT_CONNECT: "connected_account:connect",
  CONNECTED_ACCOUNT_DISCONNECT: "connected_account:disconnect",

  // Settings permissions
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",

  // Workspace permissions
  WORKSPACE_DELETE: "workspace:delete",
} as const;

export type WorkspacePermission =
  (typeof WORKSPACE_PERMISSION)[keyof typeof WORKSPACE_PERMISSION];

/**
 * Map workspace roles to their default permissions
 */
export const WORKSPACE_ROLE_PERMISSIONS: Record<
  WorkspaceRole,
  WorkspacePermission[]
> = {
  [WORKSPACE_ROLE.ADMIN]: [WORKSPACE_PERMISSION.ALL],

  [WORKSPACE_ROLE.EDITOR]: [
    // Content - full access
    WORKSPACE_PERMISSION.CONTENT_VIEW,
    WORKSPACE_PERMISSION.CONTENT_CREATE,
    WORKSPACE_PERMISSION.CONTENT_EDIT,
    WORKSPACE_PERMISSION.CONTENT_DELETE,
    WORKSPACE_PERMISSION.CONTENT_PUBLISH,

    // Media - full access
    WORKSPACE_PERMISSION.MEDIA_VIEW,
    WORKSPACE_PERMISSION.MEDIA_UPLOAD,
    WORKSPACE_PERMISSION.MEDIA_DELETE,

    // Products - full access
    WORKSPACE_PERMISSION.PRODUCT_VIEW,
    WORKSPACE_PERMISSION.PRODUCT_CREATE,
    WORKSPACE_PERMISSION.PRODUCT_EDIT,
    WORKSPACE_PERMISSION.PRODUCT_DELETE,

    // Styles - full access
    WORKSPACE_PERMISSION.STYLE_VIEW,
    WORKSPACE_PERMISSION.STYLE_CREATE,
    WORKSPACE_PERMISSION.STYLE_EDIT,
    WORKSPACE_PERMISSION.STYLE_DELETE,

    // Team - view only
    WORKSPACE_PERMISSION.TEAM_VIEW,

    // Connected accounts - view only
    WORKSPACE_PERMISSION.CONNECTED_ACCOUNT_VIEW,

    // Settings - view only
    WORKSPACE_PERMISSION.SETTINGS_VIEW,
  ],

  [WORKSPACE_ROLE.VIEWER]: [
    // View-only access
    WORKSPACE_PERMISSION.CONTENT_VIEW,
    WORKSPACE_PERMISSION.MEDIA_VIEW,
    WORKSPACE_PERMISSION.PRODUCT_VIEW,
    WORKSPACE_PERMISSION.STYLE_VIEW,
    WORKSPACE_PERMISSION.TEAM_VIEW,
    WORKSPACE_PERMISSION.CONNECTED_ACCOUNT_VIEW,
    WORKSPACE_PERMISSION.SETTINGS_VIEW,
  ],
};

/**
 * Get workspace permissions for a given role
 */
export function getWorkspacePermissions(
  role: WorkspaceRole | undefined,
): string[] {
  if (!role) return [];
  return WORKSPACE_ROLE_PERMISSIONS[role];
}

/**
 * Check if a user has a specific workspace permission
 * Supports wildcard "*" permission
 */
export function hasWorkspacePermission(
  permissions: string[],
  requiredPermission: WorkspacePermission,
): boolean {
  if (permissions.includes(WORKSPACE_PERMISSION.ALL)) {
    return true;
  }
  return permissions.includes(requiredPermission);
}

/**
 * Check if a user has any of the specified workspace permissions
 */
export function hasAnyWorkspacePermission(
  permissions: string[],
  requiredPermissions: WorkspacePermission[],
): boolean {
  if (permissions.includes(WORKSPACE_PERMISSION.ALL)) {
    return true;
  }
  return requiredPermissions.some((permission) =>
    permissions.includes(permission),
  );
}

/**
 * Check if a user has all of the specified workspace permissions
 */
export function hasAllWorkspacePermissions(
  permissions: string[],
  requiredPermissions: WorkspacePermission[],
): boolean {
  if (permissions.includes(WORKSPACE_PERMISSION.ALL)) {
    return true;
  }
  return requiredPermissions.every((permission) =>
    permissions.includes(permission),
  );
}
