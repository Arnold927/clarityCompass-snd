'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MultiSelect } from './multi-select';
import { useConfirmDiscard } from './use-confirm-discard';
import {
  mealApi, type Project, type Country, type Donor, type LeadPartner, type ThematicFocus, C,
} from '@/lib/meal-api';

export interface ProjectFormValues {
  name: string; project_code: string; description: string;
  country_ids: number[]; donor_ids: number[]; lead_partner_id: number | null; thematic_focus_ids: number[];
  start_date: string; end_date: string; status: string; budget: string; currency: string;
}

const EMPTY: ProjectFormValues = {
  name: '', project_code: '', description: '',
  country_ids: [], donor_ids: [], lead_partner_id: null, thematic_focus_ids: [],
  start_date: '', end_date: '', status: 'NOT_STARTED', budget: '', currency: 'USD',
};

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const CURRENCY_OPTIONS = ['USD', 'KES', 'EUR', 'GBP', 'ETB'];

export function ProjectFormDialog({
  open, onOpenChange, project, countries, donors, leadPartners, thematicFocusAreas, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null; // null = create mode
  countries: Country[]; donors: Donor[]; leadPartners: LeadPartner[]; thematicFocusAreas: ThematicFocus[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<ProjectFormValues>(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<ProjectFormValues>();

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setError(null);
    const next: ProjectFormValues = project ? {
      name: project.name,
      project_code: project.project_code,
      description: project.description,
      country_ids: project.countries.map(c => c.id),
      donor_ids: project.donors.map(d => d.id),
      lead_partner_id: project.lead_partner?.id ?? null,
      thematic_focus_ids: project.thematic_focus.map(t => t.id),
      start_date: project.start_date,
      end_date: project.end_date,
      status: project.status,
      budget: project.budget !== null ? String(project.budget) : '',
      currency: project.currency || 'USD',
    } : EMPTY;
    setValues(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values, !!imageFile)) return;
    onOpenChange(next);
  };

  const save = async () => {
    if (!values.name.trim() || !values.start_date || !values.end_date) {
      setError('Name, start date and end date are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let payload: any;
      if (imageFile) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('project_code', values.project_code);
        fd.append('description', values.description);
        fd.append('start_date', values.start_date);
        fd.append('end_date', values.end_date);
        fd.append('status', values.status);
        if (values.budget) fd.append('budget', values.budget);
        fd.append('currency', values.currency);
        values.country_ids.forEach(id => fd.append('country_ids', String(id)));
        values.donor_ids.forEach(id => fd.append('donor_ids', String(id)));
        values.thematic_focus_ids.forEach(id => fd.append('thematic_focus_ids', String(id)));
        fd.append('lead_partner_id', values.lead_partner_id ? String(values.lead_partner_id) : '');
        fd.append('image', imageFile);
        payload = fd;
      } else {
        payload = {
          name: values.name,
          project_code: values.project_code,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
          status: values.status,
          budget: values.budget ? values.budget : null,
          currency: values.currency,
          country_ids: values.country_ids,
          donor_ids: values.donor_ids,
          thematic_focus_ids: values.thematic_focus_ids,
          lead_partner_id: values.lead_partner_id,
        };
      }
      await mealApi.saveProject(project?.id ?? null, payload);
      toast({ title: project ? 'Project updated' : 'Project created', description: `"${values.name}" has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      const message = e?.response?.data ? JSON.stringify(e.response.data) : 'Could not save the project.';
      setError(message);
      toast({ title: 'Could not save project', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Label>Project Name</Label>
            <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. PROTECT – Cross-Border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Project Code</Label>
              <Input value={values.project_code} onChange={e => setValues(v => ({ ...v, project_code: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={values.status} onValueChange={v => setValues(val => ({ ...val, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MultiSelect
              label="Countries"
              options={countries.map(c => ({ value: c.id, label: c.name }))}
              selected={values.country_ids}
              onChange={ids => setValues(v => ({ ...v, country_ids: ids }))}
            />
            <MultiSelect
              label="Donor(s)"
              options={donors.map(d => ({ value: d.id, label: d.name }))}
              selected={values.donor_ids}
              onChange={ids => setValues(v => ({ ...v, donor_ids: ids }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lead Partner</Label>
              <Select
                value={values.lead_partner_id ? String(values.lead_partner_id) : 'none'}
                onValueChange={v => setValues(val => ({ ...val, lead_partner_id: v === 'none' ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {leadPartners.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <MultiSelect
              label="Thematic Focus"
              options={thematicFocusAreas.map(t => ({ value: t.id, label: t.name }))}
              selected={values.thematic_focus_ids}
              onChange={ids => setValues(v => ({ ...v, thematic_focus_ids: ids }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={values.start_date} onChange={e => setValues(v => ({ ...v, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={values.end_date} onChange={e => setValues(v => ({ ...v, end_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget</Label>
              <Input type="number" value={values.budget} onChange={e => setValues(v => ({ ...v, budget: e.target.value }))} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={values.currency} onValueChange={v => setValues(val => ({ ...val, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Project Image (optional)</Label>
            <Input type="file" accept="image/*" aria-label="Project image" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: C.orange }} className="text-white">
            {saving ? 'Saving...' : 'Save Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
