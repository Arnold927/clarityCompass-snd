'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  time_since: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { token } = useSharedPortalAuth();

  const fetchNotifications = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/shared-portal/notifications/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/shared-portal/api/notifications/${id}/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_read: true }),
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/shared-portal/api/notifications/mark_all_read/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, is_read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}