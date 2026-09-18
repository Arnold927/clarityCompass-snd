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
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Plus } from 'lucide-react';

interface Disaggregator {
  id: number;
  name: string;
}

interface DisaggregatorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selected: string[]) => void;
  onAddNew: (newDisaggregator: string) => void;
  availableDisaggregators: Disaggregator[];
  selectedDisaggregators: string[];
  indicatorName: string;
}

export function DisaggregatorManager({
  isOpen,
  onClose,
  onSave,
  onAddNew,
  availableDisaggregators,
  selectedDisaggregators,
  indicatorName,
}: DisaggregatorManagerProps) {
  const [selected, setSelected] = useState<string[]>(selectedDisaggregators);
  const [newDisaggregator, setNewDisaggregator] = useState('');
  const [localDisaggregators, setLocalDisaggregators] = useState<Disaggregator[]>(availableDisaggregators);

  useEffect(() => {
    setSelected(selectedDisaggregators);
    setLocalDisaggregators(availableDisaggregators);
  }, [selectedDisaggregators, availableDisaggregators, isOpen]);

  const handleCheckboxChange = (disaggregator: string) => {
    setSelected(prev =>
      prev.includes(disaggregator)
        ? prev.filter(d => d !== disaggregator)
        : [...prev, disaggregator]
    );
  };

  const handleAddClick = () => {
    if (newDisaggregator.trim()) {
      const newItem: Disaggregator = {
        id: Date.now(),
        name: newDisaggregator.trim(),
      };

      setLocalDisaggregators(prev => [...prev, newItem]);
      setSelected(prev => [...prev, newDisaggregator.trim()]);
      onAddNew(newDisaggregator.trim());
      setNewDisaggregator('');
    }
  };

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Disaggregators</DialogTitle>
          <DialogDescription>
            Select standard disaggregators for the indicator: <strong>{indicatorName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ScrollArea className="h-60 w-full rounded-md border p-4">
            <div className="grid gap-4">
              {localDisaggregators.map(disaggregator => (
                <div key={disaggregator.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`check-${disaggregator.id}`}
                    checked={selected.includes(disaggregator.name)}
                    onCheckedChange={() => handleCheckboxChange(disaggregator.name)}
                  />
                  <Label htmlFor={`check-${disaggregator.id}`} className="font-normal">
                    {disaggregator.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator />

          <div>
            <Label htmlFor="new-disaggregator" className="text-xs text-muted-foreground">
              Add to Standard List
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="new-disaggregator"
                placeholder="e.g., Age Group"
                value={newDisaggregator}
                onChange={(e) => setNewDisaggregator(e.target.value)}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleAddClick}
                disabled={!newDisaggregator.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Selections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
