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
import { mealApi, type Country, C } from '@/lib/meal-api';

export interface CountryFormValues {
  name: string; iso_code: string; region: string; description: string;
  status: string; first_implementation_year: string; notes: string;
}

const EMPTY: CountryFormValues = {
  name: '', iso_code: '', region: '', description: '', status: 'ACTIVE',
  first_implementation_year: '', notes: '',
};

export function CountryFormDialog({
  open, onOpenChange, country, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null; // null = create mode
  onSaved: () => void;
}) {
  const [values, setValues] = useState<CountryFormValues>(EMPTY);
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { capture, confirmClose } = useConfirmDiscard<CountryFormValues>();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFlagFile(null);
    const next: CountryFormValues = country ? {
      name: country.name,
      iso_code: country.iso_code,
      region: country.region,
      description: country.description,
      status: country.status,
      first_implementation_year: country.first_implementation_year !== null ? String(country.first_implementation_year) : '',
      notes: country.notes,
    } : EMPTY;
    setValues(next);
    capture(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, country]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !confirmClose(values, !!flagFile)) return;
    onOpenChange(next);
  };

  const save = async () => {
    if (!values.name.trim()) {
      setError('Country name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let payload: any;
      if (flagFile) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('iso_code', values.iso_code);
        fd.append('region', values.region);
        fd.append('description', values.description);
        fd.append('status', values.status);
        if (values.first_implementation_year) fd.append('first_implementation_year', values.first_implementation_year);
        fd.append('notes', values.notes);
        fd.append('flag', flagFile);
        payload = fd;
      } else {
        payload = {
          ...values,
          first_implementation_year: values.first_implementation_year ? Number(values.first_implementation_year) : null,
        };
      }
      await mealApi.saveCountry(country?.id ?? null, payload);
      toast({ title: country ? 'Country updated' : 'Country created', description: `"${values.name}" has been saved.` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      const message = e?.response?.data ? JSON.stringify(e.response.data) : 'Could not save the country.';
      setError(message);
      toast({ title: 'Could not save country', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{country ? 'Edit Country' : 'New Country'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label>Country Name</Label>
              <Input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Kenya" />
            </div>
            <div>
              <Label>ISO Code</Label>
              <Input value={values.iso_code} onChange={e => setValues(v => ({ ...v, iso_code: e.target.value.toUpperCase() }))} placeholder="KE" maxLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Region</Label>
              <Input value={values.region} onChange={e => setValues(v => ({ ...v, region: e.target.value }))} placeholder="e.g. East Africa" />
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

          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} placeholder="e.g. SND Africa works in Kenya to promote resilient communities through..." />
          </div>

          <div>
            <Label>First Implementation Year</Label>
            <Input type="number" value={values.first_implementation_year} onChange={e => setValues(v => ({ ...v, first_implementation_year: e.target.value }))} placeholder="e.g. 2018" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))} />
          </div>

          <div>
            <Label>Flag Image (optional)</Label>
            <Input type="file" accept="image/*" aria-label="Country flag" onChange={e => setFlagFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground mt-1">
              If no flag is uploaded, a flag derived from the ISO code is shown instead.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: C.orange }} className="text-white">
            {saving ? 'Saving...' : 'Save Country'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
