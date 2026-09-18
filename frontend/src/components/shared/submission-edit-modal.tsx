'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { Download } from 'lucide-react';

interface SubmissionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionData: any;
  onUpdated: (updated: any) => void;
   handleDownload: (
    submissionId: string,
    projectId: string,
    scheduleId: string,
    title: string
  ) => void;
}

export default function SubmissionEditModal({
  isOpen,
  onClose,
  submissionData,
  onUpdated,
  handleDownload
}: SubmissionEditModalProps) {
  const { projectId, scheduleId, submission } = submissionData;

  const [title, setTitle] = useState(submission.title);
  const [notes, setNotes] = useState(submission.notes);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (submission) {
      setTitle(submission.title);
      setNotes(submission.notes);
      setFile(null);
    }
  }, [submission]);

  const handleSave = async () => {
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("notes", notes);

    if (file) formData.append("file", file);

    try {
      const res = await api.patch(
        `/projects/${projectId}/schedules/${scheduleId}/submissions/${submission.id}/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      onUpdated(res.data);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded p-2"
          />

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border rounded p-2 h-24"
          />

          {/* Download button for current file */}
          {submission.id && (
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <span>Current file:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleDownload(submission.id, projectId, scheduleId, submission.title)
                }
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          )}

          {/* Upload new file */}
          <input
            type="file"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
