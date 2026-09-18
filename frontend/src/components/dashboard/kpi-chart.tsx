"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

const chartData = [
  { month: "January", funding: 18600, beneficiaries: 800 },
  { month: "February", funding: 30500, beneficiaries: 2000 },
  { month: "March", funding: 23700, beneficiaries: 1200 },
  { month: "April", funding: 27800, beneficiaries: 2780 },
  { month: "May", funding: 18900, beneficiaries: 1890 },
  { month: "June", funding: 23900, beneficiaries: 3000 },
];

const chartConfig = {
  funding: {
    label: "Funding (USD)",
    color: "hsl(var(--chart-1))",
  },
  beneficiaries: {
    label: "Beneficiaries",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export function KpiChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicator Tracking</CardTitle>
        <CardDescription>Funding and Beneficiary Reach - Last 6 Months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} accessibilityLayer>
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}K`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="funding" fill="var(--color-funding)" radius={4} />
              <Bar
                dataKey="beneficiaries"
                fill="var(--color-beneficiaries)"
                radius={4}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
