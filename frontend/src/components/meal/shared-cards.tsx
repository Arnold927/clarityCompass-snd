'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Mars, Venus, Accessibility, ListChecks, CircleCheck, RefreshCw, Clock, CircleX, CirclePause } from 'lucide-react';
import { C, STATUS_COLORS, STATUS_LABELS, fmtNumber, type IndicatorLike, type StatusBreakdown, type IndicatorKind } from '@/lib/meal-api';
import { renderActiveShape } from './reach-charts';
import Link from 'next/link';

export function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? C.muted;
  return (
    <Badge style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }} className="font-medium">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function ReachSummaryCards({ total, male, malePct, female, femalePct, pwd, pwdPct, totalLabel = 'Total People Reached', trendPct }: {
  total: number; male: number; malePct: number; female: number; femalePct: number; pwd: number; pwdPct: number;
  totalLabel?: string; trendPct?: number | null;
}) {
  const items = [
    { label: totalLabel, value: total, color: C.orange, icon: Users, pct: undefined as number | undefined },
    { label: 'Male', value: male, color: C.blue, icon: Mars, pct: malePct },
    { label: 'Female', value: female, color: C.pink, icon: Venus, pct: femalePct },
    { label: 'PWD', value: pwd, color: C.green, icon: Accessibility, pct: pwdPct },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(it => (
        <Card key={it.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${it.color}22` }}>
              <it.icon className="h-5 w-5" style={{ color: it.color }} />
            </div>
            <div className="min-w-0">
              <UiTooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs font-medium mb-0.5 truncate" style={{ color: it.color }}>{it.label}</p>
                </TooltipTrigger>
                <TooltipContent>{it.label}</TooltipContent>
              </UiTooltip>
              <p className="text-2xl font-bold leading-tight" style={{ color: C.brown }}>{fmtNumber(it.value)}</p>
              {it.label === totalLabel && trendPct !== undefined && trendPct !== null && (
                <p className="text-xs font-medium" style={{ color: trendPct >= 0 ? C.green : C.red }}>
                  {trendPct >= 0 ? '▲' : '▼'} {Math.abs(trendPct)}% vs previous year
                </p>
              )}
              {it.pct !== undefined && <p className="text-xs text-muted-foreground">{it.pct}%</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const STATUS_ICONS: Record<string, any> = {
  COMPLETED: CircleCheck,
  ONGOING: RefreshCw,
  PARTIALLY_DONE: Clock,
  NOT_STARTED: CircleX,
  ON_HOLD: CirclePause,
};

export function StatusBreakdownCard({ title, data }: { title: string; data: StatusBreakdown }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const shownIndex = pinnedIndex ?? activeIndex;

  const chartData = data.breakdown
    .filter(b => b.count > 0)
    .map(b => ({ status: b.status, label: b.label, value: b.count, color: STATUS_COLORS[b.status] ?? C.muted }));

  const select = (status: string) => {
    const idx = chartData.findIndex(d => d.status === status);
    if (idx === -1) return;
    setPinnedIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" style={{ color: C.orange }} />
            {title}
          </span>
          <span className="text-xl font-bold" style={{ color: C.brown }}>{data.total}</span>
        </div>

        <div className="flex items-center gap-3">
          {chartData.length > 0 && (
            <div className="relative w-[104px] h-[104px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData} dataKey="value" nameKey="label" innerRadius={30} outerRadius={48} paddingAngle={2}
                    cursor="pointer"
                    activeIndex={shownIndex ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(_, index) => setPinnedIndex(prev => (prev === index ? null : index))}
                  >
                    {chartData.map(d => <Cell key={d.status} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v} (${Math.round((v / data.total) * 1000) / 10}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 flex-1 min-w-0">
            {data.breakdown.map(b => {
              const Icon = STATUS_ICONS[b.status] ?? CircleCheck;
              const color = STATUS_COLORS[b.status] ?? C.muted;
              const isActive = chartData[shownIndex ?? -1]?.status === b.status;
              return (
                <div
                  key={b.status}
                  className="flex items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 cursor-pointer transition-colors"
                  style={{ backgroundColor: isActive ? `${color}18` : undefined }}
                  onMouseEnter={() => { const idx = chartData.findIndex(d => d.status === b.status); if (idx !== -1) setActiveIndex(idx); }}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => select(b.status)}
                >
                  <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <UiTooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm flex-1 truncate">{b.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>{b.label}</TooltipContent>
                  </UiTooltip>
                  <span className="text-sm font-semibold">{b.count}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{b.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Small achievement/indicator "card visual" — used by Donor / Lead Partner / Thematic Focus dashboards.
 * Clickable through to that indicator's detail page. */
export function IndicatorCard({ indicator, kind }: { indicator: IndicatorLike; kind: IndicatorKind }) {
  const pct = indicator.percentage_achievement;
  return (
    <Link href={`/indicators/${kind}/${indicator.id}`} className="block rounded-lg border p-4 hover:border-[#C8793A] hover:shadow-md transition-all">
      <p className="text-2xl font-bold" style={{ color: C.brown }}>{fmtNumber(indicator.achievement)}</p>
      <UiTooltip>
        <TooltipTrigger asChild>
          <p className="text-xs text-muted-foreground mb-2 truncate">{indicator.name}</p>
        </TooltipTrigger>
        <TooltipContent>{indicator.name}</TooltipContent>
      </UiTooltip>
      {indicator.target !== null && pct !== null && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: C.green }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{pct}% · Target: {fmtNumber(indicator.target)}</p>
        </>
      )}
    </Link>
  );
}

/** Icon + label + value, used for the info-strips on every module's title
 * card. Wraps the value in a tooltip since it's truncated for long text. */
export function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  const display = value || '—';
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.orange }} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <UiTooltip>
          <TooltipTrigger asChild>
            <p className="text-sm font-medium truncate">{display}</p>
          </TooltipTrigger>
          <TooltipContent>{display}</TooltipContent>
        </UiTooltip>
      </div>
    </div>
  );
}