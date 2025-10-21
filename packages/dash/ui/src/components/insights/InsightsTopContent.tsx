import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";

type TopContentItem = {
  contentId: string;
  sourceContentId?: string;
  placement: string;
  metrics: {
    impressions?: number;
    engagement?: number;
    clicks?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  lastRefreshedAt?: string;
};

type InsightsTopContentProps = {
  items: TopContentItem[];
};

function formatNumber(value?: number) {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

export function InsightsTopContent({ items }: InsightsTopContentProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          No content data available yet
        </p>
        <p className="text-xs text-muted-foreground/70">
          Post content to see performance metrics
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-muted-foreground">#</TableHead>
            <TableHead>Content</TableHead>
            <TableHead className="w-32">Placement</TableHead>
            <TableHead className="text-right w-32">Impressions</TableHead>
            <TableHead className="text-right w-32">Engagement</TableHead>
            <TableHead className="text-right w-32">Clicks</TableHead>
            <TableHead className="text-right w-32">Comments</TableHead>
            <TableHead className="text-right w-32">Shares</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.contentId} className="hover:bg-accent/30">
              <TableCell className="font-medium text-muted-foreground">
                #{index + 1}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {item.sourceContentId || item.contentId}
                  </span>
                  {item.lastRefreshedAt ? (
                    <span className="text-xs text-muted-foreground">
                      Updated{" "}
                      {formatDistanceToNow(new Date(item.lastRefreshedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {item.placement}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(item.metrics.impressions)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(item.metrics.engagement)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatNumber(item.metrics.clicks)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatNumber(item.metrics.comments)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatNumber(item.metrics.shares)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    // TODO: navigate to content detail page
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function InsightsTopContentSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24 rounded" />
            </TableHead>
            <TableHead className="w-32">
              <Skeleton className="h-4 w-16 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20 rounded" />
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              key={index}
            >
              <TableCell>
                <Skeleton className="h-4 w-6 rounded" />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
