import { useState, useEffect, useCallback } from 'react';
import { complaintService } from '../services/complaint.service';
import { Complaint, ComplaintFollowUp, ComplaintAttachment, ComplaintComment } from '../types/complaint.types';

export const useComplaintDetail = (id: number) => {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [followUps, setFollowUps] = useState<ComplaintFollowUp[]>([]);
  const [attachments, setAttachments] = useState<ComplaintAttachment[]>([]);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    try {
      setLoading(true);
      const [complaintData, followUpsData, attachmentsData, commentsData] = await Promise.all([
        complaintService.getComplaint(id),
        complaintService.getFollowUps(id),
        complaintService.getAttachments(id),
        complaintService.getComments(id),
      ]);
      setComplaint(complaintData);
      setFollowUps(followUpsData);
      setAttachments(attachmentsData);
      setComments(commentsData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch complaint details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  const addComment = async (content: string) => {
    try {
      const newComment = await complaintService.createComment(id, content);
      setComments(prev => [newComment, ...prev]);
      return newComment;
    } catch (err) {
      console.error('Failed to add comment', err);
      throw err;
    }
  };

  const addFollowUp = async (data: FormData) => {
    try {
      const newFollowUp = await complaintService.createFollowUp(id, data);
      setFollowUps(prev => [newFollowUp, ...prev]);
      
      const updatedComplaint = await complaintService.getComplaint(id);
      setComplaint(updatedComplaint);
      
      return newFollowUp;
    } catch (err) {
      console.error('Failed to add follow-up', err);
      throw err;
    }
  };

  const addAttachment = async (data: FormData) => {
    try {
      const newAttachment = await complaintService.createAttachment(id, data);
      setAttachments(prev => [newAttachment, ...prev]);
      return newAttachment;
    } catch (err) {
      console.error('Failed to add attachment', err);
      throw err;
    }
  };

  const deleteAttachment = async (attachmentId: number) => {
    try {
      await complaintService.deleteAttachment(id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Failed to delete attachment', err);
      throw err;
    }
  };

  const assignComplaint = async (userId: number) => {
    try {
      const updated = await complaintService.assignComplaint(id, userId);
      setComplaint(updated);
      return updated;
    } catch (err) {
      console.error('Failed to assign complaint', err);
      throw err;
    }
  };

  const closeComplaint = async () => {
    try {
      const updated = await complaintService.closeComplaint(id);
      setComplaint(updated);
      return updated;
    } catch (err) {
      console.error('Failed to close complaint', err);
      throw err;
    }
  };

  const updateComplaint = async (data: Partial<Complaint>) => {
    try {
      const updated = await complaintService.partialUpdateComplaint(id, data);
      setComplaint(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update complaint', err);
      throw err;
    }
  };

  return {
    complaint,
    followUps,
    attachments,
    comments,
    loading,
    error,
    refresh: fetchComplaint,
    addComment,
    addFollowUp,
    addAttachment,
    deleteAttachment,
    assignComplaint,
    closeComplaint,
    updateComplaint,
  };
};