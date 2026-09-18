
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
  output: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (output: any) => void;
}

export function OutputEditor({ output, isOpen, onClose, onSave }: OutputEditorProps) {
  const [currentOutput, setCurrentOutput] = useState(output);

  useEffect(() => {
    setCurrentOutput(output);
  }, [output, isOpen]);

  const handleChange = (field: string, value: string) => {
    setCurrentOutput((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentOutput.name) {
      onSave(currentOutput);
    }
  };

  const title = currentOutput.id ? "Edit Output" : "Add New Output";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Outputs are the direct products or services delivered by a program.
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentOutput.name}>Save Output</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
