"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Org, useHonoMutation } from "@/lib/hono-client";

interface OrgSwitcherProps {
  orgs: Org[];
  currentOrgId: string;
}

export default function OrgSwitcher({ orgs, currentOrgId }: OrgSwitcherProps) {
  const queryClient = useQueryClient();

  const switchOrgMutation = useHonoMutation({
    mutationFn: (api, organizationId: string) =>
      api.orgs.switch.$post({ json: { organizationId } }),
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["currentOrg"] });

      const selectedOrg = orgs.find(
        (org) => org.organizationId === organizationId,
      );
      if (selectedOrg) {
        toast.success(`Switched to ${selectedOrg.organizationName}`);
      }
    },
  });

  const selectedOrg = orgs.find((org) => org.organizationId === currentOrgId);

  if (!selectedOrg) {
    return null;
  }

  const handleSwitchOrg = (orgId: string) => {
    if (orgId === currentOrgId) {
      return;
    }
    switchOrgMutation.mutate(orgId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 hover:bg-transparent">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full">
            {selectedOrg.organizationName.charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="">{selectedOrg.organizationName}</span>
          </div>
          <ChevronsUpDown size={14} className="text-muted-foreground/80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {orgs.map(({ organizationId, organizationName }) => (
          <DropdownMenuItem
            key={organizationId}
            onSelect={() => handleSwitchOrg(organizationId)}
          >
            {organizationName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
