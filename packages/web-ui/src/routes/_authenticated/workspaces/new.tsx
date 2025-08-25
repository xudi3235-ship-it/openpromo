import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useLoaderData,
  useRouter,
} from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useHonoMutation, type Workspace } from "@/lib/hono-client";

const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/_authenticated/workspaces/new")({
  component: NewWorkspacePage,
});

function NewWorkspacePage() {
  const { user } = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const queryClient = useQueryClient();

  const createWorkspace = useHonoMutation<Workspace, FormValues>({
    mutationKey: ["create-workspace"],
    mutationFn: (api, values) =>
      api.workspaces.$post({ json: { name: values.name } }),
    onSuccess: async (ws) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      router.navigate({
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

  const namePlaceholderPrefix =
    user?.firstName ?? user?.lastName ?? user?.email.split("@")[0];
  const namePlaceholder = namePlaceholderPrefix
    ? `${namePlaceholderPrefix}'s Workspace`
    : "My Workspace";

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold mb-4">Create a new workspace</h1>
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
          <div className="flex gap-2">
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? "Creating..." : "Create workspace"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
