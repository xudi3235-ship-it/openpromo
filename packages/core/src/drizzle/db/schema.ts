import {
    bigint,
    boolean,
    date,
    decimal,
    index,
    int,
    json,
    mysqlTable,
    primaryKey,
    text,
    timestamp,
    unique,
    varchar,
  } from 'drizzle-orm/mysql-core';
  import { relations } from 'drizzle-orm';
  
  // User table
  export const user = mysqlTable('user', {
    userId: bigint('user_id', { mode: 'number' }).primaryKey().autoincrement(),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  }, (table) => [
    unique('uk_user_email').on(table.email),
  ]);
  
  // Workspace table
  export const workspace = mysqlTable('workspace', {
    workspaceId: bigint('workspace_id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // Role table
  export const role = mysqlTable('role', {
    roleId: bigint('role_id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'), // Human-readable description of role
    isSystemRole: boolean('is_system_role').notNull().default(false), // true for built-in roles, false for custom
    workspaceId: bigint('workspace_id', { mode: 'number' }), // null for system roles, workspace_id for custom roles
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // Workspace member table
  export const workspaceMember = mysqlTable('workspace_member', {
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    roleId: bigint('role_id', { mode: 'number' }).notNull(), // Links to Role for permissions
    joinedAt: timestamp('joined_at').defaultNow(),
  }, (table) => [
    primaryKey({ columns: [table.userId, table.workspaceId] }),
    index('fk_workspace_member_workspace').on(table.workspaceId),
    index('fk_workspace_member_role').on(table.roleId),
  ]);
  
  // Permission table
  export const permission = mysqlTable('permission', {
    permissionId: bigint('permission_id', { mode: 'number' }).primaryKey().autoincrement(),
    resource: varchar('resource', { length: 255 }).notNull(), // e.g., 'campaigns', 'content', 'billing', 'members'
    action: varchar('action', { length: 255 }).notNull(), // e.g., 'create', 'read', 'update', 'delete', 'publish'
    permissionKey: varchar('permission_key', { length: 255 }).notNull(), // e.g., 'campaigns:create', 'billing:read'
    description: text('description'), // Human-readable description
  }, (table) => [
    unique('uk_permission_key').on(table.permissionKey),
  ]);
  
  // Role permission table
  export const rolePermission = mysqlTable('role_permission', {
    roleId: bigint('role_id', { mode: 'number' }).notNull(),
    permissionId: bigint('permission_id', { mode: 'number' }).notNull(),
  }, (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('fk_role_permission_permission').on(table.permissionId),
  ]);
  
  // Resource permission override table
  export const resourcePermissionOverride = mysqlTable('resource_permission_override', {
    overrideId: bigint('override_id', { mode: 'number' }).primaryKey().autoincrement(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    resourceType: varchar('resource_type', { length: 255 }).notNull(), // e.g., 'campaign', 'ad_account', 'content_group'
    resourceId: bigint('resource_id', { mode: 'number' }).notNull(), // ID of the specific resource
    permissionId: bigint('permission_id', { mode: 'number' }).notNull(),
    granted: boolean('granted').notNull(), // true = granted, false = explicitly denied
    createdAt: timestamp('created_at').defaultNow(),
    createdBy: bigint('created_by', { mode: 'number' }).notNull(), // User who granted this override
  });
  
  // Subscription table
  export const subscription = mysqlTable('subscription', {
    workspaceId: bigint('workspace_id', { mode: 'number' }).primaryKey(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  }, (table) => [
    unique('uk_subscription_stripe_subscription').on(table.stripeSubscriptionId),
    unique('uk_subscription_stripe_customer').on(table.stripeCustomerId),
  ]);
  
  // Connected account table
  export const connectedAccount = mysqlTable('connected_account', {
    accountId: bigint('account_id', { mode: 'number' }).primaryKey().autoincrement(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    platform: varchar('platform', { length: 50 }).notNull(), // 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN_PAGE', etc.
    externalAccountId: varchar('external_account_id', { length: 255 }).notNull(), // e.g., Facebook Page ID
    accountName: varchar('account_name', { length: 255 }).notNull(),
    encryptedAccessToken: text('encrypted_access_token').notNull(),
  }, (table) => [
    unique('uk_connected_account').on(table.workspaceId, table.platform, table.externalAccountId),
  ]);
  
  // Ad campaign table
  export const adCampaign = mysqlTable('ad_campaign', {
    adCampaignId: bigint('ad_campaign_id', { mode: 'number' }).primaryKey().autoincrement(), // L1: Campaign
    adAccountId: bigint('ad_account_id', { mode: 'number' }).notNull(), // Links campaign to a specific ad account and platform
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    objective: varchar('objective', { length: 50 }).notNull(), // Platform-specific, e.g., 'CONVERSIONS', 'SEARCH', 'VIDEO_VIEWS'
    status: varchar('status', { length: 50 }).notNull(),
    externalCampaignId: varchar('external_campaign_id', { length: 255 }),
    createdBy: bigint('created_by', { mode: 'number' }).notNull(), // User who created this campaign
  }, (table) => [
    unique('uk_ad_campaign_external').on(table.workspaceId, table.externalCampaignId),
    index('fk_ad_campaign_created_by').on(table.createdBy),
  ]);
  
  // Ad group table
  export const adGroup = mysqlTable('ad_group', {
    adGroupId: bigint('ad_group_id', { mode: 'number' }).primaryKey().autoincrement(), // L2: Ad Group (Meta: Ad Set)
    adCampaignId: bigint('ad_campaign_id', { mode: 'number' }).notNull(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(), // e.g., 'US Women 25-45 - Lookalike'
    targetingSpec: json('targeting_spec').notNull(), // Platform-specific audience, location, etc.
    budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    externalAdGroupId: varchar('external_ad_group_id', { length: 255 }),
  }, (table) => [
    unique('uk_ad_group_external').on(table.workspaceId, table.externalAdGroupId),
    index('fk_ad_group_campaign').on(table.adCampaignId),
  ]);
  
  // Ad creative table
  export const adCreative = mysqlTable('ad_creative', {
    adCreativeId: bigint('ad_creative_id', { mode: 'number' }).primaryKey().autoincrement(), // The visual part of an ad
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(), // e.g., 'Video Ad v1 - 15s'
    creativeSpec: json('creative_spec').notNull(), // Handles different structures (Meta vs. Google Assets)
    sourceAssetId: bigint('source_asset_id', { mode: 'number' }), // Optional: link to organic Asset
    externalCreativeId: varchar('external_creative_id', { length: 255 }),
  }, (table) => [
    unique('uk_ad_creative_external').on(table.workspaceId, table.externalCreativeId),
  ]);
  
  // Ad table
  export const ad = mysqlTable('ad', {
    adId: bigint('ad_id', { mode: 'number' }).primaryKey().autoincrement(),
    adGroupId: bigint('ad_group_id', { mode: 'number' }).notNull(),
    adCreativeId: bigint('ad_creative_id', { mode: 'number' }).notNull(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    externalAdId: varchar('external_ad_id', { length: 255 }),
  }, (table) => [
    unique('uk_ad_external').on(table.workspaceId, table.externalAdId),
    index('fk_ad_group').on(table.adGroupId),
    index('fk_ad_creative').on(table.adCreativeId),
  ]);
  
  // Pending content group table
  export const pendingContentGroup = mysqlTable('pending_content_group', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    workspaceId: bigint('workspace_id', { mode: 'number' }).notNull(),
    baseSpec: json('base_spec').notNull(),
    scheduledAt: int('scheduled_at').notNull(),
    createdBy: bigint('created_by', { mode: 'number' }).notNull(), // User who created this content group
  });
  
  // Unified content table
  export const unifiedContent = mysqlTable('unified_content', {
    postId: bigint('post_id', { mode: 'number' }).primaryKey().autoincrement(),
    groupId: bigint('group_id', { mode: 'number' }).notNull(),
    connectedAccountId: bigint('connected_account_id', { mode: 'number' }).notNull(),
    externalPostId: varchar('external_post_id', { length: 255 }),
    placementSpec: json('placement_spec').notNull(), // placement specific specs
    createdBy: bigint('created_by', { mode: 'number' }).notNull(), // User who created this content
  }, (table) => [
    unique('uk_unified_content_external').on(table.connectedAccountId, table.externalPostId),
    index('fk_unified_content_group').on(table.groupId),
    index('fk_unified_content_created_by').on(table.createdBy),
  ]);
  
  // Content metric table
  export const contentMetric = mysqlTable('content_metric', {
    postId: bigint('post_id', { mode: 'number' }).notNull(),
    date: date('date').notNull(),
    impressions: int('impressions').notNull(),
    likes: int('likes').notNull(),
  }, (table) => [
    primaryKey({ columns: [table.postId, table.date] }),
  ]);
  
  // Relations
  export const userRelations = relations(user, ({ many }) => ({
    ownedWorkspaces: many(workspace),
    workspaceMembers: many(workspaceMember),
    createdCampaigns: many(adCampaign),
    createdContentGroups: many(pendingContentGroup),
    createdContent: many(unifiedContent),
    createdOverrides: many(resourcePermissionOverride),
    grantedOverrides: many(resourcePermissionOverride, { relationName: 'grantedBy' }),
  }));
  
  export const workspaceRelations = relations(workspace, ({ one, many }) => ({
    owner: one(user, {
      fields: [workspace.ownerId],
      references: [user.userId],
    }),
    members: many(workspaceMember),
    roles: many(role),
    subscription: one(subscription),
    connectedAccounts: many(connectedAccount),
    campaigns: many(adCampaign),
    adGroups: many(adGroup),
    creatives: many(adCreative),
    ads: many(ad),
    contentGroups: many(pendingContentGroup),
    overrides: many(resourcePermissionOverride),
  }));
  
  export const roleRelations = relations(role, ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [role.workspaceId],
      references: [workspace.workspaceId],
    }),
    members: many(workspaceMember),
    permissions: many(rolePermission),
  }));
  
  export const workspaceMemberRelations = relations(workspaceMember, ({ one }) => ({
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.userId],
    }),
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.workspaceId],
    }),
    role: one(role, {
      fields: [workspaceMember.roleId],
      references: [role.roleId],
    }),
  }));
  
  export const permissionRelations = relations(permission, ({ many }) => ({
    roles: many(rolePermission),
    overrides: many(resourcePermissionOverride),
  }));
  
  export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
    role: one(role, {
      fields: [rolePermission.roleId],
      references: [role.roleId],
    }),
    permission: one(permission, {
      fields: [rolePermission.permissionId],
      references: [permission.permissionId],
    }),
  }));
  
  export const resourcePermissionOverrideRelations = relations(resourcePermissionOverride, ({ one }) => ({
    user: one(user, {
      fields: [resourcePermissionOverride.userId],
      references: [user.userId],
    }),
    workspace: one(workspace, {
      fields: [resourcePermissionOverride.workspaceId],
      references: [workspace.workspaceId],
    }),
    permission: one(permission, {
      fields: [resourcePermissionOverride.permissionId],
      references: [permission.permissionId],
    }),
    createdByUser: one(user, {
      fields: [resourcePermissionOverride.createdBy],
      references: [user.userId],
      relationName: 'grantedBy',
    }),
  }));
  
  export const subscriptionRelations = relations(subscription, ({ one }) => ({
    workspace: one(workspace, {
      fields: [subscription.workspaceId],
      references: [workspace.workspaceId],
    }),
  }));
  
  export const connectedAccountRelations = relations(connectedAccount, ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [connectedAccount.workspaceId],
      references: [workspace.workspaceId],
    }),
    content: many(unifiedContent),
  }));
  
  export const adCampaignRelations = relations(adCampaign, ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [adCampaign.workspaceId],
      references: [workspace.workspaceId],
    }),
    createdBy: one(user, {
      fields: [adCampaign.createdBy],
      references: [user.userId],
    }),
    adGroups: many(adGroup),
  }));
  
  export const adGroupRelations = relations(adGroup, ({ one, many }) => ({
    campaign: one(adCampaign, {
      fields: [adGroup.adCampaignId],
      references: [adCampaign.adCampaignId],
    }),
    workspace: one(workspace, {
      fields: [adGroup.workspaceId],
      references: [workspace.workspaceId],
    }),
    ads: many(ad),
  }));
  
  export const adCreativeRelations = relations(adCreative, ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [adCreative.workspaceId],
      references: [workspace.workspaceId],
    }),
    ads: many(ad),
  }));
  
  export const adRelations = relations(ad, ({ one }) => ({
    adGroup: one(adGroup, {
      fields: [ad.adGroupId],
      references: [adGroup.adGroupId],
    }),
    creative: one(adCreative, {
      fields: [ad.adCreativeId],
      references: [adCreative.adCreativeId],
    }),
    workspace: one(workspace, {
      fields: [ad.workspaceId],
      references: [workspace.workspaceId],
    }),
  }));
  
  export const pendingContentGroupRelations = relations(pendingContentGroup, ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [pendingContentGroup.workspaceId],
      references: [workspace.workspaceId],
    }),
    createdBy: one(user, {
      fields: [pendingContentGroup.createdBy],
      references: [user.userId],
    }),
    content: many(unifiedContent),
  }));
  
  export const unifiedContentRelations = relations(unifiedContent, ({ one, many }) => ({
    group: one(pendingContentGroup, {
      fields: [unifiedContent.groupId],
      references: [pendingContentGroup.id],
    }),
    connectedAccount: one(connectedAccount, {
      fields: [unifiedContent.connectedAccountId],
      references: [connectedAccount.accountId],
    }),
    createdBy: one(user, {
      fields: [unifiedContent.createdBy],
      references: [user.userId],
    }),
    metrics: many(contentMetric),
  }));
  
  export const contentMetricRelations = relations(contentMetric, ({ one }) => ({
    post: one(unifiedContent, {
      fields: [contentMetric.postId],
      references: [unifiedContent.postId],
    }),
  }));
  
  // Export all table types for use in other files
  export type User = typeof user.$inferSelect;
  export type NewUser = typeof user.$inferInsert;
  export type Workspace = typeof workspace.$inferSelect;
  export type NewWorkspace = typeof workspace.$inferInsert;
  export type Role = typeof role.$inferSelect;
  export type NewRole = typeof role.$inferInsert;
  export type WorkspaceMember = typeof workspaceMember.$inferSelect;
  export type NewWorkspaceMember = typeof workspaceMember.$inferInsert;
  export type Permission = typeof permission.$inferSelect;
  export type NewPermission = typeof permission.$inferInsert;
  export type RolePermission = typeof rolePermission.$inferSelect;
  export type NewRolePermission = typeof rolePermission.$inferInsert;
  export type ResourcePermissionOverride = typeof resourcePermissionOverride.$inferSelect;
  export type NewResourcePermissionOverride = typeof resourcePermissionOverride.$inferInsert;
  export type Subscription = typeof subscription.$inferSelect;
  export type NewSubscription = typeof subscription.$inferInsert;
  export type ConnectedAccount = typeof connectedAccount.$inferSelect;
  export type NewConnectedAccount = typeof connectedAccount.$inferInsert;
  export type AdCampaign = typeof adCampaign.$inferSelect;
  export type NewAdCampaign = typeof adCampaign.$inferInsert;
  export type AdGroup = typeof adGroup.$inferSelect;
  export type NewAdGroup = typeof adGroup.$inferInsert;
  export type AdCreative = typeof adCreative.$inferSelect;
  export type NewAdCreative = typeof adCreative.$inferInsert;
  export type Ad = typeof ad.$inferSelect;
  export type NewAd = typeof ad.$inferInsert;
  export type PendingContentGroup = typeof pendingContentGroup.$inferSelect;
  export type NewPendingContentGroup = typeof pendingContentGroup.$inferInsert;
  export type UnifiedContent = typeof unifiedContent.$inferSelect;
  export type NewUnifiedContent = typeof unifiedContent.$inferInsert;
  export type ContentMetric = typeof contentMetric.$inferSelect;
  export type NewContentMetric = typeof contentMetric.$inferInsert;