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
import { useConfirmDiscard } from './use-confirm-discard';
import { mealApi, type ThematicFocus, C } from '@/lib/meal-api';

export interface ThematicFocusFormValues {
  name: string; description: string; status: string; reporting_frequency: string;
  responsible_person: string; notes: string;
  reach_total: string; reach_male: string; reach_female: string; reach_pwd: string;
}

const EMPTY: ThematicFocusFormValues = {
  name: '', description: '', status: 'ACTIVE', reporting_frequency: 'Annual',
  responsible_person: '', notes: '', reach_total: '0', reach_male: '0', reach_female: '0', reach_pwd: '0',
};

export function ThematicFocusFormDialog({
  open, onOpenChange, thematicFocus, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thematicFocus: ThematicFocus | null; // null = create mode
  onSaved: () => void;
}) {
  const [values, setValues] = useState<ThematicFocusFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<ThematicFocusFormValues>();

  useEffect(() => {
    if (!open) return;
    setError(null);
    const next: ThematicFocusFormValues = thematicFocus ? {
      name: thematicFocus.name,
      description: thematicFocus.description,
      status: thematicFocus.status,
      reporting_frequency: thematicFocus.reporting_frequency,
      responsible_person: thematicFocus.responsible_person,
      notes: thematicFocus.notes,
      reach_total: String(thematicFocus.reach_total),
      reach_male: String(thematicFocus.reach_male),
      reach_female: String(thematicFocus.reach_female),
      reach_pwd: String(thematicFocus.reach_pwd),
    } : EMPTY;
    setValues(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, thematicFocus]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values)) return;
    onOpenChange(next);
  };

  const save = async () => {
    if (!values.name.trim()) {
      setError('Thematic focus name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mealApi.saveThematicFocus(thematicFocus?.id ?? null, {
        name: values.name,
        description: values.description,
        status: values.status,
        reporting_frequency: values.reporting_frequency,
        responsible_person: values.responsible_person,
        notes: values.notes,
        reach_total: Number(values.reach_total) || 0,
        reach_male: Number(values.reach_male) || 0,
        reach_female: Number(values.reach_female) || 0,
        reach_pwd: Number(values.reach_pwd) || 0,
      });
      toast({ title: thematicFocus ? 'Thematic focus updated' : 'Thematic focus created', description: `"${values.name}" has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      const message = e?.response?.data ? JSON.stringify(e.response.data) : 'Could not save the thematic focus.';
      setError(message);
      toast({ title: 'Could not save thematic focus', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{thematicFocus ? 'Edit Thematic Focus' : 'New Thematic Focus'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Label>Thematic Focus Name</Label>
            <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={values.status} onValueChange={v => setValues(val => ({ ...val, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reporting Frequency</Label>
              <Input value={values.reporting_frequency} onChange={e => setValues(v => ({ ...v, reporting_frequency: e.target.value }))} placeholder="e.g. Annual" />
            </div>
          </div>

          <div>
            <Label>Responsible Person</Label>
            <Input value={values.responsible_person} onChange={e => setValues(v => ({ ...v, responsible_person: e.target.value }))} placeholder="e.g. MEAL Manager" />
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">Reach (entered manually — not linked to Projects)</Label>
            <div className="grid grid-cols-4 gap-3 mt-2">
              <div>
                <Label className="text-xs">Total Reach</Label>
                <Input type="number" value={values.reach_total} onChange={e => setValues(v => ({ ...v, reach_total: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Male</Label>
                <Input type="number" value={values.reach_male} onChange={e => setValues(v => ({ ...v, reach_male: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Female</Label>
                <Input type="number" value={values.reach_female} onChange={e => setValues(v => ({ ...v, reach_female: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">PWD</Label>
                <Input type="number" value={values.reach_pwd} onChange={e => setValues(v => ({ ...v, reach_pwd: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Reach is entered independently — it doesn't have to equal Male + Female + PWD.
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: C.orange }} className="text-white">
            {saving ? 'Saving...' : 'Save Thematic Focus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
