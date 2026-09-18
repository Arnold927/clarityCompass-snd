import api from '@/lib/api';
import { Complaint, ComplaintFilters, ComplaintStats, ComplaintFollowUp, ComplaintAttachment, ComplaintComment } from '../types/complaint.types';

export const complaintService = {
  getComplaints: async (filters?: ComplaintFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await api.get<Complaint[]>(`/complaints/complaints/?${params.toString()}`);
    return response.data;
  },

  getComplaint: async (id: number) => {
    const response = await api.get<Complaint>(`/complaints/complaints/${id}/`);
    return response.data;
  },

  createComplaint: async (data: Partial<Complaint>) => {
    const response = await api.post<Complaint>('/complaints/complaints/', data);
    return response.data;
  },

  updateComplaint: async (id: number, data: Partial<Complaint>) => {
    const response = await api.put<Complaint>(`/complaints/${id}/`, data);
    return response.data;
  },

  partialUpdateComplaint: async (id: number, data: Partial<Complaint>) => {
    const response = await api.patch<Complaint>(`/complaints/complaints/${id}/`, data);
    return response.data;
  },

  deleteComplaint: async (id: number) => {
    await api.delete(`//complaints/complaints/${id}/`);
  },

  getMyTasks: async () => {
    const response = await api.get<Complaint[]>('/complaints/my_tasks/');
    return response.data;
  },

  getOverdue: async () => {
    const response = await api.get<Complaint[]>('/complaints/overdue/');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<ComplaintStats>('/complaints/stats/');
    return response.data;
  },

  assignComplaint: async (id: number, userId: number) => {
    const response = await api.post<Complaint>(`/complaints/${id}/assign/`, { user_id: userId });
    return response.data;
  },

  closeComplaint: async (id: number) => {
    const response = await api.post<Complaint>(`/complaints/complaints/${id}/close/`);
    return response.data;
  },

  exportCSV: async (filters?: ComplaintFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await api.get(`/complaints/export_csv/?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getFollowUps: async (complaintId: number) => {
    const response = await api.get<ComplaintFollowUp[]>(`/complaints/complaints/${complaintId}/followups/`);
    return response.data;
  },

  createFollowUp: async (complaintId: number, data: FormData) => {
    const response = await api.post<ComplaintFollowUp>(`/complaints/complaints/${complaintId}/followups/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAttachments: async (complaintId: number) => {
    const response = await api.get<ComplaintAttachment[]>(`/complaints/complaints/${complaintId}/attachments/`);
    return response.data;
  },

  createAttachment: async (complaintId: number, data: FormData) => {
    const response = await api.post<ComplaintAttachment>(`/complaints/complaints/${complaintId}/attachments/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteAttachment: async (complaintId: number, attachmentId: number) => {
    await api.delete(`//complaints/complaints/${complaintId}/attachments/${attachmentId}/`);
  },

  getComments: async (complaintId: number) => {
    const response = await api.get<ComplaintComment[]>(`/complaints/complaints/${complaintId}/comments/`);
    return response.data;
  },

  createComment: async (complaintId: number, content: string) => {
    const response = await api.post<ComplaintComment>(`/complaints/complaints/${complaintId}/comments/`, { content });
    return response.data;
  },

  updateComment: async (complaintId: number, commentId: number, content: string) => {
    const response = await api.put<ComplaintComment>(`/complaints/complaints/${complaintId}/comments/${commentId}/`, { content });
    return response.data;
  },

  deleteComment: async (complaintId: number, commentId: number) => {
    await api.delete(`/complaints/complaints/${complaintId}/comments/${commentId}/`);
  },
};

