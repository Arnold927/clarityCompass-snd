import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
});

const NGO_TOKEN_KEY = 'ngo_access_token';
const NGO_REFRESH_KEY = 'ngo_refresh_token';
const NGO_USER_KEY = 'ngo_user';


api.interceptors.request.use((config) => {
  const token = localStorage.getItem(NGO_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


const getNGOToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NGO_TOKEN_KEY);
};

const setNGOToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NGO_TOKEN_KEY, token);
};

const getNGORefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NGO_REFRESH_KEY);
};

const setNGORefreshToken = (refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NGO_REFRESH_KEY, refreshToken);
};

const setNGOUserData = (userData: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NGO_USER_KEY, JSON.stringify(userData));
};

const getNGOUserData = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(NGO_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const clearNGOAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NGO_TOKEN_KEY);
  localStorage.removeItem(NGO_REFRESH_KEY);
  localStorage.removeItem(NGO_USER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }
  
  if (window.location.pathname.startsWith('/shared-portal')) {
    const sharedToken = localStorage.getItem('shared_portal_access_token');
    if (!sharedToken && !config.url?.includes('/token/')) {
      
      return config;
    }
    if (sharedToken) {
      config.headers.Authorization = `Bearer ${sharedToken}`;
    }
    return config;
  }
  
  const token = getNGOToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // console.error('Response error:', {
    //   url: error.config?.url,
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   data: error.response?.data
    // });
    
    const originalRequest = error.config;

    if (originalRequest?.url?.includes("/token/")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      
      if (typeof window !== "undefined" && window.location.pathname.startsWith('/shared-portal')) {
        localStorage.removeItem('shared_portal_access_token');
        window.location.href = "/shared-portal/login";
        return Promise.reject(error);
      }
      
      const refreshToken = getNGORefreshToken();

      if (refreshToken) {
        try {
          const refreshUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/token/refresh/`;
          
          const res = await axios.post(refreshUrl, { refresh: refreshToken });
          
          setNGOToken(res.data.access);
          
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          clearNGOAuth();
          if (typeof window !== 'undefined') {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        }
      } else {
        clearNGOAuth();
        if (typeof window !== 'undefined') {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const checkTokenValidity = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  const token = getNGOToken();
  if (!token) return false;
  
  try {
    await api.get('/auth/user/');
    return true;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return false;
    }
    return true;
  }
};

export const ngoAuth = {
  login: async (username: string, password: string) => {
    try {
      clearNGOAuth();
      
      const response = await api.post('/token/', { username, password });
      if (response.data.access && response.data.refresh) {
        setNGOToken(response.data.access);
        setNGORefreshToken(response.data.refresh);
        
        try {
          // /auth/me/ returns the full user object including app_role
          const userResponse = await api.get('/auth/me/');
          setNGOUserData(userResponse.data);
        } catch (error) {
          try {
            const userResponse = await api.get('/auth/user/');
            setNGOUserData(userResponse.data);
          } catch (e) {
            console.error('Failed to fetch user data:', e);
          }
        }
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      clearNGOAuth();
      throw error;
    }
  },
  
  logout: () => {
    clearNGOAuth();
    if (typeof window !== 'undefined') {
      window.location.href = "/login";
    }
  },
  
  refreshToken: async (): Promise<boolean> => {
    try {
      const refreshToken = getNGORefreshToken();
      if (!refreshToken) return false;
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/token/refresh/`,
        { refresh: refreshToken }
      );
      
      if (response.data.access) {
        setNGOToken(response.data.access);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Refresh token failed:', error);
      return false;
    }
  },
  
  getToken: getNGOToken,
  getUser: getNGOUserData,
  isAuthenticated: () => !!getNGOToken(),
};

export default api;

export interface ProjectSummary {
  id: string;
  title: string;
  code: string;
  program_name: string;
  status: string;
}

