import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@openpromo/ui/components/chart";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type TimeSeriesData = Array<{
  bucket: string;
  impressions: number;
  engagement: number;
  reach: number;
  clicks: number;
  followers: number;
}>;

type InsightsTimeSeriesChartProps = {
  data?: TimeSeriesData;
};

const chartConfig = {
  impressions: {
    label: "Impressions",
    color: "hsl(var(--chart-1))",
  },
  engagement: {
    label: "Engagement",
    color: "hsl(var(--chart-2))",
  },
  followers: {
    label: "Followers",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function InsightsTimeSeriesChart({
  data = [],
}: InsightsTimeSeriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        No data available for the selected time range
      </div>
    );
  }

  // Transform data to include formatted date
  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.bucket), "MMM d"),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-impressions)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-impressions)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillEngagement" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-engagement)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-engagement)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillFollowers" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-followers)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-followers)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          dataKey="impressions"
          type="monotone"
          fill="url(#fillImpressions)"
          fillOpacity={0.4}
          stroke="var(--color-impressions)"
          strokeWidth={2}
        />
        <Area
          dataKey="engagement"
          type="monotone"
          fill="url(#fillEngagement)"
          fillOpacity={0.4}
          stroke="var(--color-engagement)"
          strokeWidth={2}
        />
        <Area
          dataKey="followers"
          type="monotone"
          fill="url(#fillFollowers)"
          fillOpacity={0.4}
          stroke="var(--color-followers)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
