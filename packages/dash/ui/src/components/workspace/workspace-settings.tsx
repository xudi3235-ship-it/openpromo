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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { Separator } from "@openpromo/ui/components/separator";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
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
              <Avatar className="size-16">
                {workspace.profilePictureUrl ? (
                  <AvatarImage
                    src={workspace.profilePictureUrl}
                    alt={`${workspace.name} avatar`}
                  />
                ) : null}
                <AvatarFallback className="text-base">
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
    </div>
  );
}