export interface ProjectReportData {
  id: string;
  title: string;
  code: string;
  description: string;
  program_name: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  status: string;
  lifecycle_status: string;
  health_status: string;
  budget: number;
  currency: string;
  
  financial_summary: {
    currency: string;
    total_budget: number;
    total_spent: number;
    balance: number;
    budget_utilization: number;
    donor_contributions: Array<{
      name: string;
      amount: number;
    }>;
  };
  
  indicators_summary: Array<{
    name: string;
    description: string;
    current_value: number;
    target_value: number;
    progress_percentage: number;
    linked_program_indicator: string;
    linked_strategic_objective: string;
    is_donor_indicator: boolean;
    disaggregators: Array<{
      name: string;
      baseline: number;
      target: number;
    }>;
  }>;
  
  activities_summary: Array<{
    name: string;
    description: string;
    progress_percentage: number;
    linked_indicator_name: string | null;
    tasks: Array<{
      title: string;
      assignee: string | null;
      start_date: string;
      end_date: string;
      budget: number;
      spent: number;
      current_status: string;
      is_complete: boolean;
      justification: string | null;
      progress_percentage: number;
      last_update_date: string | null;
    }>;
  }>;
  
  beneficiaries_summary: {
    total_count: number;
    breakdown: any[];
    data_source: string;
  };
  
  locations_list: Array<{
    name: string;
    lat: number | null;
    lon: number | null;
  }>;
  
  donors_list: Array<{
    name: string;
    contact_info: string;
    country: string;
  }>;
  
  timeline_summary: Array<{
    event: string;
    date: string;
    type: string;
    status: string;
    completion?: boolean;
    frequency?: string;
  }>;
}


export interface Decision {
  id: number;
  title: string;
  description: string;
  decision_type: string;

  owner_name?: string;
  assigned_to_name?: string;
  
  owner: number | null;
  assigned_to: number | null;
  project: number | null;
  created_by: number;
  
  owner_details?: UserDetails;
  assigned_to_details?: UserDetails;
  project_title?: string;
  created_by_details?: UserDetails;
  
  created_at: string;
  updated_at: string;
  deadline: string | null;
  completed_at: string | null;
  
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress_percentage: number;
  
  rationale: string;
  expected_outcome: string;
  actual_outcome: string;
  
  days_to_complete: number | null;
  is_recurring: boolean;
  recurrence_pattern: string;
  
  risk_level: 'low' | 'medium' | 'high';
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  
  stakeholders: number[];
  tags: number[];
  
  stakeholders_details?: UserDetails[];
  tags_details?: Tag[];
  
  is_overdue: boolean;
  days_remaining: number | null;
  
  recent_updates?: DecisionUpdate[];
}

export interface UserDetails {
  id: number;
  username: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
}

export interface Project {
  id: number;
  title: string;
  code: string;
  program_name: string;
  status: string;
}

export interface DecisionUpdate {
  id: number;
  decision: number;
  user: UserDetails;
  update_text: string;
  attachment: string | null;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
}

export interface ProjectTeamMember {
  id: number;
  user: UserDetails;
  role: string;
  project: number;
}

