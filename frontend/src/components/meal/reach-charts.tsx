'use client';

import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { C, fmtNumber, type YearReach } from '@/lib/meal-api';

export type YearReachPoint = YearReach;

function YearTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d: YearReachPoint = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold mb-1.5" style={{ color: C.brown }}>{d.year}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Total Reach</span>
          <span className="font-semibold" style={{ color: C.orange }}>{fmtNumber(d.reach)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Male</span>
          <span className="font-medium" style={{ color: C.blue }}>{fmtNumber(d.male)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Female</span>
          <span className="font-medium" style={{ color: C.pink }}>{fmtNumber(d.female)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">PWD</span>
          <span className="font-medium" style={{ color: C.green }}>{fmtNumber(d.pwd)}</span>
        </div>
      </div>
    </div>
  );
}

export function ReachByYearChart({ data }: { data: YearReachPoint[] }) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No year-on-year reach data yet.</p>;
  }

  const chartData = data.map(d => ({ ...d, yearLabel: String(d.year) }));
  const selected = data.find(d => d.year === selectedYear) ?? null;
  const handleClick = (point: any) => {
    if (!point || !point.activePayload || !point.activePayload.length) return;
    const year = point.activePayload[0].payload.year as number;
    setSelectedYear(prev => (prev === year ? null : year));
  };

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
        <Button
          size="sm" variant={chartType === 'bar' ? 'default' : 'outline'}
          className={chartType === 'bar' ? 'text-white' : ''}
          style={chartType === 'bar' ? { backgroundColor: C.orange } : undefined}
          onClick={() => setChartType('bar')} aria-label="Show as bar chart" title="Bar chart"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          size="sm" variant={chartType === 'line' ? 'default' : 'outline'}
          className={chartType === 'line' ? 'text-white' : ''}
          style={chartType === 'line' ? { backgroundColor: C.orange } : undefined}
          onClick={() => setChartType('line')} aria-label="Show as line chart" title="Line chart"
        >
          <LineChartIcon className="h-4 w-4" />
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="yearLabel" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
            <Tooltip content={<YearTooltip />} cursor={{ fill: C.orange, opacity: 0.08 }} />
            <Legend />
            <Bar dataKey="male" name="Male" stackId="reach" fill={C.blue} radius={[0, 0, 0, 0]} cursor="pointer">
              {chartData.map(d => <Cell key={d.year} fillOpacity={selectedYear === null || d.year === selectedYear ? 1 : 0.35} />)}
            </Bar>
            <Bar dataKey="female" name="Female" stackId="reach" fill={C.pink} radius={[0, 0, 0, 0]} cursor="pointer">
              {chartData.map(d => <Cell key={d.year} fillOpacity={selectedYear === null || d.year === selectedYear ? 1 : 0.35} />)}
            </Bar>
            <Bar dataKey="pwd" name="PWD" stackId="reach" fill={C.green} radius={[4, 4, 0, 0]} cursor="pointer">
              {chartData.map(d => <Cell key={d.year} fillOpacity={selectedYear === null || d.year === selectedYear ? 1 : 0.35} />)}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="yearLabel" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
            <Tooltip content={<YearTooltip />} cursor={{ stroke: C.orange, strokeOpacity: 0.3 }} />
            <Line
              type="monotone" dataKey="reach" stroke={C.orange} strokeWidth={2.5}
              dot={{ r: 4, fill: C.orange, cursor: 'pointer' }}
              activeDot={{ r: 6, cursor: 'pointer' }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {selected ? (
        <div className="mt-3 rounded-md border p-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1" style={{ borderColor: `${C.orange}55`, backgroundColor: `${C.orange}0d` }}>
          <span className="font-semibold" style={{ color: C.brown }}>{selected.year}</span>
          <span>Total: <b>{fmtNumber(selected.reach)}</b></span>
          <span>Male: <b>{fmtNumber(selected.male)}</b></span>
          <span>Female: <b>{fmtNumber(selected.female)}</b></span>
          <span>PWD: <b>{fmtNumber(selected.pwd)}</b></span>
          <button className="ml-auto text-xs underline text-muted-foreground" onClick={() => setSelectedYear(null)}>Clear</button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-2 text-center">Click a {chartType === 'bar' ? 'bar' : 'point'} to see the full breakdown for that year.</p>
      )}
    </div>
  );
}

