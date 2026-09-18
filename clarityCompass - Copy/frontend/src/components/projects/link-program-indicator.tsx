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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LinkProgramIndicatorProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (indicatorData: any) => void;
  availableIndicators: {
    id: number;
    linkedProgramIndicatorName: string;
    linkedStrategicObjectiveNumber: string;
    allDisaggregators: string[];
  }[];
  currentProgramIndicator?: string | null;
}

export function LinkProgramIndicator({
  isOpen,
  onClose,
  onLink,
  availableIndicators,
  currentProgramIndicator,
}: LinkProgramIndicatorProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedValue(currentProgramIndicator || null);
    }
  }, [isOpen, currentProgramIndicator]);

  const handleLink = () => {
    if (selectedValue) {
      const selected = availableIndicators.find(ind => ind.linkedProgramIndicatorName === selectedValue);
      onLink(selected);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link to Program Indicator</DialogTitle>
          <DialogDescription>
            Select a program indicator to link this project indicator to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="indicator" className="text-right">
              Indicator
            </Label>
            <Select value={selectedValue || ""} onValueChange={setSelectedValue}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an indicator" />
              </SelectTrigger>
              <SelectContent>
                {availableIndicators.map((indicator) => (
                  <SelectItem
                    key={indicator.id}
                    value={indicator.linkedProgramIndicatorName}
                  >
                    ({indicator.linkedStrategicObjectiveNumber}){" "}
                    {indicator.linkedProgramIndicatorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selectedValue}>Next</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



