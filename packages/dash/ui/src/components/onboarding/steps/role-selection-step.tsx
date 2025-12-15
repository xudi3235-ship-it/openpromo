"use client";

import { cn } from "@openpromo/ui/lib/utils";
import { Briefcase, ShoppingBag, Sparkles, User } from "lucide-react";
import type { UserRole } from "../onboarding-dialog";

const ROLES = [
  {
    id: "ecommerce" as const,
    label: "E-commerce Brand",
    description: "I sell products online",
    icon: ShoppingBag,
  },
  {
    id: "creator" as const,
    label: "Creator / Influencer",
    description: "I create content for brands",
    icon: User,
  },
  {
    id: "agency" as const,
    label: "Agency",
    description: "I manage multiple brands",
    icon: Briefcase,
  },
  {
    id: "exploring" as const,
    label: "Just Exploring",
    description: "I want to see what you can do",
    icon: Sparkles,
  },
];

interface RoleSelectionStepProps {
  selectedRole: UserRole;
  onRoleSelect: (role: UserRole) => void;
}

export function RoleSelectionStep({
  selectedRole,
  onRoleSelect,
}: RoleSelectionStepProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          What brings you to OpenPromo?
        </h2>
        <p className="text-muted-foreground">
          This helps us personalize your experience
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleSelect(role.id)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                "hover:border-foreground/20 hover:bg-muted/50",
                isSelected
                  ? "border-foreground bg-muted/50"
                  : "border-transparent bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center size-12 rounded-xl transition-colors",
                  isSelected ? "bg-foreground text-background" : "bg-muted",
                )}
              >
                <Icon className="size-6" />
              </div>
              <div className="text-center">
                <div className="font-medium">{role.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {role.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
