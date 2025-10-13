import type { WorkspacePermission } from "@shared/workspace/auth";
import {
  hasAllWorkspacePermissions,
  hasAnyWorkspacePermission,
  hasWorkspacePermission,
  WORKSPACE_PERMISSION,
} from "@shared/workspace/auth";
import { useWorkspace } from "./useWorkspace";

/**
 * Hook to check workspace permissions for the current user
 */
export function useWorkspacePermissions() {
  const { workspace } = useWorkspace();
  const permissions = workspace.userPermissions ?? [];

  const can = (permission: WorkspacePermission): boolean => {
    return hasWorkspacePermission(permissions, permission);
  };

  const canAny = (requiredPermissions: WorkspacePermission[]): boolean => {
    return hasAnyWorkspacePermission(permissions, requiredPermissions);
  };

  const canAll = (requiredPermissions: WorkspacePermission[]): boolean => {
    return hasAllWorkspacePermissions(permissions, requiredPermissions);
  };

  return {
    permissions,
    can,
    canAny,
    canAll,
    // Convenient permission checks
    canViewTeam: can(WORKSPACE_PERMISSION.TEAM_VIEW),
    canInviteTeam: can(WORKSPACE_PERMISSION.TEAM_INVITE),
    canManageRoles: can(WORKSPACE_PERMISSION.TEAM_MANAGE_ROLES),
    canRemoveTeam: can(WORKSPACE_PERMISSION.TEAM_REMOVE),
    canViewContent: can(WORKSPACE_PERMISSION.CONTENT_VIEW),
    canCreateContent: can(WORKSPACE_PERMISSION.CONTENT_CREATE),
    canEditContent: can(WORKSPACE_PERMISSION.CONTENT_EDIT),
    canDeleteContent: can(WORKSPACE_PERMISSION.CONTENT_DELETE),
    canPublishContent: can(WORKSPACE_PERMISSION.CONTENT_PUBLISH),
    canViewMedia: can(WORKSPACE_PERMISSION.MEDIA_VIEW),
    canUploadMedia: can(WORKSPACE_PERMISSION.MEDIA_UPLOAD),
    canDeleteMedia: can(WORKSPACE_PERMISSION.MEDIA_DELETE),
    canViewSettings: can(WORKSPACE_PERMISSION.SETTINGS_VIEW),
    canUpdateSettings: can(WORKSPACE_PERMISSION.SETTINGS_UPDATE),
    canDeleteWorkspace: can(WORKSPACE_PERMISSION.WORKSPACE_DELETE),
  };
}
