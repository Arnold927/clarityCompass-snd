import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const SHARED_PORTAL_TOKEN_KEY = 'shared_portal_access_token';
const SHARED_PORTAL_REFRESH_KEY = 'shared_portal_refresh_token';
const SHARED_PORTAL_USER_KEY = 'shared_portal_user';

const sharedPortalAxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let tokenInitialized = false;

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SHARED_PORTAL_TOKEN_KEY);
};

const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_PORTAL_TOKEN_KEY, token);
  tokenInitialized = true;
  
  sharedPortalAxiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SHARED_PORTAL_REFRESH_KEY);
};

const setRefreshToken = (refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_PORTAL_REFRESH_KEY, refreshToken);
};

const setUserData = (userData: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_PORTAL_USER_KEY, JSON.stringify(userData));
};

const getUserData = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(SHARED_PORTAL_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const clearSharedPortalAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SHARED_PORTAL_TOKEN_KEY);
  localStorage.removeItem(SHARED_PORTAL_REFRESH_KEY);
  localStorage.removeItem(SHARED_PORTAL_USER_KEY);
  tokenInitialized = false;
  delete sharedPortalAxiosInstance.defaults.headers.common['Authorization'];
};

if (typeof window !== 'undefined') {
  const token = getToken();
  if (token) {
    sharedPortalAxiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    tokenInitialized = true;
  }
}

sharedPortalAxiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (tokenInitialized) {
    clearSharedPortalAuth();
  }
  
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

sharedPortalAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.url?.includes('/token/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return sharedPortalAxiosInstance(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        clearSharedPortalAuth();
        
        if (typeof window !== 'undefined') {
          window.location.href = "/shared-portal/login";
        }
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const newAccessToken = refreshResponse.data.access;
        setToken(newAccessToken);
        processQueue(null, newAccessToken);
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return sharedPortalAxiosInstance(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSharedPortalAuth();
        
        if (typeof window !== 'undefined') {
          window.location.href = "/shared-portal/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const sharedPortalAPI = {
  login: async (username: string, password: string) => {
    const response = await sharedPortalAxiosInstance.post('/token/', { username, password });
    if (response.data.access && response.data.refresh) {
      setToken(response.data.access);
      setRefreshToken(response.data.refresh);
      try {
        const userResponse = await sharedPortalAxiosInstance.get('/auth/user/');
        setUserData(userResponse.data);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    }
    return response;
  },
  
  refreshToken: (refresh: string) =>
    sharedPortalAxiosInstance.post('/token/refresh/', { refresh }),
  
  verifyToken: (token: string) =>
    sharedPortalAxiosInstance.post('/token/verify/', { token }),
  
  getCurrentUser: async () => {
    const user = getUserData();
    if (user) return { data: user };
    return sharedPortalAxiosInstance.get('/auth/user/');
  },
  
  logout: () => {
    clearSharedPortalAuth();
    if (typeof window !== 'undefined') {
      window.location.href = "/shared-portal/login";
    }
  },
  
  isAuthenticated: () => {
    return !!getToken();
  },
  
  getProposals: (params?: any) =>
    sharedPortalAxiosInstance.get('/shared-portal/proposals/', { params }),
  
  getProposal: (id: string) =>
    sharedPortalAxiosInstance.get(`/shared-portal/proposals/${id}/`),
  
  createProposal: (data: any) =>
    sharedPortalAxiosInstance.post('/shared-portal/proposals/', data),
  
  updateProposal: (id: string, data: any) =>
    sharedPortalAxiosInstance.patch(`/shared-portal/proposals/${id}/`, data),
  
  submitProposal: (id: string) =>
    sharedPortalAxiosInstance.post(`/shared-portal/proposals/${id}/submit/`),
  
  submitReview: (id: string, feedback: any) =>
    sharedPortalAxiosInstance.post(`/shared-portal/proposals/${id}/review/`, feedback),
  
  getReports: (params?: any) =>
    sharedPortalAxiosInstance.get('/shared-portal/reports/', { params }),
  
  getReport: (id: string) =>
    sharedPortalAxiosInstance.get(`/shared-portal/reports/${id}/`),
  
  submitReport: (id: string) =>
    sharedPortalAxiosInstance.post(`/shared-portal/reports/${id}/submit/`),
  
  getDashboard: () =>
    sharedPortalAxiosInstance.get('/shared-portal/dashboard/'),
  
  getNotifications: () =>
    sharedPortalAxiosInstance.get('/shared-portal/notifications/'),
  
  markNotificationRead: (id: string) =>
    sharedPortalAxiosInstance.patch(`/shared-portal/notifications/${id}/`, { is_read: true }),
  
  markAllNotificationsRead: () =>
    sharedPortalAxiosInstance.post('/shared-portal/notifications/mark_all_read/'),
  
  getMessages: (params?: any) =>
    sharedPortalAxiosInstance.get('/shared-portal/messages/', { params }),
  
  sendMessage: (data: any) =>
    sharedPortalAxiosInstance.post('/shared-portal/messages/', data),
  
  markMessageRead: (id: string) =>
    sharedPortalAxiosInstance.post(`/shared-portal/messages/${id}/mark_read/`),
  
  getPartnerOrganizations: () =>
    sharedPortalAxiosInstance.get('/shared-portal/partners/'),

  getProjects: () => 
    sharedPortalAxiosInstance.get('/projects/'),

  resubmitProposal: (id: string) =>
    sharedPortalAxiosInstance.post(`/shared-portal/proposals/${id}/resubmit/`),
};

export default sharedPortalAPI;