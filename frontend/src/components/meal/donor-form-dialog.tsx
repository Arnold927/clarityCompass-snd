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
import { mealApi, type Donor, C } from '@/lib/meal-api';

export interface DonorFormValues {
  name: string; description: string; status: string; donor_type: string;
  head_office: string; website: string; partnership_since: string; notes: string;
}

const EMPTY: DonorFormValues = {
  name: '', description: '', status: 'ACTIVE', donor_type: 'OTHER',
  head_office: '', website: '', partnership_since: '', notes: '',
};

const DONOR_TYPE_OPTIONS = [
  { value: 'BILATERAL', label: 'Bilateral Donor' },
  { value: 'MULTILATERAL', label: 'Multilateral Donor' },
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'UN_AGENCY', label: 'UN Agency' },
  { value: 'OTHER', label: 'Other' },
];

export function DonorFormDialog({
  open, onOpenChange, donor, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donor: Donor | null; // null = create mode
  onSaved: () => void;
}) {
  const [values, setValues] = useState<DonorFormValues>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<DonorFormValues>();

  useEffect(() => {
    if (!open) return;
    setLogoFile(null);
    setError(null);
    const next: DonorFormValues = donor ? {
      name: donor.name,
      description: donor.description,
      status: donor.status,
      donor_type: donor.donor_type,
      head_office: donor.head_office,
      website: donor.website,
      partnership_since: donor.partnership_since !== null ? String(donor.partnership_since) : '',
      notes: donor.notes,
    } : EMPTY;
    setValues(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, donor]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values, !!logoFile)) return;
    onOpenChange(next);
  };

  const save = async () => {
    if (!values.name.trim()) {
      setError('Donor name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let payload: any;
      if (logoFile) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('description', values.description);
        fd.append('status', values.status);
        fd.append('donor_type', values.donor_type);
        fd.append('head_office', values.head_office);
        fd.append('website', values.website);
        if (values.partnership_since) fd.append('partnership_since', values.partnership_since);
        fd.append('notes', values.notes);
        fd.append('logo', logoFile);
        payload = fd;
      } else {
        payload = {
          ...values,
          partnership_since: values.partnership_since ? Number(values.partnership_since) : null,
        };
      }
      await mealApi.saveDonor(donor?.id ?? null, payload);
      toast({ title: donor ? 'Donor updated' : 'Donor created', description: `"${values.name}" has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      const message = e?.response?.data ? JSON.stringify(e.response.data) : 'Could not save the donor.';
      setError(message);
      toast({ title: 'Could not save donor', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{donor ? 'Edit Donor' : 'New Donor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Label>Donor Name</Label>
            <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. BMZ - German Federal Ministry for Economic Cooperation and Development" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Donor Type</Label>
              <Select value={values.donor_type} onValueChange={v => setValues(val => ({ ...val, donor_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DONOR_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Head Office</Label>
              <Input value={values.head_office} onChange={e => setValues(v => ({ ...v, head_office: e.target.value }))} placeholder="e.g. Bonn, Germany" />
            </div>
            <div>
              <Label>Partnership Since (year)</Label>
              <Input type="number" value={values.partnership_since} onChange={e => setValues(v => ({ ...v, partnership_since: e.target.value }))} placeholder="e.g. 2019" />
            </div>
          </div>

          <div>
            <Label>Website</Label>
            <Input value={values.website} onChange={e => setValues(v => ({ ...v, website: e.target.value }))} placeholder="https://" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))} />
          </div>

          <div>
            <Label>Logo (optional)</Label>
            <Input type="file" accept="image/*" aria-label="Donor logo" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: C.orange }} className="text-white">
            {saving ? 'Saving...' : 'Save Donor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
