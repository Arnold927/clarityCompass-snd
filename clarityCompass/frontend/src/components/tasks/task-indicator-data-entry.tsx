

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TaskIndicatorDataEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  indicator: any;
  initialData: any;
}

export function TaskIndicatorDataEntry({ isOpen, onClose, onSave, indicator, initialData }: TaskIndicatorDataEntryProps) {
  const [data, setData] = useState(initialData || {});

  useEffect(() => {
    // If there's no initial data, create an empty object structure
    // based on the indicator's disaggregators.
    if (!initialData && indicator) {
        const emptyData = indicator.disaggregators.reduce((acc: any, disaggregator: string) => {
            acc[disaggregator] = '';
            return acc;
        }, {});
        setData(emptyData);
    } else {
        setData(initialData || {});
    }
  }, [initialData, indicator, isOpen]);

  const handleChange = (disaggregator: string, value: string) => {
    setData(prev => ({ ...prev, [disaggregator]: value }));
  };

  const handleSave = () => {
    onSave(data);
  };

  if (!indicator) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report on: {indicator.name}</DialogTitle>
          <DialogDescription>Enter the data for the required disaggregators.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {(indicator.disaggregators || []).map((disaggregator: string) => (
            <div key={disaggregator} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={disaggregator} className="text-right">{disaggregator}</Label>
              <Input
                id={disaggregator}
                type="number"
                value={data[disaggregator] || ''}
                onChange={(e) => handleChange(disaggregator, e.target.value)}
                className="col-span-3"
              />
            </div>
          ))}
          {(!indicator.disaggregators || indicator.disaggregators.length === 0) && (
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">Value</Label>
                   <Input
                        id="value"
                        type="number"
                        value={data['value'] || ''}
                        onChange={(e) => handleChange('value', e.target.value)}
                        className="col-span-3"
                    />
              </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
