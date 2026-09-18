

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';

interface QaAdjustmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustmentData: any) => void;
  qaItem: {
    taskId: string;
    taskTitle: string;
    indicatorId: string;
    indicatorName: string;
    disaggregator: string;
    reportedValue: number;
    adjustment: { value: number; justification: string };
  };
}

export function QaAdjustmentEditor({
  isOpen,
  onClose,
  onSave,
  qaItem,
}: QaAdjustmentEditorProps) {
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (qaItem && qaItem.adjustment) {
      setAdjustmentValue(String(qaItem.adjustment.value || ''));
      setJustification(qaItem.adjustment.justification || '');
    } else {
      setAdjustmentValue('');
      setJustification('');
    }
  }, [qaItem]);

  const handleSave = () => {
    if (justification.trim()) {
      onSave({
        ...qaItem,
        value: Number(adjustmentValue) || 0,
        justification,
      });
    }
  };

  if (!qaItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Indicator Value</DialogTitle>
          <DialogDescription>
            Review and adjust the reported value for: <br/>
            <strong>{qaItem.indicatorName} ({qaItem.disaggregator})</strong> on task "{qaItem.taskTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reportedValue" className="text-right">Reported Value</Label>
            <Input id="reportedValue" value={qaItem.reportedValue} readOnly className="col-span-3 bg-muted" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="adjustment" className="text-right">Adjustment</Label>
            <Input
              id="adjustment"
              type="number"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              className="col-span-3"
              placeholder="e.g., -5 or 10"
            />
          </div>
           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="justification" className="text-right pt-2">Justification</Label>
            <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="col-span-3"
                rows={4}
                placeholder="Explain why this adjustment is needed."
            />
           </div>
           <div className="grid grid-cols-4 items-center gap-4 font-bold">
              <Label className="text-right">Final Value</Label>
              <span className="col-span-3 text-lg">
                {(qaItem.reportedValue || 0) + (Number(adjustmentValue) || 0)}
              </span>
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!justification.trim()}>Save Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
