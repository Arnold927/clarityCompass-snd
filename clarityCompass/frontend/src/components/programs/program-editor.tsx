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

interface ProgramEditorProps {
  program: {
    id: string;
    name: string;
    description: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: any) => void;
}

const emptyProgram = { id: '', name: '', description: '' };

export function ProgramEditor({
  program,
  isOpen,
  onClose,
  onSave,
}: ProgramEditorProps) {
  const [currentProgram, setCurrentProgram] = useState(program || emptyProgram);

  useEffect(() => {
    setCurrentProgram(program || emptyProgram);
  }, [program]);

  const handleChange = (field: string, value: string) => {
    setCurrentProgram(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(currentProgram);
  };
  
  const title = program ? "Edit Program" : "Create New Program";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {program ? "Make changes to your program here." : "Enter the details for the new program."}
             Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={currentProgram.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={currentProgram.description}
              onChange={(e) => handleChange('description', e.target.value)}
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
