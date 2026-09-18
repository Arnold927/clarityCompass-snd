
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const emptySchedule = { id: '', name: '', recipient: '', frequency: '' };

interface ScheduleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { id?: string; name: string; recipient: string; frequency: string }) => void;
  schedule?: any;
  availableRecipients: string[];
  availableFrequencies: string[];
}

export function ScheduleEditor({
  isOpen,
  onClose,
  onSave,
  schedule,
  availableRecipients,
  availableFrequencies,
}: ScheduleEditorProps) {
  const [currentSchedule, setCurrentSchedule] = useState(schedule || emptySchedule);
  
  const isEditing = !!schedule;

  useEffect(() => {
    if (isOpen) {
        setCurrentSchedule(schedule || emptySchedule);
    }
  }, [isOpen, schedule]);

  const handleChange = (field: string, value: string) => {
    setCurrentSchedule((prev:any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentSchedule.name && currentSchedule.recipient && currentSchedule.frequency) {
      onSave(currentSchedule);
      onClose();
    }
  };
  
  const title = isEditing ? "Edit Reporting Schedule" : "Define New Reporting Schedule";
  const description = isEditing ? "Make changes to the schedule below." : "Create a new recurring reporting requirement for this project.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Schedule Name</Label>
            <Input
              id="name"
              value={currentSchedule.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Quarterly Donor Report"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Select onValueChange={(value) => handleChange('recipient', value)} value={currentSchedule.recipient}>
                <SelectTrigger id="recipient">
                    <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                    {availableRecipients.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
             <Select onValueChange={(value) => handleChange('frequency', value)} value={currentSchedule.frequency}>
                <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select a frequency" />
                </SelectTrigger>
                <SelectContent>
                    {availableFrequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!currentSchedule.name || !currentSchedule.recipient || !currentSchedule.frequency}>
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
