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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DisaggregatorOption {
  id: string | number;
  name: string;
}

interface DisaggregatorSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selected: string[]) => void;
  availableDisaggregators: (string | DisaggregatorOption)[];
  selectedDisaggregators: string[];
}

export function DisaggregatorSelector({
  isOpen,
  onClose,
  onSave,
  availableDisaggregators,
  selectedDisaggregators,
}: DisaggregatorSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedDisaggregators);

  useEffect(() => {
    setSelected(selectedDisaggregators);
  }, [selectedDisaggregators]);

  const handleCheckboxChange = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Disaggregators</DialogTitle>
          <DialogDescription>
            Choose the disaggregators for this project indicator.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-60 overflow-y-auto">
          {availableDisaggregators.map(disaggregator => {
            const option =
              typeof disaggregator === 'string'
                ? { id: disaggregator, name: disaggregator }
                : disaggregator;

            return (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id.toString()}
                  checked={selected.includes(option.name)}
                  onCheckedChange={() => handleCheckboxChange(option.name)}
                />
                <Label htmlFor={option.id.toString()} className="font-normal">
                  {option.name}
                </Label>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(selected)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
