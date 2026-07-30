"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type ChartSeries = {
  key: string
  label: string
  color: string
}

export function AreaChartCard({
  title,
  description,
  data,
  xKey,
  series,
  action,
}: {
  title: string
  description: string
  data: Array<Record<string, string | number>>
  xKey: string
  series: ChartSeries[]
  action?: React.ReactNode
}) {
  const config = Object.fromEntries(
    series.map((item) => [
      item.key,
      { label: item.label, color: item.color },
    ])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={config}
          className="aspect-auto h-[250px] w-full"
          initialDimension={{ width: 800, height: 250 }}
        >
          <AreaChart data={data}>
            <defs>
              {series.map((item) => (
                <linearGradient
                  key={item.key}
                  id={`fill-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0.04}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {series.map((item) => (
              <Area
                key={item.key}
                dataKey={item.key}
                type="monotone"
                isAnimationActive={false}
                fill={`url(#fill-${item.key})`}
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                stackId={series.length > 2 ? "a" : undefined}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
