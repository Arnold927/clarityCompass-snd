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
import { mealApi, type LeadPartner, C } from '@/lib/meal-api';

export interface LeadPartnerFormValues {
  name: string; description: string; status: string; partner_type: string;
  head_office: string; website: string; partnership_since: string; notes: string;
}

const EMPTY: LeadPartnerFormValues = {
  name: '', description: '', status: 'ACTIVE', partner_type: 'OTHER',
  head_office: '', website: '', partnership_since: '', notes: '',
};

const PARTNER_TYPE_OPTIONS = [
  { value: 'INTERNATIONAL_NGO', label: 'International NGO' },
  { value: 'LOCAL_NGO', label: 'Local NGO' },
  { value: 'GOVERNMENT', label: 'Government Agency' },
  { value: 'UN_AGENCY', label: 'UN Agency' },
  { value: 'OTHER', label: 'Other' },
];

export function LeadPartnerFormDialog({
  open, onOpenChange, leadPartner, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadPartner: LeadPartner | null; // null = create mode
  onSaved: () => void;
}) {
  const [values, setValues] = useState<LeadPartnerFormValues>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<LeadPartnerFormValues>();

  useEffect(() => {
    if (!open) return;
    setLogoFile(null);
    setError(null);
    const next: LeadPartnerFormValues = leadPartner ? {
      name: leadPartner.name,
      description: leadPartner.description,
      status: leadPartner.status,
      partner_type: leadPartner.partner_type,
      head_office: leadPartner.head_office,
      website: leadPartner.website,
      partnership_since: leadPartner.partnership_since !== null ? String(leadPartner.partnership_since) : '',
      notes: leadPartner.notes,
    } : EMPTY;
    setValues(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadPartner]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values, !!logoFile)) return;
    onOpenChange(next);
  };

  const save = async () => {
    if (!values.name.trim()) {
      setError('Lead Partner name is required.');
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
        fd.append('partner_type', values.partner_type);
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
      await mealApi.saveLeadPartner(leadPartner?.id ?? null, payload);
      toast({ title: leadPartner ? 'Lead Partner updated' : 'Lead Partner created', description: `"${values.name}" has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      const message = e?.response?.data ? JSON.stringify(e.response.data) : 'Could not save the lead partner.';
      setError(message);
      toast({ title: 'Could not save lead partner', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{leadPartner ? 'Edit Lead Partner' : 'New Lead Partner'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Label>Lead Partner Name</Label>
            <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. TDH Germany – terre des hommes Deutschland e.V." />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Partner Type</Label>
              <Select value={values.partner_type} onValueChange={v => setValues(val => ({ ...val, partner_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
              <Input value={values.head_office} onChange={e => setValues(v => ({ ...v, head_office: e.target.value }))} placeholder="e.g. Osnabrück, Germany" />
            </div>
            <div>
              <Label>Partnership Since (year)</Label>
              <Input type="number" value={values.partnership_since} onChange={e => setValues(v => ({ ...v, partnership_since: e.target.value }))} placeholder="e.g. 2018" />
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
            <Input type="file" accept="image/*" aria-label="Lead partner logo" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: C.orange }} className="text-white">
            {saving ? 'Saving...' : 'Save Lead Partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
