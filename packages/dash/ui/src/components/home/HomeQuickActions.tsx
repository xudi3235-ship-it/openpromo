import { Link } from "@tanstack/react-router";
import { Calendar, PenSquare, Zap } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type HomeQuickActionsProps = {
  workspaceSlug: string;
};

const ACTIONS = [
  {
    label: "Plan calendar",
    description: "Fill empty slots for the week",
    icon: Calendar,
    href: "/workspaces/$workspaceSlug/calendar",
  },
  {
    label: "Open composer",
    description: "Repurpose a top performing post",
    icon: PenSquare,
    href: "/workspaces/$workspaceSlug/composer",
  },
  {
    label: "Automations",
    description: "Check your styles & presets",
    icon: Zap,
    href: "/workspaces/$workspaceSlug/styles",
  },
];

export function HomeQuickActions({ workspaceSlug }: HomeQuickActionsProps) {
  return (
    <MomentumCard className="space-y-4" tone="subtle">
      <div>
        <p className="text-sm font-medium text-foreground">
          Workspace shortcuts
        </p>
        <p className="text-xs text-muted-foreground">
          Jump into the tools you use most often
        </p>
      </div>
      <div className="space-y-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              params={{ workspaceSlug }}
              className="flex items-center justify-between rounded-xl border border-border/30 px-3 py-2 transition hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Open</span>
            </Link>
          );
        })}
      </div>
    </MomentumCard>
  );
}
