"use client";

import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Check, ImagePlus, Lock, Send, Sparkles, Zap } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { ConnectedAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useWorkspaceSlug } from "@/hooks/useWorkspace";
import type { ConnectedAccount } from "@/lib/hono-client";

const STORAGE_KEYS = {
  CREATED_POST: "openpromo:onboarding:created-post",
  CREATED_AD: "openpromo:onboarding:created-ad",
};

interface ChecklistStepProps {
  stepNumber: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  isLocked: boolean;
  action?: React.ReactNode;
}

function ChecklistStep({
  stepNumber,
  title,
  description,
  icon,
  isComplete,
  isLocked,
  action,
}: ChecklistStepProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-all",
        isComplete && "bg-muted/30 border-border/50",
        isLocked && "opacity-50",
        !isComplete &&
          !isLocked &&
          "bg-card border-border hover:border-primary/30",
      )}
    >
      {/* Step indicator */}
      <div
        className={cn(
          "flex-shrink-0 size-8 rounded-full flex items-center justify-center text-sm font-medium",
          isComplete && "bg-green-500/20 text-green-600",
          isLocked && "bg-muted text-muted-foreground",
          !isComplete && !isLocked && "bg-primary/10 text-primary",
        )}
      >
        {isComplete ? (
          <Check className="size-4" />
        ) : isLocked ? (
          <Lock className="size-3.5" />
        ) : (
          stepNumber
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn("text-muted-foreground", isLocked && "opacity-50")}
          >
            {icon}
          </span>
          <h3
            className={cn(
              "font-medium",
              isComplete && "text-muted-foreground line-through",
              isLocked && "text-muted-foreground",
            )}
          >
            {title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Action slot */}
        {action && !isComplete && !isLocked && (
          <div className="mt-3">{action}</div>
        )}
      </div>
    </div>
  );
}

interface WorkspaceNullStateProps {
  accounts?: ConnectedAccount[];
  className?: string;
}

export function WorkspaceNullState({
  accounts = [],
  className = "",
}: WorkspaceNullStateProps) {
  const navigate = useNavigate();
  const openComposer = useOpenComposer();
  const workspaceSlug = useWorkspaceSlug();

  const [hasCreatedPost, setHasCreatedPost] = useLocalStorage(
    STORAGE_KEYS.CREATED_POST,
    false,
  );
  const [hasCreatedAd, setHasCreatedAd] = useLocalStorage(
    STORAGE_KEYS.CREATED_AD,
    false,
  );

  const hasConnectedAccount = accounts.length > 0;
  const hasCreatedContent = hasCreatedPost || hasCreatedAd;

  const handleCreatePost = () => {
    setHasCreatedPost(true);
    openComposer();
  };

  const handleCreateAd = () => {
    setHasCreatedAd(true);
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug },
    });
  };

  return (
    <div
      className={cn(
        "min-h-[70vh] bg-background flex items-center justify-center py-12",
        className,
      )}
    >
      <div className="w-full max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            Get started with OpenPromo
          </h2>
          <p className="text-muted-foreground">
            Complete these steps to start creating
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          {/* Step 1: Connect account */}
          <ChecklistStep
            stepNumber={1}
            title="Connect your first account"
            description="Link your social media accounts to start posting"
            icon={<Zap className="size-4" />}
            isComplete={hasConnectedAccount}
            isLocked={false}
            action={
              <ConnectedAccountsRow
                accounts={[]}
                showAddButton={true}
                appearance="minimal"
              />
            }
          />

          {/* Step 2: Create post */}
          <ChecklistStep
            stepNumber={2}
            title="Create your first post"
            description="Use AI to generate engaging content for your audience"
            icon={<ImagePlus className="size-4" />}
            isComplete={hasCreatedPost}
            isLocked={!hasConnectedAccount}
            action={
              <Button size="sm" onClick={handleCreatePost}>
                Create post
                <Sparkles className="ml-2 size-3.5" />
              </Button>
            }
          />

          {/* Step 3: Create instant ad */}
          <ChecklistStep
            stepNumber={3}
            title="Create an instant winning ad"
            description="Generate high-converting ad creatives in seconds"
            icon={<Sparkles className="size-4" />}
            isComplete={hasCreatedAd}
            isLocked={!hasConnectedAccount}
            action={
              <Button size="sm" onClick={handleCreateAd}>
                Create ad
                <Sparkles className="ml-2 size-3.5" />
              </Button>
            }
          />

          {/* Step 4: Schedule or publish */}
          <ChecklistStep
            stepNumber={4}
            title="Schedule or publish"
            description="Plan your content calendar and publish across platforms"
            icon={<Send className="size-4" />}
            isComplete={false}
            isLocked={!hasCreatedContent}
          />
        </div>
      </div>
    </div>
  );
}
