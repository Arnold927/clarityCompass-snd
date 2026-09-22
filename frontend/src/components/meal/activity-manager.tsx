'use client';

import React, { useState } from 'react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Eye } from 'lucide-react';
import { C, STATUS_LABELS, fmtNumber, mealApi, type ProjectActivity, type LocationEntry } from '@/lib/meal-api';
import { StatusPill } from './shared-cards';
import { useSortableData, SortableTableHead } from './use-sortable-data';
import { useConfirmDiscard } from './use-confirm-discard';
import { usePagination, PaginationControls } from './use-pagination';
import { TableFilterBar } from './table-filter-bar';
import { LocationListField, type LocationValue } from './location-field';
import Link from 'next/link';

export interface ActivityFormValues {
  name: string; target: number; reach: number;
  reach_male: number; reach_female: number; reach_pwd: number;
  status: string; reporting_period: string;
  locations: LocationValue[];
}

const EMPTY: ActivityFormValues = {
  name: '', target: 0, reach: 0, reach_male: 0, reach_female: 0, reach_pwd: 0,
  status: 'NOT_STARTED', reporting_period: '',
  locations: [],
};

export function ActivityManager({
  activities, onCreate, onUpdate, onSaved,
}: {
  activities: ProjectActivity[];
  onCreate: (values: Omit<ActivityFormValues, 'locations'>) => Promise<ProjectActivity>;
  onUpdate: (id: number, values: Omit<ActivityFormValues, 'locations'>) => Promise<void>;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<ActivityFormValues>(EMPTY);
  const [originalLocations, setOriginalLocations] = useState<LocationEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<ActivityFormValues>();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const filtered = activities.filter(a =>
    (statusFilter === 'ALL' || a.status === statusFilter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  );
  const { sortedItems, sortKey, direction, requestSort } = useSortableData<ProjectActivity>(filtered);
  const pagination = usePagination(sortedItems, 10);

  const openCreate = () => { setEditingId(null); setValues(EMPTY); setOriginalLocations([]); capture(EMPTY); setOpen(true); };
  const openEdit = (a: ProjectActivity) => {
    const next: ActivityFormValues = {
      name: a.name, target: a.target, reach: a.reach, reach_male: a.reach_male,
      reach_female: a.reach_female, reach_pwd: a.reach_pwd, status: a.status,
      reporting_period: a.reporting_period,
      locations: a.locations.map(l => ({ latitude: l.latitude, longitude: l.longitude, location_name: l.location_name })),
    };
    setEditingId(a.id);
    setValues(next);
    setOriginalLocations(a.locations);
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
      const { locations, ...coreValues } = values;
      let activityId = editingId;
      if (editingId) {
        await onUpdate(editingId, coreValues);
      } else {
        const created = await onCreate(coreValues);
        activityId = created.id;
      }
      // Locations aren't part of the activity's own fields — synced
      // separately as their own records. Simplest correct approach: drop
      // whatever was there before and recreate from the current list,
      // rather than diffing which entries actually changed.
      await Promise.all(originalLocations.map(l => mealApi.deleteActivityLocation(l.id)));
      await Promise.all(locations.map(l =>
        l.latitude !== null && l.longitude !== null
          ? mealApi.addActivityLocation(activityId as number, { latitude: l.latitude, longitude: l.longitude, location_name: l.location_name })
          : Promise.resolve()
      ));
      onSaved();
      toast({ title: editingId ? 'Activity updated' : 'Activity added', description: `"${values.name}" has been saved.` });
      setOpen(false);
    } catch (e: any) {
      toast({
        title: 'Could not save activity',
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
        <h3 className="text-base font-semibold">Project Activities</h3>
        <Button size="sm" onClick={openCreate} style={{ backgroundColor: C.orange }} className="text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Activity
        </Button>
      </div>

      <TableFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); pagination.setPage(1); }}
        searchPlaceholder="Search activities..."
        searchLabel="Search activities"
        statusOptions={Object.entries(STATUS_LABELS).filter(([k]) => k !== 'ON_HOLD' && k !== 'ACTIVE' && k !== 'INACTIVE').map(([value, label]) => ({ value, label }))}
        statusValue={statusFilter}
        onStatusChange={v => { setStatusFilter(v); pagination.setPage(1); }}
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <SortableTableHead label="Activity" sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Target" sortKey="target" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Reach" sortKey="reach" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Male" sortKey="reach_male" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Female" sortKey="reach_female" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="PWD" sortKey="reach_pwd" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <SortableTableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={requestSort} />
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                {activities.length === 0 ? 'No activities yet.' : 'No activities match your filters.'}
              </TableCell></TableRow>
            )}
            {pagination.pageItems.map((a, idx) => (
              <TableRow key={a.id}>
                <TableCell>{(pagination.page - 1) * 10 + idx + 1}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{fmtNumber(a.target)}</TableCell>
                <TableCell>{fmtNumber(a.reach)}</TableCell>
                <TableCell>{fmtNumber(a.reach_male)}</TableCell>
                <TableCell>{fmtNumber(a.reach_female)}</TableCell>
                <TableCell>{fmtNumber(a.reach_pwd)}</TableCell>
                <TableCell><StatusPill status={a.status} /></TableCell>
                <TableCell className="flex gap-1">
                  <Link href={`/activities/${a.id}`} aria-label={`View details for ${a.name}`}>
                    <Button size="icon" variant="ghost" title="View details" aria-label={`View details for ${a.name}`}><Eye className="h-4 w-4" /></Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Edit" aria-label={`Edit ${a.name}`}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
        pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
        itemLabel="activities"
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Activity Name</Label>
              <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Training of community child protection committees" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target (overall — not disaggregated)</Label>
                <Input type="number" value={values.target} onChange={e => setValues(v => ({ ...v, target: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Actual Reach (overall)</Label>
                <Input type="number" value={values.reach} onChange={e => setValues(v => ({ ...v, reach: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reach disaggregation</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div>
                  <Label className="text-xs">Male</Label>
                  <Input type="number" value={values.reach_male} onChange={e => setValues(v => ({ ...v, reach_male: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Female</Label>
                  <Input type="number" value={values.reach_female} onChange={e => setValues(v => ({ ...v, reach_female: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">PWD</Label>
                  <Input type="number" value={values.reach_pwd} onChange={e => setValues(v => ({ ...v, reach_pwd: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={values.status} onValueChange={v => setValues(val => ({ ...val, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'ON_HOLD').map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reporting Period</Label>
                <Input value={values.reporting_period} onChange={e => setValues(v => ({ ...v, reporting_period: e.target.value }))} placeholder="e.g. Q2 2026" />
              </div>
            </div>
            <LocationListField
              label="Where this activity is taking place"
              locations={values.locations}
              onChange={locations => setValues(v => ({ ...v, locations }))}
            />
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