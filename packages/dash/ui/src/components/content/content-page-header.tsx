import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Input } from "@openpromo/ui/components/input";
import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import {
  Calendar,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Plus,
  RefreshCw,
  Share2,
  Signal,
  TrendingUp,
  Users,
} from "lucide-react";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

const columnIcons: Record<string, React.ReactNode> = {
  title: <FileText className="h-4 w-4" />,
  status: <Signal className="h-4 w-4" />,
  impressions: <Eye className="h-4 w-4" />,
  reach: <Users className="h-4 w-4" />,
  engagement: <TrendingUp className="h-4 w-4" />,
  likes: <Heart className="h-4 w-4" />,
  comments: <MessageCircle className="h-4 w-4" />,
  shares: <Share2 className="h-4 w-4" />,
  metricsRefreshed: <RefreshCw className="h-4 w-4" />,
  scheduledDate: <Calendar className="h-4 w-4" />,
  createdAt: <Clock className="h-4 w-4" />,
};

interface ContentPageHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  table: Table<MergedContentEntity>;
}

export function ContentPageHeaderTitle() {
  const openDialog = useDialogComposerStore((state) => state.openDialog);
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Plan, publish, and measure everything in one place.
        </p>
      </div>
      <div className="flex gap-2 ml-auto">
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          Create Post
        </Button>
      </div>
    </div>
  );
}

export function ContentPageHeader({
  searchValue,
  onSearchChange,
  table,
}: ContentPageHeaderProps) {
  return (
    <>
      {/* Title Section */}
      <ContentPageHeaderTitle />

      {/* Search and Columns Section */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 py-2">
        <Input
          placeholder="Search content..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {columnIcons[column.id]}
                      <span>{column.id}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
