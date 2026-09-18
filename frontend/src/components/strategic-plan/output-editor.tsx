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

interface OutputEditorProps {
  output: Output | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (output: Output) => void;
}

export interface Output {
  id: number | null;
  name: string;
  description?: string;
  indicators: any[];
  activities: any[];
}

const emptyOutput: Output = { id: null, name: '', description: '', indicators: [], activities: [] };

export function OutputEditor({ output, isOpen, onClose, onSave }: OutputEditorProps) {
  const [currentOutput, setCurrentOutput] = useState<Output>(output?.id ? output : emptyOutput);

  useEffect(() => {
    setCurrentOutput(output?.id ? output : emptyOutput);
  }, [output, isOpen]);

  const handleChange = (field: keyof Output, value: string) => {
    setCurrentOutput(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentOutput.name.trim()) {
      onSave(currentOutput);
    }
  };

  const title = output?.id ? "Edit Output" : "Add New Output";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Outputs are the direct, tangible products or services of your activities.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Output Name</Label>
            <Input
              id="name"
              value={currentOutput.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Enhanced teaching capacity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Output Description</Label>
            <textarea
              id="description"
              value={currentOutput.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add a brief description of the output"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentOutput.name.trim()}>Save Output</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
