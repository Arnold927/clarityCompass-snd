'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Home, ChevronRight, ChevronLeft, ChevronRightCircle, Pencil, Plus, Download, Layers,
} from 'lucide-react';
import { mealApi, C, fmtDate, fmtNumber, STATUS_LABELS, type ThematicFocus } from '@/lib/meal-api';
import { usePageTitle } from '@/components/meal/use-page-title';
import { ReachSummaryCards, StatusPill, IndicatorCard } from '@/components/meal/shared-cards';
import { NeedsAttentionCard, TargetAchievementChart, needsAttentionFromIndicators } from '@/components/meal/attention-and-comparison';
import { IndicatorManager } from '@/components/meal/indicator-manager';
import { ThematicFocusFormDialog } from '@/components/meal/thematic-focus-form-dialog';
import { openBrandedReport } from '@/components/meal/export-report';

export default function ThematicFocusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [list, setList] = useState<ThematicFocus[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<ThematicFocus | null>(null);
  usePageTitle(item ? `${item.name} | Thematic Focus | SND Africa MEAL` : 'Thematic Focus | SND Africa MEAL');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const areas = await mealApi.thematicFocusAreas();
      setList(areas);
      const paramId = Number(searchParams.get('area'));
      const initialId = areas.find(a => a.id === paramId)?.id ?? areas[0]?.id ?? null;
      setItem(areas.find(a => a.id === initialId) ?? null);
      setSelectedId(initialId);
      const paramTab = searchParams.get('tab');
      if (paramTab) setTab(paramTab);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedId === null) return;
    const found = list.find(a => a.id === selectedId) ?? null;
    setItem(found);
    router.replace(`/thematic-focus?area=${selectedId}&tab=${tab}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    if (selectedId !== null) router.replace(`/thematic-focus?area=${selectedId}&tab=${newTab}`);
  };

  const refreshCurrent = useCallback(async () => {
    const areas = await mealApi.thematicFocusAreas();
    setList(areas);
    setItem(areas.find(a => a.id === selectedId) ?? null);
  }, [selectedId]);

  const currentIndex = list.findIndex(a => a.id === selectedId);
  const goPrev = () => { if (currentIndex > 0) setSelectedId(list[currentIndex - 1].id); };
  const goNext = () => { if (currentIndex >= 0 && currentIndex < list.length - 1) setSelectedId(list[currentIndex + 1].id); };

  const exportReport = () => {
    if (!item) return;
    openBrandedReport({
      moduleLabel: 'Thematic Focus',
      title: item.name,
      subtitle: item.description,
      note: 'Reach and indicators for this thematic focus are entered manually and are independent of Project data.',
      metaItems: [
        { label: 'Status', value: STATUS_LABELS[item.status] ?? item.status },
        { label: 'Reporting Frequency', value: item.reporting_frequency },
        { label: 'Responsible Person', value: item.responsible_person },
        { label: 'Notes', value: item.notes },
      ],
      kpis: [
        { label: 'Total Reached', value: fmtNumber(item.reach_total) },
        { label: `Male (${item.reach_male_pct}%)`, value: fmtNumber(item.reach_male) },
        { label: `Female (${item.reach_female_pct}%)`, value: fmtNumber(item.reach_female) },
        { label: `PWD (${item.reach_pwd_pct}%)`, value: fmtNumber(item.reach_pwd) },
      ],
      tables: [
        {
          title: 'Key Indicators',
          columns: ['Indicator', 'Target', 'Achievement', 'Unit', 'Reporting Period'],
          rows: item.indicators.map(i => [i.name, i.target ?? '—', i.achievement, i.unit, i.reporting_period]),
        },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          <span>Thematic Focus</span> <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Thematic Focus Details</span>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Select Thematic Focus</label>
              {loading ? <Skeleton className="h-9 w-full" /> : (
                <Select value={selectedId ? String(selectedId) : ''} onValueChange={v => setSelectedId(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a thematic focus" /></SelectTrigger>
                  <SelectContent>
                    {list.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex <= 0} aria-label="Previous" title="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex < 0 || currentIndex >= list.length - 1} aria-label="Next" title="Next"><ChevronRightCircle className="h-4 w-4" /></Button>
            <Button onClick={() => { setFormMode('create'); setFormOpen(true); }} style={{ backgroundColor: C.orange }} className="text-white">
              <Plus className="h-4 w-4 mr-2" /> New Thematic Focus
            </Button>
          </CardContent>
        </Card>

        {!loading && list.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">No thematic focus areas yet. Add the first one to get started.</p>
              <Button onClick={() => { setFormMode('create'); setFormOpen(true); }} style={{ backgroundColor: C.orange }} className="text-white">
                <Plus className="h-4 w-4 mr-2" /> New Thematic Focus
              </Button>
            </CardContent>
          </Card>
        ) : loading || !item ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-24 w-24 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.orange}22` }}>
                      <Layers className="h-10 w-10" style={{ color: C.orange }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold" style={{ color: C.brown }}>{item.name}</h1>
                        <StatusPill status={item.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{item.description || 'No description yet.'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => { setFormMode('edit'); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit Thematic Focus
                    </Button>
                    <Button variant="outline" onClick={exportReport}>
                      <Download className="h-4 w-4 mr-2" /> Export Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="indicators">Indicators</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">People Reached</CardTitle>
                    <p className="text-xs text-muted-foreground">Total reach and disaggregation for this thematic focus (manually entered)</p>
                  </CardHeader>
                  <CardContent>
                    <ReachSummaryCards
                      total={item.reach_total}
                      male={item.reach_male} malePct={item.reach_male_pct}
                      female={item.reach_female} femalePct={item.reach_female_pct}
                      pwd={item.reach_pwd} pwdPct={item.reach_pwd_pct}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Indicators</CardTitle>
                    <p className="text-xs text-muted-foreground">Achievement against key indicators for this thematic focus</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {item.indicators.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No indicators yet.</p>}
                    {item.indicators.map(i => <IndicatorCard key={i.id} indicator={i} kind="thematic-focus" />)}
                  </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Target vs Achievement</CardTitle></CardHeader>
                    <CardContent><TargetAchievementChart indicators={item.indicators} /></CardContent>
                  </Card>
                  <NeedsAttentionCard items={needsAttentionFromIndicators(item.indicators)} indicatorKind="thematic-focus" />
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">Thematic Focus Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Thematic Focus</span><span>{item.name}</span>
                    <span className="text-muted-foreground">Description</span><span>{item.description || '—'}</span>
                    <span className="text-muted-foreground">Status</span><span><StatusPill status={item.status} /></span>
                    <span className="text-muted-foreground">Created On</span><span>{fmtDate(item.created_at)}</span>
                    <span className="text-muted-foreground">Last Updated</span><span>{fmtDate(item.updated_at)}</span>
                    <span className="text-muted-foreground">Reporting Frequency</span><span>{item.reporting_frequency || '—'}</span>
                    <span className="text-muted-foreground">Responsible Person</span><span>{item.responsible_person || '—'}</span>
                    <span className="text-muted-foreground">Notes</span><span>{item.notes || '—'}</span>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="indicators" className="mt-4">
                <IndicatorManager
                  title="Key Indicators"
                  kind="thematic-focus"
                  indicators={item.indicators}
                  onCreate={async (values) => { await mealApi.addThematicFocusIndicator(item.id, values); await refreshCurrent(); }}
                  onUpdate={async (id, values) => { await mealApi.updateThematicFocusIndicator(id, values); await refreshCurrent(); }}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        <ThematicFocusFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          thematicFocus={formMode === 'edit' ? item : null}
          onSaved={refreshCurrent}
        />
      </div>
    </AppLayout>
  );
}