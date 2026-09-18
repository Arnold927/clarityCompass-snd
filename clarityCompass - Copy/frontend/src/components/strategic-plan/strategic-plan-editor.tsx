
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

interface StrategicPlan {
  title: string;
  version: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  overall_objective: string;
  strategic_objectives: string[];
}

interface StrategicPlanEditorProps {
  plan: StrategicPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: StrategicPlan) => void;
}
  
const emptyPlan: StrategicPlan = {
  title: "",
  version: "1.0",
  start_date: "",
  end_date: "",
  is_active: true,
  overall_objective: "",
  strategic_objectives: [],
}

export function StrategicPlanEditor({
  plan,
  isOpen,
  onClose,
  onSave,
}: StrategicPlanEditorProps) {
  const [currentPlan, setCurrentPlan] = useState<StrategicPlan>(plan || emptyPlan);

  useEffect(() => {
    setCurrentPlan(plan || emptyPlan);
  }, [plan, isOpen]);

  const handleChange = (field: keyof StrategicPlan, value: string) => {
    setCurrentPlan((prev: StrategicPlan) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(currentPlan);
  };
  
  const title = plan ? "Edit Strategic Plan" : "Create New Strategic Plan";


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {plan ? "Make changes to your strategic plan." : "Define your new strategic plan. You can add objectives later."} Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={currentPlan.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">
              Version
            </Label>
            <Input
              id="version"
              value={currentPlan.version}
              onChange={(e) => handleChange('version', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={currentPlan.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={currentPlan.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="overallObjective" className="text-right pt-2">
              Overall Objective
            </Label>
            <Textarea
              id="overallObjective"
              value={currentPlan.overall_objective}
              onChange={(e) => handleChange('overall_objective', e.target.value)}
              className="col-span-3"
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
