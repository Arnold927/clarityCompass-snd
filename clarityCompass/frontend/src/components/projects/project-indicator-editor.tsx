
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
import { Checkbox } from "../ui/checkbox";

interface ProjectIndicatorEditorProps {
  indicator: { name: string; isDonorIndicator?: boolean } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; isDonorIndicator: boolean }) => void;
}

export function ProjectIndicatorEditor({
  indicator,
  isOpen,
  onClose,
  onSave,
}: ProjectIndicatorEditorProps) {
  const [name, setName] = useState('');
  const [isDonorIndicator, setIsDonorIndicator] = useState(false);

  useEffect(() => {
    if (indicator) {
      setName(indicator.name);
      setIsDonorIndicator(!!indicator.isDonorIndicator);
    } else {
      setName('');
      setIsDonorIndicator(false);
    }
  }, [indicator]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim(), isDonorIndicator });
    }
  };
  
  const title = indicator ? "Edit Project Indicator" : "Create New Project Indicator";
  const description = indicator ? "Make changes to your indicator." : "Enter the name for the new indicator.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} Click Save or Next when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Number of wells constructed in Area X"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isDonorIndicator" className="text-right">
              Donor Requirement
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
                <Checkbox id="isDonorIndicator" checked={isDonorIndicator} onCheckedChange={(checked) => setIsDonorIndicator(checked as boolean)} />
                <Label htmlFor="isDonorIndicator" className="font-normal text-sm">Is this a donor indicator?</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{indicator ? 'Save Changes' : 'Next'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
