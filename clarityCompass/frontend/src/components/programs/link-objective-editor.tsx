import React, { useState } from "react";
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

interface LinkObjectiveEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (objective: any) => void;
  availableObjectives: {
    id?: string | number; 
    number: string;
    name: string;
  }[];
}

const getUniqueId = (obj: any): string => {
  if (obj.id) return obj.id.toString();
  return `${obj.number}-${obj.name.replace(/\s+/g, '-')}`;
};

export function LinkObjectiveEditor({
  isOpen,
  onClose,
  onLink,
  availableObjectives,
}: LinkObjectiveEditorProps) {
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);

  const handleLink = () => {
  if (selectedObjective) {
    const objective = availableObjectives.find(obj => 
      getUniqueId(obj) === selectedObjective
    );
    if(objective) {
      onLink(objective);
    }
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Strategic Objective</DialogTitle>
          <DialogDescription>
            Select a strategic objective to link to this program.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="objective" className="text-right">
              Objective
            </Label>
            <Select onValueChange={setSelectedObjective}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an objective" />
                </SelectTrigger>
                <SelectContent>
                  {availableObjectives.map((obj) => {
                    const uniqueId = getUniqueId(obj);
                    return (
                      <SelectItem key={uniqueId} value={uniqueId}>
                        {obj.number}: {obj.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selectedObjective}>Link Objective</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
