import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import TitleTag from "./title-tag";

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon: LucideIcon;
  iconTitle: string;
  description: React.ReactNode;
}

const SectionHeader = ({
  className,
  title,
  icon: Icon,
  iconTitle,
  description,
}: SectionHeaderProps) => {
  return (
    <div
      className={cn(
        "container flex flex-col gap-6 border-x py-4 max-lg:border-x lg:py-8",
        className,
      )}
    >
      <TitleTag title={iconTitle} icon={Icon} />
      <h2 className="text-3xl leading-tight tracking-tight md:text-4xl lg:text-6xl">
        {title}
      </h2>
      <p className="text-muted-foreground max-w-[600px] tracking-[-0.32px]">
        {description}
      </p>
    </div>
  );
};

export default SectionHeader;
