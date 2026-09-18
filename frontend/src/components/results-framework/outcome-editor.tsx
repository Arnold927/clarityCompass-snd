
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
import { Textarea } from "@/components/ui/textarea";

interface OutcomeEditorProps {
  outcome: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (outcome: any) => void;
}

export function OutcomeEditor({ outcome, isOpen, onClose, onSave }: OutcomeEditorProps) {
  const [currentOutcome, setCurrentOutcome] = useState(outcome);

  useEffect(() => {
    setCurrentOutcome(outcome);
  }, [outcome, isOpen]);

  const handleChange = (field: string, value: string) => {
    setCurrentOutcome((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentOutcome.name) {
      onSave(currentOutcome);
    }
  };

  const title = currentOutcome.id ? "Edit Outcome" : "Add New Outcome";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Outcomes are the medium-term effects of your interventions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Outcome Name</Label>
            <Input
              id="name"
              value={currentOutcome.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Improved learning outcomes..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={currentOutcome.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentOutcome.name}>Save Outcome</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