export function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 13} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.4} />
    </g>
  );
}

export function ReachByGenderDonut({ male, female, pwd }: { male: number; female: number; pwd: number }) {
  const total = male + female + pwd;
  const data = [
    { name: 'Male', value: male, color: C.blue },
    { name: 'Female', value: female, color: C.pink },
    { name: 'PWD', value: pwd, color: C.green },
  ];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No reach data yet.</p>;
  }

  const shownIndex = pinnedIndex ?? activeIndex;
  const shown = shownIndex !== null ? data[shownIndex] : null;
  const shownPct = shown ? Math.round((shown.value / total) * 1000) / 10 : null;

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}
              cursor="pointer"
              activeIndex={shownIndex ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(_, index) => setPinnedIndex(prev => (prev === index ? null : index))}
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number, n: string) => [`${v.toLocaleString()} (${Math.round((v / total) * 1000) / 10}%)`, n]} />
            <Legend
              verticalAlign="bottom" height={36}
              onClick={(entry: any) => {
                const idx = data.findIndex(d => d.name === entry.value);
                setPinnedIndex(prev => (prev === idx ? null : idx));
              }}
              wrapperStyle={{ cursor: 'pointer' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -18 }}>
          {shown ? (
            <>
              <span className="text-xl font-bold" style={{ color: shown.color }}>{shown.value.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{shown.name} · {shownPct}%</span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold" style={{ color: C.brown }}>{total.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">People Reached</span>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {pinnedIndex !== null ? 'Click the segment or legend again to unpin.' : 'Hover or click a segment (or its legend) for details.'}
      </p>
    </div>
  );
}

export interface CountryReachPoint { country: string; reach: number; male: number; female: number; pwd: number; }

function CountryTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d: CountryReachPoint = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold mb-1.5" style={{ color: C.brown }}>{d.country}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Total Reach</span>
          <span className="font-semibold" style={{ color: C.orange }}>{fmtNumber(d.reach)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Male</span>
          <span className="font-medium" style={{ color: C.blue }}>{fmtNumber(d.male)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Female</span>
          <span className="font-medium" style={{ color: C.pink }}>{fmtNumber(d.female)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">PWD</span>
          <span className="font-medium" style={{ color: C.green }}>{fmtNumber(d.pwd)}</span>
        </div>
      </div>
    </div>
  );
}

export function ReachByCountryBars({ data }: { data: CountryReachPoint[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No reach data yet.</p>;
  }
  const height = Math.max(60, data.length * 44);
  const handleClick = (point: any) => {
    if (!point || !point.activePayload || !point.activePayload.length) return;
    const country = point.activePayload[0].payload.country as string;
    setSelected(prev => (prev === country ? null : country));
  };
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis type="category" dataKey="country" tickLine={false} axisLine={false} fontSize={12} width={90} />
          <Tooltip content={<CountryTooltip />} cursor={{ fill: C.orange, opacity: 0.08 }} />
          <Bar dataKey="reach" radius={[0, 4, 4, 0]} cursor="pointer" barSize={22}>
            {data.map(d => (
              <Cell key={d.country} fill={d.country === selected ? C.brown : C.orange} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        {selected ? `Showing ${selected} — click again to clear.` : 'Click a bar for the full Male/Female/PWD breakdown.'}
      </p>
    </div>
  );
}

/** A tiny inline trend line for KPI cards — no axes, no grid, just the shape
 * of the trend. Uses the same reach-by-year data the full charts use, so
 * it's a real trend, not decoration. Renders nothing if there's only one
 * data point (a "trend" needs at least two to mean anything). */
export function Sparkline({ data, color = C.orange, height = 32 }: { data: { year: number; reach: number }[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => a.year - b.year);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={sorted} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={`sparkline-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload || !payload.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-md border bg-white shadow px-2 py-1 text-xs">
                <b>{d.year}</b>: {fmtNumber(d.reach)}
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="reach" stroke={color} strokeWidth={2} fill={`url(#sparkline-${color.replace('#', '')})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}