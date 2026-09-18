import sharedPortalAPI, { sharedPortalAPI as api } from './shared-portal';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'submitted' | 'under_review' | 'returned_for_edits' | 'accepted' | 'rejected';
  ngo: string;
  ngo_details: {
    id: string;
    name: string;
  };
  project?: string;
  project_details?: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  partner_organizations: string[];
  partner_organizations_details: Array<{
    id: string;
    name: string;
  }>;
  submission_date: string;
  review_deadline: string;
  budget_amount: number;
  currency: string;
  duration_months: number;
  current_version: number;
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    file: string;
    uploaded_at: string;
    file_size?: number;
  }>;
  feedback_history: Array<{
    id: string;
    reviewer_name: string;
    reviewer_role: string;
    reviewer_type?: string;
    reviewer_org_id?: string;
    reviewer_org?: string;
    feedback_text: string;
    action_required: string[];
    created_at: string;
    status_change?: string;
  }>;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  days_until_deadline?: number;
  objectives?: string[];
  start_date?: string;
  end_date?: string;
  milestones?: Array<{
    title: string;
    due_date: string;
    description?: string;
  }>;
}

export interface ProposalFeedback {
  id: string;
  reviewer_name: string;
  reviewer_role: string;
  feedback_text: string;
  action_required: string[];
  status_change?: string;
  created_at: string;
}

export interface CreateProposalData {
  title: string;
  description: string;
  partner_organizations: string[];
  budget_amount: number;
  currency: string;
  duration_months: number;
  status: string;
  project?: string;
}

export interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  submission_date: string;
  review_deadline: string;
  ngo_details: {
    id: string;
    name: string;
  };
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    file: string;
  }>;
  feedback_history: Array<{
    id: string;
    reviewer_name: string;
    feedback_text: string;
    recommendations: string[];
    created_at: string;
  }>;
}

export interface DashboardData {
  active_proposals: number;
  pending_reports: number;
  unread_messages: number;
  upcoming_deadlines: number;
  recent_proposals: Proposal[];
  recent_reports: Report[];
}

export interface Message {
  id: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_role: string;
  recipient_name: string;
  recipient_role: string;
  is_read: boolean;
  created_at: string;
}

export interface PartnerOrganization {
  id: string;
  name: string;
  partner_type: string;
  email_domain: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  role: 'ngo_user' | 'donor_reviewer' | 'oversight_body' | 'admin';
  organization?: {
    id: string;
    name: string;
  };
  ngo?: {
    id: string;
    name: string;
  };
  is_verified: boolean;
}

export interface LoginResponse {
  token: string;
  user_id: number;
  email: string;
  role: string;
  organization_id?: number;
  ngo_id?: number;
}

