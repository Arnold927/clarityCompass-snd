'use client';

import React, { useState } from 'react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Eye } from 'lucide-react';
import { C, fmtNumber, type IndicatorLike, type IndicatorKind } from '@/lib/meal-api';
import { useSortableData, SortableTableHead } from './use-sortable-data';
import { useConfirmDiscard } from './use-confirm-discard';
import { usePagination, PaginationControls } from './use-pagination';
import { TableFilterBar } from './table-filter-bar';
import Link from 'next/link';

export interface IndicatorFormValues {
  name: string;
  target: number | null;
  achievement: number;
  unit: string;
  reporting_period: string;
}

const EMPTY: IndicatorFormValues = { name: '', target: null, achievement: 0, unit: '', reporting_period: '' };

export function IndicatorManager({
  title = 'Key Indicators', kind, indicators, onCreate, onUpdate, addLabel = 'Add Indicator',
}: {
  title?: string;
  kind: IndicatorKind;
  indicators: IndicatorLike[];
  onCreate: (values: IndicatorFormValues) => Promise<void>;
  onUpdate: (id: number, values: IndicatorFormValues) => Promise<void>;
  addLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<IndicatorFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<IndicatorFormValues>();

  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const periodOptions = Array.from(new Set(indicators.map(i => i.reporting_period).filter(Boolean)))
    .sort().map(p => ({ value: p, label: p }));
  const filtered = indicators.filter(i =>
    (periodFilter === 'ALL' || i.reporting_period === periodFilter) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.unit.toLowerCase().includes(search.toLowerCase()))
  );
  const { sortedItems, sortKey, direction, requestSort } = useSortableData<IndicatorLike>(filtered);
  const pagination = usePagination(sortedItems, 10);

  const openCreate = () => { setEditingId(null); setValues(EMPTY); capture(EMPTY); setOpen(true); };
  const openEdit = (i: IndicatorLike) => {
    const next: IndicatorFormValues = { name: i.name, target: i.target, achievement: Number(i.achievement), unit: i.unit, reporting_period: i.reporting_period };
    setEditingId(i.id);
    setValues(next);
    capture(next);
    setOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values)) return;
    setOpen(next);
  };

  const save = async () => {
    if (!values.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) await onUpdate(editingId, values);
      else await onCreate(values);
      toast({ title: editingId ? 'Indicator updated' : 'Indicator added', description: `"${values.name}" has been saved.` });
      setOpen(false);
    } catch (e: any) {
      toast({
        title: 'Could not save indicator',
        description: e?.response?.data ? JSON.stringify(e.response.data) : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <Button size="sm" onClick={openCreate} style={{ backgroundColor: C.orange }} className="text-white">
          <Plus className="h-4 w-4 mr-1" /> {addLabel}
        </Button>
      </div>

      <TableFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); pagination.setPage(1); }}
        searchPlaceholder="Search indicators..."
        searchLabel="Search indicators"
        statusOptions={periodOptions.length > 0 ? periodOptions : undefined}
        statusValue={periodFilter}
        onStatusChange={v => { setPeriodFilter(v); pagination.setPage(1); }}
        statusLabel="Reporting Period"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <SortableTableHead label="Indicator" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Target" sortKey="target" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Achievement" sortKey="achievement" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="% Achievement" sortKey="percentage_achievement" activeKey={sortKey} direction={direction} onSort={requestSort} className="min-w-[140px]" />
              <SortableTableHead label="Unit" sortKey="unit" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Reporting Period" sortKey="reporting_period" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                {indicators.length === 0 ? 'No indicators yet.' : 'No indicators match your filters.'}
              </TableCell></TableRow>
            )}
            {pagination.pageItems.map((i, idx) => {
              const pct = i.percentage_achievement;
              return (
                <TableRow key={i.id}>
                  <TableCell>{(pagination.page - 1) * 10 + idx + 1}</TableCell>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.target !== null ? fmtNumber(i.target) : '—'}</TableCell>
                  <TableCell>{fmtNumber(i.achievement)}</TableCell>
                  <TableCell>
                    {pct !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted overflow-hidden shrink-0">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: C.green }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{i.unit || '—'}</TableCell>
                  <TableCell>{i.reporting_period || '—'}</TableCell>
                  <TableCell className="flex gap-1">
                    <Link href={`/indicators/${kind}/${i.id}`} aria-label={`View details for ${i.name}`}>
                      <Button size="icon" variant="ghost" title="View details" aria-label={`View details for ${i.name}`}><Eye className="h-4 w-4" /></Button>
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(i)} title="Edit" aria-label={`Edit ${i.name}`}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
        pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
        itemLabel="indicators"
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Indicator' : 'Add Indicator'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Indicator Name</Label>
              <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Children reached with protection services" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target</Label>
                <Input type="number" value={values.target ?? ''} onChange={e => setValues(v => ({ ...v, target: e.target.value === '' ? null : Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Achievement</Label>
                <Input type="number" value={values.achievement} onChange={e => setValues(v => ({ ...v, achievement: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Input value={values.unit} onChange={e => setValues(v => ({ ...v, unit: e.target.value }))} placeholder="e.g. Children, People" />
              </div>
              <div>
                <Label>Reporting Period</Label>
                <Input value={values.reporting_period} onChange={e => setValues(v => ({ ...v, reporting_period: e.target.value }))} placeholder="e.g. Q2 2026" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !values.name.trim()} style={{ backgroundColor: C.orange }} className="text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
