
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

interface ActivityEditorProps {
  activity: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: any) => void;
}

const emptyActivity = { id: null, name: '' };

export function ActivityEditor({ activity, isOpen, onClose, onSave }: ActivityEditorProps) {
  const [currentActivity, setCurrentActivity] = useState(activity?.id ? activity : emptyActivity);

  useEffect(() => {
    setCurrentActivity(activity?.id ? activity : emptyActivity);
  }, [activity, isOpen]);

  const handleChange = (field: string, value: string) => {
    setCurrentActivity(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (currentActivity.name) {
      onSave(currentActivity);
    }
  };

  const title = activity?.id ? "Edit Activity" : "Add New Activity";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Key activities are the specific actions undertaken to produce outputs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Activity Name</Label>
            <Input
              id="name"
              value={currentActivity.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Conduct pedagogical training workshops"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentActivity.name}>Save Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
