import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useHonoMutation, type Workspace } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
});

type FormValues = z.infer<typeof schema>;

interface NewWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewWorkspaceModal({
  open,
  onOpenChange,
}: NewWorkspaceModalProps) {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createWorkspace = useHonoMutation<Workspace, FormValues>({
    mutationKey: ["create-workspace"],
    mutationFn: (api, values) =>
      api.workspaces.$post({ json: { name: values.name } }),
    onSuccess: async (ws) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACES });
      form.reset();
      onOpenChange(false);
      navigate({
        to: "/workspaces/$workspaceSlug",
        params: { workspaceSlug: ws.slug },
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: FormValues) => {
    createWorkspace.mutate(values);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const namePlaceholderPrefix =
    user.firstName ?? user.lastName ?? user.email.split("@")[0];
  const namePlaceholder = namePlaceholderPrefix
    ? `${namePlaceholderPrefix}'s Workspace`
    : "My Workspace";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your projects and collaborate
            with your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={namePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createWorkspace.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkspace.isPending}>
                {createWorkspace.isPending ? "Creating..." : "Create workspace"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
