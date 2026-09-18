'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sharedPortalAPI } from '@/lib/shared-portal';
import  api from '@/lib/api';

interface SharedPortalUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'ngo_user' | 'donor_reviewer' | 'oversight_body' | 'admin';
  organization?: string;
  organizationName?: string;
  organization_name?: string;
  ngo?: string;
  ngoName?: string;
  ngo_name?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;

}

interface AuthContextType {
  user: SharedPortalUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<string | null>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SharedPortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SharedPortalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/shared-portal')) {
    setIsLoading(false);
    return;
  }
    try {
      const storedToken = localStorage.getItem('shared_portal_token');
    const refreshToken = localStorage.getItem('shared_portal_refresh_token');
      const storedUser = localStorage.getItem('shared_portal_user');

      if (storedToken && refreshToken) {
        const isTokenValid = checkTokenExpiry(storedToken);
        
        if (isTokenValid) {
          setToken(storedToken);
          try {
            await attemptTokenRefresh();
          } catch (refreshError) {
            logout();
          }
        }
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('shared_portal_token');
        localStorage.removeItem('shared_portal_user');
      }
    } catch (error) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const checkTokenExpiry = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const isValid = Date.now() < expiry;
      return isValid;
    } catch {
      return false;
    }
  };

  const attemptTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await sharedPortalAPI.refreshToken(refreshToken);
      const newAccessToken = response.data.access;
      
      localStorage.setItem('access', newAccessToken);
      localStorage.setItem('shared_portal_token', newAccessToken);
      
      setToken(newAccessToken);
      await fetchUserInfo(newAccessToken);
      
      return newAccessToken;
    } catch (refreshError) {
      logout();
      throw refreshError;
    }
  };

  const fetchUserInfo = async (accessToken: string) => {
  try {
    
    let portalUserData;
    try {
      const portalResponse = await api.get('/shared-portal/auth/me/');
      portalUserData = portalResponse.data;
    } catch (portalError) {
      const userResponse = await sharedPortalAPI.getCurrentUser();
      portalUserData = userResponse.data;
    }
    
    const userInfo: SharedPortalUser = {
      id: portalUserData.id.toString(),
      email: portalUserData.user_email || portalUserData.email || portalUserData.user?.email || '',
      username: portalUserData.user?.username || portalUserData.username || '',
      firstName: portalUserData.user_first_name || portalUserData.user?.first_name || portalUserData.first_name || '',
      lastName: portalUserData.user_last_name || portalUserData.user?.last_name || portalUserData.last_name || '',
      role: portalUserData.role || 'ngo_user',
      
      organization: portalUserData.organization || portalUserData.organization_id,
      organizationName: portalUserData.organization_name || portalUserData.organizationName,
      organization_name: portalUserData.organization_name,
      
      ngo: portalUserData.ngo || portalUserData.ngo_id,
      ngoName: portalUserData.ngo_name || portalUserData.ngoName,
      ngo_name: portalUserData.ngo_name,
      
      user_email: portalUserData.user_email,
      user_first_name: portalUserData.user_first_name,
      user_last_name: portalUserData.user_last_name,
    };
    
    
    localStorage.setItem('shared_portal_user', JSON.stringify(userInfo));
    setUser(userInfo);
  } catch (userError) {
    const minimalUser: SharedPortalUser = {
      id: 'unknown',
      email: 'unknown@example.com',
      username: 'Unknown',
      firstName: 'Unknown',
      lastName: 'User',
      role: 'ngo_user',
    };
    setUser(minimalUser);
  }
};

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await sharedPortalAPI.login(username, password);
      const { access, refresh } = response.data;

      
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('shared_portal_token', access);
      
      setToken(access);
      
      await fetchUserInfo(access);
      
      router.push('/shared-portal');
      router.refresh();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      
      const response = await sharedPortalAPI.refreshToken(refreshToken);
      const newAccessToken = response.data.access;
      
      localStorage.setItem('access', newAccessToken);
      localStorage.setItem('shared_portal_token', newAccessToken);
      setToken(newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      logout();
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('shared_portal_token');
    localStorage.removeItem('shared_portal_user');
    
    setToken(null);
    setUser(null);
    
    router.push('/shared-portal/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      refreshToken,
      isLoading,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSharedPortalAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSharedPortalAuth must be used within a SharedPortalAuthProvider');
  }
  return context;
}