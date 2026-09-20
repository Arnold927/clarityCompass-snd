'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle2, Activity as ActivityIcon, Target as TargetIcon } from 'lucide-react';
import { C, fmtNumber, type NeedsAttentionItem, type IndicatorLike, type IndicatorKind } from '@/lib/meal-api';

/** Flags activities/indicators that are meaningfully behind target — computed
 * on the backend for Project/Donor/Lead Partner/Dashboard (where the data
 * spans multiple records), and available here for the one case where it's
 * cheaper to just compute client-side from data already on the page:
 * Thematic Focus, which has no "overview" endpoint of its own. */
export function needsAttentionFromIndicators(indicators: IndicatorLike[], threshold = 50): NeedsAttentionItem[] {
  return indicators
    .filter(i => i.percentage_achievement !== null && i.percentage_achievement < threshold)
    .map(i => ({
      kind: 'indicator' as const, id: i.id, name: i.name,
      target: i.target, value: i.achievement, percentage: i.percentage_achievement as number,
    }))
    .sort((a, b) => a.percentage - b.percentage);
}

export function NeedsAttentionCard({ items, indicatorKind, title = 'Needs Attention' }: {
  items: NeedsAttentionItem[]; indicatorKind: IndicatorKind; title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {items.length > 0 ? (
            <AlertTriangle className="h-4 w-4" style={{ color: C.red }} />
          ) : (
            <CheckCircle2 className="h-4 w-4" style={{ color: C.green }} />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing significantly behind target right now — activities and indicators below 50% of target, while in progress, would show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(item => {
              const href = item.kind === 'activity'
                ? `/activities/${item.id}`
                : `/indicators/${indicatorKind}/${item.id}`;
              const Icon = item.kind === 'activity' ? ActivityIcon : TargetIcon;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link href={href} className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.red}1a` }}>
                      <Icon className="h-4 w-4" style={{ color: C.red }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtNumber(item.value)} of {item.target !== null ? fmtNumber(item.target) : '—'} target
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0" style={{ color: C.red }}>{item.percentage}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Target vs Achievement, side by side, per indicator — the comparison a
 * table of numbers makes you do in your head. */
export function TargetAchievementChart({ indicators }: { indicators: IndicatorLike[] }) {
  const data = indicators
    .filter(i => i.target !== null)
    .map(i => ({
      fullName: i.name,
      name: i.name.length > 32 ? `${i.name.slice(0, 30)}…` : i.name,
      target: i.target as number,
      achievement: i.achievement,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No indicators with a target set yet.</p>;
  }

  const height = Math.max(160, data.length * 56);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={160} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload || !payload.length) return null;
            const d = payload[0].payload;
            return (
              <div className="rounded-lg border bg-white shadow-lg p-3 text-sm min-w-[180px]">
                <p className="font-semibold mb-1.5" style={{ color: C.brown }}>{d.fullName}</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium" style={{ color: C.sandy }}>{fmtNumber(d.target)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Achievement</span>
                  <span className="font-semibold" style={{ color: C.orange }}>{fmtNumber(d.achievement)}</span>
                </div>
              </div>
            );
          }}
          cursor={{ fill: C.orange, opacity: 0.06 }}
        />
        <Legend />
        <Bar dataKey="target" name="Target" fill={C.sandy} radius={[0, 4, 4, 0]} barSize={12} />
        <Bar dataKey="achievement" name="Achievement" fill={C.orange} radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}