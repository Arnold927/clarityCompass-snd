
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
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

interface QaDisaggregatorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustments: any) => void;
  qaItem: {
    taskId: string;
    taskTitle: string;
    indicatorId: string;
    indicatorName: string;
    disaggregators: {
        name: string;
        reportedValue: number;
        adjustment: { value: number; justification: string; };
    }[];
  };
}

export function QaDisaggregatorEditor({
  isOpen,
  onClose,
  onSave,
  qaItem,
}: QaDisaggregatorEditorProps) {
  const [adjustments, setAdjustments] = useState<{ [key: string]: { value: number, justification: string } }>({});

  useEffect(() => {
    if (qaItem) {
      const initialAdjustments = qaItem.disaggregators.reduce((acc, disagg) => {
        acc[disagg.name] = {
          value: disagg.adjustment.value || 0,
          justification: disagg.adjustment.justification || ''
        };
        return acc;
      }, {} as { [key: string]: { value: number, justification: string } });
      setAdjustments(initialAdjustments);
    }
  }, [qaItem, isOpen]);
 
  const handleAdjustmentChange = (disaggregator: string, value: string) => {
    setAdjustments(prev => ({
      ...prev,
      [disaggregator]: { ...prev[disaggregator], value: Number(value) || 0 }
    }));
  };
  
  const handleJustificationChange = (disaggregator: string, justification: string) => {
     setAdjustments(prev => ({
      ...prev,
      [disaggregator]: { ...prev[disaggregator], justification }
    }));
  }

  const handleSave = () => {
    onSave(adjustments);
  };

  if (!qaItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adjust Indicator Values</DialogTitle>
          <DialogDescription>
            Review and adjust the reported values for: <br/>
            <strong>{qaItem.indicatorName}</strong> on task "{qaItem.taskTitle}".
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="grid gap-8 py-4 pr-4">
            {qaItem.disaggregators.map(disagg => (
              <div key={disagg.name}>
                 <Separator />
                 <h4 className="font-semibold text-md my-4">{disagg.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={`reported-${disagg.name}`} className="text-right">Reported</Label>
                            <Input id={`reported-${disagg.name}`} value={disagg.reportedValue} readOnly className="col-span-2 bg-muted" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={`adjustment-${disagg.name}`} className="text-right">Adjustment</Label>
                            <Input
                            id={`adjustment-${disagg.name}`}
                            type="number"
                            value={adjustments[disagg.name]?.value || ''}
                            onChange={(e) => handleAdjustmentChange(disagg.name, e.target.value)}
                            className="col-span-2"
                            placeholder="e.g., -5"
                            />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 font-bold">
                            <Label className="text-right">Final Value</Label>
                            <span className="col-span-2 text-lg">
                                {disagg.reportedValue + (adjustments[disagg.name]?.value || 0)}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`justification-${disagg.name}`}>Justification</Label>
                        <Textarea
                            id={`justification-${disagg.name}`}
                            value={adjustments[disagg.name]?.justification || ''}
                            onChange={(e) => handleJustificationChange(disagg.name, e.target.value)}
                            className="h-full"
                            rows={5}
                            placeholder={`Explain the adjustment for ${disagg.name}...`}
                        />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save All Adjustments</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
