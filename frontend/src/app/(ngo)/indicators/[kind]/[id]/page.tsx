'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { usePageTitle } from '@/components/meal/use-page-title';
import {
  mealApi, C, fmtNumber, fmtDate, moduleHref, indicatorParentId, fetchModuleName,
  INDICATOR_KIND_LABELS, type IndicatorDetail, type IndicatorKind,
} from '@/lib/meal-api';

const VALID_KINDS: IndicatorKind[] = ['project', 'donor', 'lead-partner', 'thematic-focus'];

export default function IndicatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kindParam = params.kind as string;
  const id = params.id as string;
  const kind = VALID_KINDS.includes(kindParam as IndicatorKind) ? (kindParam as IndicatorKind) : null;

  const [indicator, setIndicator] = useState<IndicatorDetail | null>(null);
  usePageTitle(indicator ? `${indicator.name} | Indicator Details | SND Africa MEAL` : 'Indicator Details | SND Africa MEAL');
  const [parentName, setParentName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) { setError('Unknown indicator type.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    mealApi.indicator(kind, id)
      .then(async (ind) => {
        setIndicator(ind);
        const pId = indicatorParentId(kind, ind);
        if (pId) {
          setParentId(pId);
          try { setParentName(await fetchModuleName(kind, pId)); } catch { setParentName(''); }
        }
      })
      .catch(() => setError('This indicator could not be found.'))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const parentLabel = kind ? INDICATOR_KIND_LABELS[kind] : '';
  const backHref = kind && parentId ? moduleHref(kind, parentId, 'indicators') : '/projects';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          {kind && <span>{parentLabel}s</span>}
          <ChevronRight className="h-3.5 w-3.5" />
          {parentId && (
            <>
              <Link href={backHref} className="hover:underline">{parentName || parentLabel}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="text-foreground font-medium">Indicator Details</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error || !indicator ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">{error || 'Indicator not found.'}</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <h1 className="text-xl font-bold" style={{ color: C.brown }}>{indicator.name}</h1>
                {parentName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {parentLabel} indicator for <Link href={backHref} className="hover:underline" style={{ color: C.orange }}>{parentName}</Link>
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Target</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{indicator.target !== null ? fmtNumber(indicator.target) : '—'}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.orange }}>Achievement</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{fmtNumber(indicator.achievement)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Unit</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{indicator.unit || '—'}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Reporting Period</p>
                <p className="text-2xl font-bold" style={{ color: C.brown }}>{indicator.reporting_period || '—'}</p>
              </CardContent></Card>
            </div>

            {indicator.percentage_achievement !== null && (
              <Card>
                <CardHeader><CardTitle className="text-base">% Achievement</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-3 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(indicator.percentage_achievement, 100)}%`, backgroundColor: C.green }} />
                    </div>
                    <span className="text-lg font-bold" style={{ color: C.brown }}>{indicator.percentage_achievement}%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Indicator Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Indicator</span><span>{indicator.name}</span>
                <span className="text-muted-foreground">{parentLabel}</span>
                <span>{parentName ? <Link href={backHref} className="hover:underline" style={{ color: C.orange }}>{parentName}</Link> : '—'}</span>
                <span className="text-muted-foreground">Target</span><span>{indicator.target !== null ? fmtNumber(indicator.target) : '—'}</span>
                <span className="text-muted-foreground">Achievement</span><span>{fmtNumber(indicator.achievement)}</span>
                <span className="text-muted-foreground">Unit</span><span>{indicator.unit || '—'}</span>
                <span className="text-muted-foreground">Reporting Period</span><span>{indicator.reporting_period || '—'}</span>
                <span className="text-muted-foreground">Created</span><span>{fmtDate(indicator.created_at)}</span>
                <span className="text-muted-foreground">Last Updated</span><span>{fmtDate(indicator.updated_at)}</span>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
