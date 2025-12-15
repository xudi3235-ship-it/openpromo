import { zodResolver } from "@hookform/resolvers/zod";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { Separator } from "@openpromo/ui/components/separator";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useHonoMutation } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import {
  useConnectedAccounts,
  useOAuthWithListener,
} from "@/queries/connected-account";
import {
  type UpdateWorkspacePayload,
  useUpdateWorkspace,
} from "@/queries/workspace";

const renameSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
});

type RenameFormValues = z.infer<typeof renameSchema>;

export function WorkspaceSettings() {
  const { workspace } = useWorkspace();
  const permissions = useWorkspacePermissions();
  const { uploadFile } = useStorageUpload();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const renameForm = useForm<RenameFormValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: workspace.name },
  });

  useEffect(() => {
    renameForm.reset({ name: workspace.name });
  }, [workspace.name, renameForm]);

  const canEdit = permissions.canUpdateSettings;

  const resetRenameForm = () => {
    renameForm.reset({ name: workspace.name });
  };

  const handleRenameSubmit = (values: RenameFormValues) => {
    if (!canEdit) return;

    const trimmedName = values.name.trim();
    if (trimmedName.length === 0) {
      renameForm.setError("name", {
        message: "Name cannot be empty",
      });
      return;
    }

    const payload: UpdateWorkspacePayload = { name: trimmedName };

    updateWorkspaceMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Workspace name updated");
        renameForm.reset({ name: trimmedName });
      },
      onError: (error) => {
        toast.error("Failed to update workspace name", {
          description: error.message,
        });
        resetRenameForm();
      },
    });
  };

  const handleSelectAvatar = () => {
    if (!canEdit || updateWorkspaceMutation.isPending || isUploadingAvatar) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canEdit) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const { key, publicUrl } = await uploadFile(file);

      await updateWorkspaceMutation.mutateAsync({
        profilePicture: {
          key,
          url: publicUrl,
        },
      });

      toast.success("Workspace avatar updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed unexpectedly";
      toast.error("Failed to update avatar", {
        description: message,
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset the file input so the same file can be selected again if needed
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canEdit || updateWorkspaceMutation.isPending) return;

    try {
      await updateWorkspaceMutation.mutateAsync({
        profilePicture: null,
      });
      toast.success("Workspace avatar removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to remove avatar", { description: message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Workspace settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage how your team sees and identifies this workspace.
        </p>
      </div>

      <Card className="border border-border/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Workspace identity</CardTitle>
          <CardDescription>
            Update the workspace name and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-md">
                {workspace.profilePictureUrl ? (
                  <AvatarImage
                    src={workspace.profilePictureUrl}
                    alt={`${workspace.name} avatar`}
                  />
                ) : null}
                <AvatarFallback className="text-base rounded-md">
                  {workspace.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  Workspace avatar
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 512x512px. PNG or JPG up to 2MB.
                </p>
                {!canEdit && (
                  <p className="text-xs text-muted-foreground">
                    You need workspace admin access to change this.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={!canEdit}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectAvatar}
                disabled={
                  !canEdit ||
                  updateWorkspaceMutation.isPending ||
                  isUploadingAvatar
                }
              >
                {isUploadingAvatar ? "Uploading…" : "Upload new photo"}
              </Button>
              {workspace.profilePictureUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemoveAvatar}
                  disabled={
                    !canEdit ||
                    updateWorkspaceMutation.isPending ||
                    isUploadingAvatar
                  }
                >
                  Remove photo
                </Button>
              ) : null}
            </div>
          </div>

          <Separator />

          <Form {...renameForm}>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
              onSubmit={renameForm.handleSubmit(handleRenameSubmit)}
            >
              <FormField
                control={renameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full sm:max-w-sm">
                    <FormLabel>Workspace name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!canEdit || updateWorkspaceMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    !canEdit ||
                    updateWorkspaceMutation.isPending ||
                    !renameForm.formState.isDirty
                  }
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetRenameForm}
                  disabled={
                    !renameForm.formState.isDirty ||
                    updateWorkspaceMutation.isPending
                  }
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Connected Accounts Section */}
      <ConnectedAccountsSection />
    </div>
  );
}

// Connected Accounts Section
function ConnectedAccountsSection() {
  const { accounts, isPending } = useConnectedAccounts();
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnectingFacebook,
    isConnectingInstagram,
    isConnectingTikTok,
  } = useOAuthWithListener();

  const isConnecting =
    isConnectingFacebook || isConnectingInstagram || isConnectingTikTok;

  return (
    <Card className="border border-border/60 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Connected accounts</CardTitle>
        <CardDescription>
          Manage your connected social media accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No accounts connected yet.
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <ConnectedAccountItem key={account.id} account={account} />
            ))}
          </div>
        )}

        {/* Connect Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Connect account
                  <ChevronDown className="ml-auto size-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            <DropdownMenuItem onClick={handleConnectInstagram}>
              <span className="mr-2">
                {getPlatformMeta("INSTAGRAM").icon({})}
              </span>
              Instagram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleConnectFacebook}>
              <span className="mr-2">
                {getPlatformMeta("FACEBOOK").icon({})}
              </span>
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleConnectTikTok}>
              <span className="mr-2">{getPlatformMeta("TIKTOK").icon({})}</span>
              TikTok
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

// Individual Account Row
function ConnectedAccountItem({ account }: { account: ConnectedAccount }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const meta = getPlatformMeta(account.platform);
  const Icon = meta.icon;

  const { mutateAsync: disconnectAccount, isPending: isDisconnecting } =
    useHonoMutation({
      mutationFn: (api, accountId: string) =>
        api.workspaces[":workspaceSlug"].connected_accounts[
          ":accountId"
        ].$delete({
          param: { workspaceSlug: workspace.slug, accountId },
        }),
      onSuccess: async () => {
        toast.success("Account disconnected successfully");
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
        });
      },
    });

  const handleDisconnect = async () => {
    await disconnectAccount(account.id);
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
        <div className="flex items-center gap-3">
          {/* Platform icon */}
          <div
            className={`size-9 rounded-full bg-gradient-to-br ${meta.avatarGradient} flex items-center justify-center`}
          >
            <Icon className="size-4 text-white" />
          </div>

          {/* Account info */}
          <div>
            <p className="text-sm font-medium">
              {account.accountName || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        </div>

        {/* Disconnect button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowConfirm(true)}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Disconnect"
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Disconnect account"
        desc={`Are you sure you want to disconnect ${account.accountName || account.platform}? You can reconnect it later.`}
        confirmText="Disconnect"
        destructive={true}
        handleConfirm={handleDisconnect}
        isLoading={isDisconnecting}
      />
    </>
  );
}
