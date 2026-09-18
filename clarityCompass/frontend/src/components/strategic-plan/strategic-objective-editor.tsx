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

interface Objective {
  id?: string;
  number?: string;
  name: string;
  description: string;
}

interface StrategicObjectiveEditorProps {
  objective: Objective;
  isOpen: boolean;
  onClose: () => void;
  onSave: (objective: Objective) => void;
  formError?: string | null;
}

const emptyObjective: Objective = {
  name: '',
  description: ''
};

export function StrategicObjectiveEditor({
  objective,
  isOpen,
  onClose,
  onSave,
  formError,
}: StrategicObjectiveEditorProps) {
  const [currentObjective, setCurrentObjective] = useState<Objective>(
    objective?.id ? objective : emptyObjective
  );

  useEffect(() => {
    setCurrentObjective(objective?.id ? objective : emptyObjective);
  }, [objective, isOpen]);

  const handleChange = (field: keyof Objective, value: string) => {
    setCurrentObjective((prev: Objective) => ({ ...prev, [field]: value }));
  };

  const title = objective?.id
    ? `Edit Strategic Objective (${objective.number})`
    : "Add New Strategic Objective";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Make changes to your strategic objective here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <div className="col-span-3">
              <Input
                id="name"
                value={currentObjective.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Description</Label>
            <div className="col-span-3">
              <Textarea
                id="description"
                value={currentObjective.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={5}
              />
            </div>
          </div>

          {formError && (
            <div className="text-red-600 text-sm mt-2">{formError}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(currentObjective)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
