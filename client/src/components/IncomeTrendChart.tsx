import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MonthlyIncomePoint } from "@shared/schema";

// Compact peso labels so the axis stays readable on a phone.
function formatCompact(value: number) {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return `₱${Math.round(value)}`;
}

export function IncomeTrendChart() {
  const isMobile = useIsMobile();

  // Pro-rated monthly income for the last 12 months, computed server-side
  // with the same formula as the KPI cards (see MonthlyIncomePoint).
  const { data: incomeTrend } = useQuery<MonthlyIncomePoint[]>({
    queryKey: ["/api/dashboard/income-trend"],
    refetchInterval: 60_000,
  });

  // Chart-ready: short month labels plus a flag for the current (still in
  // progress) month so it can be styled differently.
  const data = useMemo(() => {
    if (!incomeTrend) return [];
    const currentMonthKey = format(new Date(), "yyyy-MM");
    return incomeTrend.map((point) => ({
      ...point,
      label: format(parseISO(point.month), isMobile ? "MMMMM" : "MMM"),
      isCurrent: point.month.startsWith(currentMonthKey),
    }));
  }, [incomeTrend, isMobile]);

  return (
    <div
      className="glass-panel rounded-md p-4 sm:p-5"
      data-testid="panel-income-trend"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Income Trend
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
          Pro-rated monthly · last 12 mo
        </span>
      </div>
      {data.length === 0 ? (
        <Skeleton className="h-40 w-full sm:h-44" />
      ) : (
        <div className="h-40 sm:h-44" data-testid="chart-income-trend">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? -8 : 4 }}
              barCategoryGap={isMobile ? "12%" : "20%"}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: isMobile ? 9 : 10,
                  fontFamily: "monospace",
                  fill: "hsl(var(--muted-foreground))",
                }}
                interval={0}
              />
              {/* On a phone the bars alone can't be read as amounts, so show a
                  compact axis instead of relying on tap-to-reveal tooltips. */}
              <YAxis
                hide={!isMobile}
                width={44}
                tickCount={3}
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 9,
                  fontFamily: "monospace",
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickFormatter={formatCompact}
                domain={[0, "auto"]}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as
                    | (MonthlyIncomePoint & { isCurrent: boolean })
                    | undefined;
                  if (!p) return "";
                  const name = format(parseISO(p.month), "MMMM yyyy");
                  return p.isCurrent ? `${name} (in progress)` : name;
                }}
                formatter={(value: number) => [
                  `₱${Math.round(value).toLocaleString()}`,
                  "Income",
                ]}
              />
              <Bar dataKey="income" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {data.map((point) => (
                  <Cell
                    key={point.month}
                    fill="#22D3EE"
                    fillOpacity={point.isCurrent ? 0.45 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
