'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export interface Donor {
  id?: number;
  name: string;
  donor_type: string;
  contact_info?: string;
  email?: string;
  phone?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
}

interface DonorEditorProps {
  donor: Donor | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (donor: Donor) => void;
}

export function DonorEditor({ donor, isOpen, onClose, onSave }: DonorEditorProps) {
  const [formData, setFormData] = useState<Donor>({
    name: '',
    donor_type: 'INDIVIDUAL',
    contact_info: '',
    email: '',
    phone: '',
    country: '',
    website: '',
    notes: '',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (donor) {
      setFormData(donor);
    } else {
      setFormData({
        name: '',
        donor_type: 'INDIVIDUAL',
        contact_info: '',
        email: '',
        phone: '',
        country: '',
        website: '',
        notes: '',
        is_active: true,
      });
    }
  }, [donor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving donor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof Donor, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const donorTypes = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'FOUNDATION', label: 'Foundation' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'NGO', label: 'NGO' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {donor?.id ? 'Edit Donor' : 'Add New Donor'}
          </DialogTitle>
          <DialogDescription>
            {donor?.id 
              ? 'Update donor information'
              : 'Add a new donor to the system. Donors can be assigned to projects.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Donor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter donor name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donor_type">Donor Type</Label>
              <Select
                value={formData.donor_type}
                onValueChange={(value) => handleChange('donor_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select donor type" />
                </SelectTrigger>
                <SelectContent>
                  {donorTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="donor@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_info">Contact Information</Label>
            <Textarea
              id="contact_info"
              value={formData.contact_info || ''}
              onChange={(e) => handleChange('contact_info', e.target.value)}
              placeholder="Additional contact details, addresses, etc."
              rows={3}
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  is_active: e.target.checked 
                }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active Donor
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about the donor"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : donor?.id ? 'Update Donor' : 'Add Donor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}