class SharedPortalService {
  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access', token);
      localStorage.setItem('shared_portal_token', token);
    }
  }

  setRefreshToken(refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh', refreshToken);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access') || localStorage.getItem('shared_portal_token');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh');
    }
    return null;
  }

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('shared_portal_token');
      localStorage.removeItem('shared_portal_user');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await sharedPortalAPI.login(email, password);
      
      const { data } = response;
      
      this.setToken(data.access);
      if (data.refresh) {
        this.setRefreshToken(data.refresh);
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('shared_portal_user', JSON.stringify({
          id: data.user_id,
          email: data.email,
          role: data.role,
          organizationId: data.organization_id,
          ngoId: data.ngo_id,
        }));
      }
      
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.detail || error.response.data.error || 'Login failed');
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout(): Promise<void> {
    try {
      this.clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await api.getCurrentUser();
      
      if (!response.data) {
        throw new Error('No user data');
      }
      
      return {
        id: response.data.id?.toString() || '',
        user_email: response.data.user_email || response.data.email || '',
        user_first_name: response.data.user_first_name || response.data.first_name || '',
        user_last_name: response.data.user_last_name || response.data.last_name || '',
        role: response.data.role || 'ngo_user',
        organization: response.data.organization,
        ngo: response.data.ngo,
        is_verified: response.data.is_verified || false,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('shared_portal_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          return {
            id: user.id?.toString() || '',
            user_email: user.email || '',
            user_first_name: user.first_name || '',
            user_last_name: user.last_name || '',
            role: user.role || 'ngo_user',
            is_verified: true,
          };
        }
      }
      
      throw new Error('Failed to fetch user profile');
    }
  }

  async getProposals(params?: {
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<Proposal[]> {
    try {
      const response = await api.getProposals(params);
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error: any) {
      console.error('Get proposals error:', error);
      if (error.response?.status === 401) {
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch proposals');
    }
  }

  async getProposal(id: string): Promise<Proposal> {
    try {
      const response = await api.getProposal(id);
      const data = response.data;
      
      return {
        ...data,
        partner_organizations_details: data.partner_organizations_details || [],
        documents: data.documents || [],
        feedback_history: data.feedback_history || [],
        ngo_details: data.ngo_details || data.ngo || { id: '', name: '' },
        status: data.status || 'draft',
        current_version: data.current_version || 1,
        budget_amount: data.budget_amount || 0,
        currency: data.currency || 'USD',
        duration_months: data.duration_months || 0,
        submission_date: data.submission_date || '',
        review_deadline: data.review_deadline || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        created_by_name: data.created_by_name || data.created_by?.user?.get_full_name || '',
      };
    } catch (error: any) {
      console.error('Get proposal error:', error);
      if (error.response?.status === 401) {
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
      if (error.response?.status === 404) {
        throw new Error('Proposal not found');
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch proposal');
    }
  }

  async createProposal(data: CreateProposalData): Promise<Proposal> {
    try {
      const response = await api.createProposal(data);
      return response.data;
    } catch (error: any) {
      console.error('Create proposal error:', error);
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.entries(errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          throw new Error(errorMessages);
        }
      }
      throw new Error('Failed to create proposal');
    }
  }

  // async updateProposal(id: string, data: Partial<CreateProposalData>): Promise<Proposal> {
  //   try {
  //     const response = await api.updateProposal(id, data);
  //     return response.data;
  //   } catch (error: any) {
  //     console.error('Update proposal error:', error);
  //     throw new Error(error.response?.data?.error || 'Failed to update proposal');
  //   }
  // }

  async submitProposal(id: string): Promise<void> {
    try {
      await api.submitProposal(id);
    } catch (error: any) {
      console.error('Submit proposal error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit proposal');
    }
  }

  async submitProposalReview(id: string, feedback: {
    feedback_text: string;
    action_required: string[];
    status_change?: string;
  }): Promise<ProposalFeedback> {
    try {
      const response = await api.submitReview(id, feedback);
      return response.data;
    } catch (error: any) {
      console.error('Submit proposal review error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit review');
    }
  }

  async uploadProposalDocument(proposalId: string, file: File, documentType: string = 'proposal'): Promise<any> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      const axios = require('axios');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/shared-portal/proposals/${proposalId}/documents/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Upload proposal document error:', error);
      throw new Error(error.response?.data?.error || 'Failed to upload document');
    }
  }

  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await api.getDashboard();
      const data = response.data;
      
      return {
        active_proposals: data.active_proposals || 0,
        pending_reports: data.pending_reports || 0,
        unread_messages: data.unread_messages || 0,
        upcoming_deadlines: data.upcoming_deadlines || 0,
        recent_proposals: data.recent_proposals || [],
        recent_reports: data.recent_reports || [],
      };
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      if (error.response?.status === 401) {
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to fetch dashboard data');
    }
  }

  async getReports(params?: {
    status?: string;
    period?: string;
    page?: number;
    page_size?: number;
  }): Promise<Report[]> {
    try {
      const response = await api.getReports(params);
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error: any) {
      console.error('Get reports error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch reports');
    }
  }

  async getReport(id: string): Promise<Report> {
    try {
      const response = await api.getReport(id);
      return response.data;
    } catch (error: any) {
      console.error('Get report error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch report');
    }
  }

  async submitReport(id: string): Promise<void> {
    try {
      await api.submitReport(id);
    } catch (error: any) {
      console.error('Submit report error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit report');
    }
  }

  async getPartnerOrganizations(): Promise<PartnerOrganization[]> {
    try {
      const response = await api.getPartnerOrganizations();
      return response.data.map((partner: any) => ({
        ...partner,
        id: partner.id.toString(),
      }));
    } catch (error: any) {
      console.error('Get partner organizations error:', error);
      throw new Error('Failed to fetch partner organizations');
    }
  }

  async getMessages(params?: any): Promise<Message[]> {
    try {
      const response = await api.getMessages(params);
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error: any) {
      console.error('Get messages error:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  async sendMessage(data: {
    recipient: string;
    subject: string;
    content: string;
    related_proposal?: string;
    related_report?: string;
  }): Promise<Message> {
    try {
      const response = await api.sendMessage(data);
      return response.data;
    } catch (error: any) {
      console.error('Send message error:', error);
      throw new Error('Failed to send message');
    }
  }

  async markMessageRead(id: string): Promise<void> {
    try {
      await api.markMessageRead(id);
    } catch (error: any) {
      console.error('Mark message read error:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  async getNotifications(): Promise<any[]> {
    try {
      const response = await api.getNotifications();
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (error: any) {
      console.error('Get notifications error:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      await api.markNotificationRead(id);
    } catch (error: any) {
      console.error('Mark notification read error:', error);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    try {
      await api.markAllNotificationsRead();
    } catch (error: any) {
      console.error('Mark all notifications read error:', error);
    }
  }

  async checkAuth(): Promise<boolean> {
  try {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    const isTokenValid = this.checkTokenExpiry(token);
    
    if (isTokenValid) {
      try {
        await this.getCurrentUser();
        return true;
      } catch (userError) {
        return true;
      }
    } else {
      return await this.refreshAuthToken();
    }
  } catch (error) {
    console.error(' Auth check error:', error);
    return false;
  }
}

checkTokenExpiry = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    const isValid = Date.now() < expiry;
    
    return isValid;
  } catch (error) {
    console.error('Token parsing error:', error);
    return false;
  }
}

  async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await api.refreshToken(refreshToken);
      
      if (response.data.access) {
        this.setToken(response.data.access);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  }

  async getMyOrganization(): Promise<{ id: string; name: string } | null> {
    try {
      const user = await this.getCurrentUser();
      if (user.role === 'ngo_user' && user.ngo) {
        return { id: user.ngo.id, name: user.ngo.name };
      } else if (user.organization) {
        return { id: user.organization.id, name: user.organization.name };
      }
      return null;
    } catch (error) {
      console.error('Get my organization error:', error);
      return null;
    }
  }

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    return this.getProposals({ status });
  }

  async getReportsByStatus(status: string): Promise<Report[]> {
    return this.getReports({ status });
  }
  
  async updateProposal(id: string, data: Partial<CreateProposalData>): Promise<Proposal> {
    try {
      const response = await api.updateProposal(id, data);
      return response.data;
    } catch (error: any) {
      console.error('Update proposal error:', error);
      
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.entries(errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          throw new Error(errorMessages);
        }
        throw new Error(error.response.data.detail || error.response.data.error || 'Failed to update proposal');
      }
      
      throw new Error('Failed to update proposal');
    }
  }

async resubmitProposal(id: string): Promise<Proposal> {
  try {
    const response = await api.resubmitProposal(id);
    return response.data;
  } catch (error: any) {
    console.error('Resubmit proposal error:', error);
    
    if (error.response?.data) {
      const errors = error.response.data;
      if (typeof errors === 'object') {
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        throw new Error(errorMessages);
      }
      throw new Error(error.response.data.detail || error.response.data.error || 'Failed to resubmit proposal');
    }
    
    throw new Error('Failed to resubmit proposal');
  }
}

}

export const sharedPortalService = new SharedPortalService();