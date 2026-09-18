
'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OutputIndicatorEditorProps {
  indicator: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: any) => void;
}

export function OutputIndicatorEditor({ indicator, isOpen, onClose, onSave }: OutputIndicatorEditorProps) {
  const [currentIndicator, setCurrentIndicator] = useState(indicator);

  useEffect(() => {
    setCurrentIndicator(indicator);
  }, [indicator, isOpen]);

  const handleChange = (field: string, value: string) => {
    setCurrentIndicator((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentIndicator.name) {
      onSave(currentIndicator);
    }
  };

  const title = currentIndicator.id ? "Edit Output Indicator" : "Add New Output Indicator";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Output indicators measure the quantity and quality of the outputs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Indicator Name</Label>
            <Input
              id="name"
              value={currentIndicator.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Number of teachers trained"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentIndicator.name}>Save Indicator</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
