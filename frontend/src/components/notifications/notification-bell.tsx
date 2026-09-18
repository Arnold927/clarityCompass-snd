'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/lib/websocket';
import { markNotificationAsRead, fetchNotifications } from '@/lib/api';
import type { Notification } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface ExtendedNotification extends Notification {
  is_ws?: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { 
    notifications: wsNotifications, 
    unreadCount, 
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead,
    isConnected 
  } = useNotifications();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (wsNotifications.length > 0) {
      const notificationMap = new Map<string, ExtendedNotification>();
      
      wsNotifications.forEach(notification => {
        notificationMap.set(notification.id, {
          ...notification,
          is_ws: true
        });
      });
      
      notifications.forEach(notification => {
        if (!notificationMap.has(notification.id)) {
          notificationMap.set(notification.id, {
            ...notification,
            is_ws: false
          });
        }
      });
      
      const merged = Array.from(notificationMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(merged);
    }
  }, [wsNotifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      const apiNotifications: ExtendedNotification[] = data.map(notification => ({
        ...notification,
        is_ws: false
      }));
      setNotifications(apiNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      wsMarkAsRead(notificationId);
      
      await markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      wsMarkAllAsRead();
      
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => markNotificationAsRead(n.id))
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      decision_assigned: '👤',
      decision_updated: '✏️',
      deadline_approaching: '⏰',
      decision_overdue: '⚠️',
      new_comment: '💬',
      status_changed: '🔄',
    };
    return icons[type] || '📢';
  };

  const getNotificationMessage = (notification: ExtendedNotification) => {
    if (notification.message) return notification.message;
    
    const messages: Record<string, string> = {
      decision_assigned: 'You have been assigned to a decision',
      decision_updated: 'A decision has been updated',
      deadline_approaching: 'A deadline is approaching',
      decision_overdue: 'A decision is overdue',
      new_comment: 'New comment added',
      status_changed: 'Status changed',
    };
    
    return messages[notification.notification_type] || 'New notification';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </>
          )}
          {!isConnected && (
            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-amber-500">
              ●
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            {!isConnected && (
              <p className="text-xs text-amber-500">Connecting...</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-xs mt-1">Notifications will appear here</p>
          </div>
        ) : (
          <>
            {notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 ${!notification.is_read ? 'bg-muted/30' : ''}`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.notification_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getNotificationMessage(notification)}
                    </p>
                    {notification.decision && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {notification.decision.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                      {notification.is_ws && (
                        <span className="text-xs text-blue-500">Live</span>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary cursor-pointer hover:bg-transparent"
              onClick={() => {
                window.location.href = '/notifications';
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}