export const fetchProjects = async (): Promise<ProjectSummary[]> => {
  try {
    const response = await api.get('/projects/');
    return response.data.results || response.data; 
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
};

export const fetchProjectTeamMembers = async (projectId: number): Promise<ProjectTeamMember[]> => {
  try {
    const response = await api.get(`/projects/${projectId}/team-members/`);
    return response.data.results || response.data;
  } catch (error) {
    console.error(`Error fetching team members for project ${projectId}:`, error);
    return [];
  }
};

export const fetchProjectReportData = async (projectId: string): Promise<ProjectReportData | null> => {
  if (!projectId) return null;
  
  try {
    const response = await api.get(`/projects/${projectId}/report-data/`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching project report data:', error);
    
    if (error.response?.status === 404) {
      console.error('Endpoint not found. Check if the Django view is properly set up.');
    }
    
    return null;
  }
};


export const fetchDecisions = async (params?: {
  project_id?: string;
  status?: string;
  priority?: string;
  overdue?: boolean;
  due_soon?: boolean;
  dashboard?: boolean;
}): Promise<Decision[]> => {
  try {
    const response = await api.get('/shared/decisions/', { params });
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return [];
  }
};

export const fetchDecision = async (id: string): Promise<Decision> => {
  try {
    const response = await api.get(`/shared/decisions/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching decision ${id}:`, error);
    throw error;
  }
};

export const createDecision = async (data: Partial<Decision>): Promise<Decision> => {
  try {
    const response = await api.post('/shared/decisions/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating decision:', error);
    throw error;
  }
};

export const updateDecision = async (id: string, data: Partial<Decision>): Promise<Decision> => {
  try {
    const response = await api.put(`/shared/decisions/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating decision ${id}:`, error);
    throw error;
  }
};

export const patchDecision = async (id: string, data: Partial<Decision>): Promise<Decision> => {
  try {
    const response = await api.patch(`/shared/decisions/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error patching decision ${id}:`, error);
    throw error;
  }
};

export const deleteDecision = async (id: string): Promise<void> => {
  try {
    await api.delete(`/shared/decisions/${id}`);
  } catch (error) {
    console.error(`Error deleting decision ${id}:`, error);
    throw error;
  }
};

export const markDecisionComplete = async (id: string, notes?: string): Promise<Decision> => {
  try {
    const response = await api.post(`/shared/decisions/${id}/mark_complete/`, { completion_notes: notes });
    return response.data;
  } catch (error) {
    console.error(`Error marking decision ${id} complete:`, error);
    throw error;
  }
};

export const addDecisionUpdate = async (decisionId: string, update: {
  update_text: string;
  attachment?: File;
}): Promise<DecisionUpdate> => {
  try {
    const formData = new FormData();
    formData.append('update_text', update.update_text);
    if (update.attachment) {
      formData.append('attachment', update.attachment);
    }
    
    const response = await api.post(`/shared/decisions/${decisionId}/add_update/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.error(`Error adding update to decision ${decisionId}:`, error);
    throw error;
  }
};

export const fetchDecisionUpdates = async (decisionId: string): Promise<DecisionUpdate[]> => {
  try {
    const response = await api.get(`/shared/decision-updates/?decision_id=${decisionId}`);
    return response.data.results || response.data;
  } catch (error) {
    console.error(`Error fetching updates for decision ${decisionId}:`, error);
    return [];
  }
};

export const fetchDashboardStats = async (): Promise<any> => {
  try {
    const response = await api.get('/shared/decisions/dashboard_stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export const fetchMyTasks = async (): Promise<Decision[]> => {
  try {
    const response = await api.get('/shared/decisions/my_tasks/');
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    return [];
  }
};

export const fetchTags = async (): Promise<Tag[]> => {
  try {
    const response = await api.get('/shared/tags/');
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
};

export const fetchUsers = async (): Promise<UserDetails[]> => {
  try {
    const response = await api.get('/users/');
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};


export const updateDecisionProgress = async (
  decisionId: string, 
  progress: number
): Promise<Decision> => {
  try {
    const response = await api.patch(`/shared/decisions/${decisionId}/`, {
      progress_percentage: progress
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating progress for decision ${decisionId}:`, error);
    throw error;
  }
};

export const addDecisionComment = async (
  decisionId: string,
  comment: string,
  attachment?: File
): Promise<DecisionUpdate> => {
  return addDecisionUpdate(decisionId, {
    update_text: comment,
    attachment
  });
};

export const fetchDecisionStats = async (): Promise<any> => {
  try {
    const response = await api.get('/shared/decisions/dashboard_stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching decision stats:', error);
    throw error;
  }
};


export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await api.get('/shared/notifications/');
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await api.post(`/shared/notifications/${notificationId}/mark_read/`);
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
};

export interface Notification {
  id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  decision?: {
    id: number;
    title: string;
  };
}


export interface Comment {
  id: number;
  content: string;
  user_id: number;
  decision_id: number;
  created_at: string;
  updated_at: string;
  user_details?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
}

export interface DecisionHistory {
  id: number;
  decision_id: number;
  user_id: number;
  action: string;
  changes?: Record<string, any>;
  created_at: string;
  user_details?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
}

export async function fetchDecisionComments(decisionId: string): Promise<Comment[]> {
  try {
    const response = await api.get(`/shared/decisions/${decisionId}/comments/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for decision ${decisionId}:`, error);
    throw new Error('Failed to fetch comments');
  }
}

export async function addCommentToDecision(decisionId: string, content: string): Promise<Comment> {
  try {
    const response = await api.post(`/shared/decisions/${decisionId}/comments/`, { content });
    return response.data;
  } catch (error) {
    console.error(`Error adding comment to decision ${decisionId}:`, error);
    throw new Error('Failed to add comment');
  }
}

export async function fetchDecisionHistory(decisionId: string): Promise<DecisionHistory[]> {
  try {
    const response = await api.get(`/shared/decisions/${decisionId}/history/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching history for decision ${decisionId}:`, error);
    throw new Error('Failed to fetch history');
  }
}

export async function assignDecisionToUser(decisionId: string, userId: string): Promise<Decision> {
  try {
    const response = await api.put(`/shared/decisions/${decisionId}/assign/`, { assigned_to: userId });
    return response.data;
  } catch (error) {
    console.error(`Error assigning decision ${decisionId} to user ${userId}:`, error);
    throw new Error('Failed to assign user');
  }
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  resolution_notes?: string;
  attachments?: string[];
}

export interface ComplaintFilters {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  page?: number;
  page_size?: number;
}

export interface ComplaintResponse {
  results: Complaint[];
  count: number;
  next?: string;
  previous?: string;
}

export const fetchComplaints = async (filters?: ComplaintFilters): Promise<ComplaintResponse> => {
  try {
    const response = await api.get('/complaints/', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching complaints:', error);
    throw error;
  }
};

export const fetchComplaint = async (id: string): Promise<Complaint> => {
  try {
    const response = await api.get(`/complaints/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching complaint ${id}:`, error);
    throw error;
  }
};

export const createComplaint = async (data: Partial<Complaint>): Promise<Complaint> => {
  try {
    const response = await api.post('/complaints/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating complaint:', error);
    throw error;
  }
};

export const updateComplaint = async (id: string, data: Partial<Complaint>): Promise<Complaint> => {
  try {
    const response = await api.put(`/complaints/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating complaint ${id}:`, error);
    throw error;
  }
};

export const patchComplaint = async (id: string, data: Partial<Complaint>): Promise<Complaint> => {
  try {
    const response = await api.patch(`/complaints/${id}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error patching complaint ${id}:`, error);
    throw error;
  }
};

export const deleteComplaint = async (id: string): Promise<void> => {
  try {
    await api.delete(`/complaints/${id}/`);
  } catch (error) {
    console.error(`Error deleting complaint ${id}:`, error);
    throw error;
  }
};

export const resolveComplaint = async (id: string, resolution_notes: string): Promise<Complaint> => {
  try {
    const response = await api.post(`/complaints/${id}/resolve/`, { resolution_notes });
    return response.data;
  } catch (error) {
    console.error(`Error resolving complaint ${id}:`, error);
    throw error;
  }
};

export const assignComplaint = async (id: string, assigned_to: string): Promise<Complaint> => {
  try {
    const response = await api.post(`/complaints/${id}/assign/`, { assigned_to });
    return response.data;
  } catch (error) {
    console.error(`Error assigning complaint ${id}:`, error);
    throw error;
  }
};


export { api };