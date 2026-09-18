
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
import { Textarea } from "../ui/textarea";

interface OutcomeEditorProps {
  outcome: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (outcome: any) => void;
}

interface Outcome {
  id: string | null;
  name: string;
  description: string;
  indicators: any[];
}


const emptyOutcome = { id: null, name: '', description: '', indicators: [] };

export function OutcomeEditor({ outcome, isOpen, onClose, onSave }: OutcomeEditorProps) {
  const [currentOutcome, setCurrentOutcome] = useState(outcome?.id ? outcome : emptyOutcome);

  useEffect(() => {
    if (!isOpen) {
      setCurrentOutcome(emptyOutcome);
    } else {
      setCurrentOutcome(outcome?.id ? outcome : emptyOutcome);
    }
  }, [isOpen, outcome]);


  const handleChange = (field: keyof Outcome, value: string) => {
    setCurrentOutcome((prev: Outcome) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentOutcome.name) {
      onSave(currentOutcome);
    }
  };

  const title = outcome?.id ? "Edit Strategic Outcome" : "Add New Strategic Outcome";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Outcomes are the medium-term effects of your interventions, contributing to a strategic objective.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Outcome Name</Label>
            <Input
              id="name"
              value={currentOutcome.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Improved learning outcomes for primary students"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={currentOutcome.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the change you expect to see."
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
