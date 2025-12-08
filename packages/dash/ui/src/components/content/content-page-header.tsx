import { Button } from "@openpromo/ui/components/button";
import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import {
  Calendar,
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
import { DataTableHeader } from "@/components/common";
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
      <DataTableHeader
        table={table}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search content..."
        columnIcons={columnIcons}
      />
    </>
  );
}

/**
 * ContentPageSearchHeader - Search and column controls only (no title)
 * For use in layouts where title is handled by parent component
 */
export function ContentPageSearchHeader({
  searchValue,
  onSearchChange,
  table,
}: ContentPageHeaderProps) {
  return (
    <DataTableHeader
      table={table}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search content..."
      columnIcons={columnIcons}
    />
  );
}
