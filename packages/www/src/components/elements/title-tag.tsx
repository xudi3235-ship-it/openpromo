import { Badge, type LucideIcon } from "lucide-react";

const TitleTag = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) => {
  return (
    <Badge
      // @ts-expect-error
      variant="outline"
      className="bg-card w-fit gap-1 px-3 text-sm font-normal tracking-tight shadow-sm"
    >
      <Icon className="size-4" />
      <span>{title}</span>
    </Badge>
  );
};

export default TitleTag;
