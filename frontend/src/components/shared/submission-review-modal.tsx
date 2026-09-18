'use client';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function SubmissionReviewModal({
  isOpen,
  onClose,
  submissionData,
  onUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  submissionData: { projectId: number; scheduleId: number; submission: any };
  onUpdated: (updatedSubmission: any) => void;
}) {
  const { projectId, scheduleId, submission } = submissionData;
  const [status, setStatus] = useState(submission.status);
  const [notes, setNotes] = useState(submission.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(submission.status);
    setNotes(submission.notes || '');
  }, [submission]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch(
        `/projects/${projectId}/schedules/${scheduleId}/submissions/${submission.id}/update_status/`,
        { status, notes }
      );

      onUpdated(response.data);
      onClose();
    } catch (err) {
      console.error('Failed to update submission', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Submission: {submission.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block mb-1 font-medium">Status</label>
            <select
              className="w-full border rounded p-2"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option>Pending Review</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>Returned for Amendments</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Notes</label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
