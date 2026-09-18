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
import { Label } from "@/components/ui/label";
import { Input } from "../ui/input";
import { on } from "events";

interface LinkIndicatorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: any) => void;
  title: string;
  initialValue?: string;
  setIndicator: React.Dispatch<React.SetStateAction<string>>;
}

export function LinkIndicatorEditor({
  isOpen,
  onClose,
  onSave,
  title,
  initialValue = "",
}: LinkIndicatorEditorProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setName(initialValue);
  }, [isOpen, initialValue]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Define an indicator to measure this program-level item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="indicator-name">Indicator Name</Label>
            <Input
              id="indicator-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., % of households with safe water access"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initialValue ? "Save Indicator" : "Add Indicator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
