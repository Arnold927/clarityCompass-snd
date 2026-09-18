'use client';
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface SubmissionHistoryItem {
  id: number;
  status: string;
  notes: string | null;
  reviewed_by_name: string;
  reviewed_at: string;
}

export default function SubmissionHistoryDialog({
  isOpen,
  onClose,
  submissionData
}: {
  isOpen: boolean;
  onClose: () => void;
  submissionData: { projectId: number; scheduleId: number; submissionId: number };
}) {
  const { projectId, scheduleId, submissionId } = submissionData;
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(
          `/projects/${projectId}/schedules/${scheduleId}/submissions/${submissionId}/history/`
        );
        setHistory(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, projectId, scheduleId, submissionId]);

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "submitted":
        return "bg-blue-100 text-blue-700";
      case "pending":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Submission Review History</DialogTitle>
        </DialogHeader>

        <div className="mt-2 h-[350px] overflow-y-auto border rounded-md p-3 bg-white">
          {loading ? (
            <p className="text-gray-600 text-sm">Loading history...</p>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : history.length === 0 ? (
            <p className="text-gray-600 text-sm">This submission has no review history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-2 py-1 text-left">Status</th>
                  <th className="border px-2 py-1 text-left">Notes</th>
                  <th className="border px-2 py-1 text-left">Reviewed By</th>
                  <th className="border px-2 py-1 text-left">Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">
                      <Badge className={statusColor(h.status)}>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="border px-2 py-1">{h.notes || <span className="text-gray-400">No notes</span>}</td>
                    <td className="border px-2 py-1">{h.reviewed_by_name}</td>
                    <td className="border px-2 py-1">
                      {h.reviewed_at ? format(new Date(h.reviewed_at), 'yyyy-MM-dd HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
