
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ReportUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (details: { title: string; file: File; notes: string; scheduleId: string; }) => void;
  projectName: string;
  schedules: any[];
  scheduleId: string;
}

export function ReportUploader({
  isOpen,
  onClose,
  onUpload,
  projectName,
  schedules,
  scheduleId,
}: ReportUploaderProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState(scheduleId || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setFile(null);
      setNotes('');
      setSelectedScheduleId(scheduleId || '');
    }
  }, [isOpen, scheduleId]);

  const handleUpload = () => {
    if (title && file && selectedScheduleId) {
      onUpload({ title, file, notes, scheduleId: selectedScheduleId });
      onClose();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files) {
          setFile(e.target.files[0]);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Report for: {projectName}</DialogTitle>
          <DialogDescription>
            Select the report type, provide a title, and select the document to upload.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule" className="text-right">Report Type</Label>
                <Select onValueChange={setSelectedScheduleId} value={selectedScheduleId}>
                    <SelectTrigger id="schedule" className="col-span-3">
                        <SelectValue placeholder="Select a report type" />
                    </SelectTrigger>
                    <SelectContent>
                        {schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Report Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" placeholder="e.g., Q3 2024 Narrative Report"/>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Report Document</Label>
                <div className="col-span-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden"/>
                     {file ? (
                          <div className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <span className="truncate pr-2">{file.name}</span>
                            <Button variant="ghost" size="icon" type="button" className="h-6 w-6 shrink-0" onClick={() => setFile(null)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                     ) : (
                        <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Select Document
                        </Button>
                     )}
                </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="col-span-3"
                    rows={4}
                    placeholder="Add any relevant notes for this report..."
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!title || !file || !selectedScheduleId}>
            Upload Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
