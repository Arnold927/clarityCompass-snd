'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

interface WebSocketContextType {
  sendMessage: (message: any) => boolean;
  lastMessage: WebSocketMessage | null;
  isConnected: boolean;
  connectionUrl: string | null;
  reconnectCount: number;
  error: Error | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// export function WebSocketProvider({ children }: { children: React.ReactNode }) {
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
//   const [reconnectCount, setReconnectCount] = useState(0);
//   const [connectionUrl, setConnectionUrl] = useState<string | null>(null);
//   const [error, setError] = useState<Error | null>(null);
  
//   const wsRef = useRef<WebSocket | null>(null);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
//   const reconnectAttemptRef = useRef(0);
//   const maxReconnectAttempts = 5;
//   const baseReconnectDelay = 3000;

//   const cleanup = useCallback(() => {
//     if (wsRef.current) {
//       wsRef.current.onopen = null;
//       wsRef.current.onclose = null;
//       wsRef.current.onmessage = null;
//       wsRef.current.onerror = null;
//       if (wsRef.current.readyState === WebSocket.OPEN) {
//         wsRef.current.close(1000, 'Client closing');
//       }
//       wsRef.current = null;
//     }
//   }, []);

//   const calculateReconnectDelay = (attempt: number) => {
//     const jitter = Math.random() * 1000;
//     return Math.min(baseReconnectDelay * Math.pow(2, attempt) + jitter, 30000);
//   };

//   const connect = useCallback(() => {
//     cleanup();
//     setError(null);

//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     const host = window.location.host;
    
//     const endpoints = [
//       `${protocol}//${host}/ws/`,
//       `${protocol}//${host}/api/ws/`,
//       `${protocol}//${host}/websocket/`,
//       `${protocol}//${host}/ws/decisions/`,
//       `${protocol}//${host}/ws/notifications/`
//     ];
    
//     const wsUrl = endpoints[0];
//     setConnectionUrl(wsUrl);
    
//     try {
//       console.log('Attempting WebSocket connection to:', wsUrl);
//       const ws = new WebSocket(wsUrl);
//       wsRef.current = ws;
      
//       ws.onopen = () => {
//         setIsConnected(true);
//         reconnectAttemptRef.current = 0;
//         setReconnectCount(prev => prev + 1);
//         setError(null);
//         console.log(' WebSocket connected to:', wsUrl);
        
//         const connectEvent = new CustomEvent('ws:connected', { 
//           detail: { url: wsUrl, timestamp: new Date().toISOString() }
//         });
//         window.dispatchEvent(connectEvent);
//       };
      
//       ws.onmessage = (event) => {
//         try {
//           const message = JSON.parse(event.data);
//           setLastMessage(message);
          
//           const customEvent = new CustomEvent(`ws:${message.type}`, { detail: message });
//           window.dispatchEvent(customEvent);
          
//           const genericEvent = new CustomEvent('ws:message', { detail: message });
//           window.dispatchEvent(genericEvent);
          
//           setError(null);
//         } catch (error) {
//           console.error(' Error parsing WebSocket message:', error, 'Raw data:', event.data);
          
//           const parseErrorEvent = new CustomEvent('ws:parse_error', {
//             detail: { error, rawData: event.data }
//           });
//           window.dispatchEvent(parseErrorEvent);
//         }
//       };
      
//       ws.onclose = (event) => {
//         setIsConnected(false);
        
//         if (!event.wasClean) {
//           console.warn(' WebSocket disconnected:', {
//             code: event.code,
//             reason: event.reason || 'Unknown reason',
//             wasClean: event.wasClean,
//             url: wsUrl
//           });
//         }
        
//         if (event.code !== 1000 && reconnectAttemptRef.current < maxReconnectAttempts) {
//           const delay = calculateReconnectDelay(reconnectAttemptRef.current);
//           console.log(` Reconnecting in ${delay}ms... (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);
          
//           reconnectTimeoutRef.current = setTimeout(() => {
//             reconnectAttemptRef.current += 1;
//             connect();
//           }, delay);
//         } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
//           console.error(' Max reconnection attempts reached');
//           setError(new Error(`Failed to reconnect after ${maxReconnectAttempts} attempts`));
//         }
        
//         const disconnectEvent = new CustomEvent('ws:disconnected', {
//           detail: {
//             code: event.code,
//             reason: event.reason,
//             wasClean: event.wasClean,
//             url: wsUrl,
//             timestamp: new Date().toISOString()
//           }
//         });
//         window.dispatchEvent(disconnectEvent);
//       };
      
//       ws.onerror = (event) => {
//         const errorDetails = {
//           url: ws.url,
//           readyState: ws.readyState,
//           readyStateText: getWebSocketStateText(ws.readyState),
//           timestamp: new Date().toISOString(),
//           reconnectAttempt: reconnectAttemptRef.current
//         };
        
//         const errorMessage = `WebSocket connection error (state: ${errorDetails.readyStateText})`;
//         const wsError = new Error(errorMessage);
        
//         setError(wsError);
        
//         if (process.env.NODE_ENV === 'development') {
//           console.warn('WebSocket error details:', errorDetails);
//         }
        
//         const errorEvent = new CustomEvent('ws:error', {
//           detail: {
//             ...errorDetails,
//             message: errorMessage
//           }
//         });
//         window.dispatchEvent(errorEvent);
//       };
      
//     } catch (error) {
//       console.error('Failed to create WebSocket:', error);
//       setIsConnected(false);
//       setError(error instanceof Error ? error : new Error('Failed to create WebSocket'));
//     }
//   }, [cleanup]);

//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       connect();
//     }
    
//     return () => {
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//       cleanup();
//     };
//   }, [connect, cleanup]);

//   const sendMessage = useCallback((message: any): boolean => {
//     if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//       try {
//         wsRef.current.send(JSON.stringify(message));
//         return true;
//       } catch (error) {
//         console.error('Failed to send WebSocket message:', error);
//         setError(error instanceof Error ? error : new Error('Failed to send message'));
//         return false;
//       }
//     } else {
//       console.warn('WebSocket is not connected. Message not sent:', message);
//       setError(new Error('WebSocket is not connected'));
//       return false;
//     }
//   }, []);

//   const value = React.useMemo(() => ({
//     sendMessage,
//     lastMessage,
//     isConnected,
//     connectionUrl,
//     reconnectCount,
//     error
//   }), [sendMessage, lastMessage, isConnected, connectionUrl, reconnectCount, error]);

//   return (
//     <WebSocketContext.Provider value={value}>
//       {children}
//     </WebSocketContext.Provider>
//   );
// }

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const value = React.useMemo(() => ({
    sendMessage: () => {
      console.warn('WebSocket is disabled');
      return false;
    },
    lastMessage: null,
    isConnected: false,
    connectionUrl: null,
    reconnectCount: 0,
    error: null,
  }), []);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}


function getWebSocketStateText(readyState: number): string {
  switch (readyState) {
    case WebSocket.CONNECTING: return 'CONNECTING';
    case WebSocket.OPEN: return 'OPEN';
    case WebSocket.CLOSING: return 'CLOSING';
    case WebSocket.CLOSED: return 'CLOSED';
    default: return 'UNKNOWN';
  }
}

// export function useWebSocket() {
//   const context = useContext(WebSocketContext);
//   if (!context) {
//     throw new Error('useWebSocket must be used within WebSocketProvider');
//   }
//   return context;
// }

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    console.warn('useWebSocket used without provider, returning mock implementation');
    return {
      sendMessage: () => false,
      lastMessage: null,
      isConnected: false,
      connectionUrl: null,
      reconnectCount: 0,
      error: null,
    };
  }
  return context;
}

// export function useSubscribeDecision(decisionId?: string) {
//   const { sendMessage, isConnected, error } = useWebSocket();
//   const [updates, setUpdates] = useState<any[]>([]);
//   const hasSubscribedRef = useRef(false);

//   useEffect(() => {
//     if (decisionId && isConnected && !hasSubscribedRef.current) {
//       const success = sendMessage({
//         action: 'subscribe',
//         channel: 'decisions',
//         decision_id: decisionId
//       });
//       if (success) {
//         hasSubscribedRef.current = true;
//       }
//     }

//     const handleUpdate = (event: CustomEvent) => {
//       if (event.detail.decision?.id === decisionId) {
//         setUpdates(prev => [event.detail, ...prev.slice(0, 9)]);
//       }
//     };

//     window.addEventListener('ws:decision_update', handleUpdate as EventListener);
    
//     return () => {
//       window.removeEventListener('ws:decision_update', handleUpdate as EventListener);
//       hasSubscribedRef.current = false;
      
//       if (decisionId && isConnected) {
//         sendMessage({
//           action: 'unsubscribe',
//           channel: 'decisions',
//           decision_id: decisionId
//         });
//       }
//     };
//   }, [decisionId, isConnected, sendMessage]);

//   return { updates, error };
// }

export function useSubscribeDecision(decisionId?: string) {
  return { 
    updates: [], 
    error: null 
  };
}

// export function useNotifications() {
//   const { sendMessage, isConnected, lastMessage, error } = useWebSocket();
//   const [notifications, setNotifications] = useState<any[]>([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const hasSubscribedRef = useRef(false);

//   useEffect(() => {
//     if (isConnected && !hasSubscribedRef.current) {
//       const success = sendMessage({
//         action: 'subscribe',
//         channel: 'notifications'
//       });
//       if (success) {
//         hasSubscribedRef.current = true;
//       }
//     }

//     return () => {
//       if (hasSubscribedRef.current && isConnected) {
//         sendMessage({
//           action: 'unsubscribe',
//           channel: 'notifications'
//         });
//         hasSubscribedRef.current = false;
//       }
//     };
//   }, [isConnected, sendMessage]);

//   useEffect(() => {
//     if (lastMessage && lastMessage.type === 'notification') {
//       const notification = lastMessage.data || lastMessage;
//       setNotifications(prev => [notification, ...prev.slice(0, 50)]);
//       if (!notification.is_read) {
//         setUnreadCount(prev => prev + 1);
//       }
//     }
//   }, [lastMessage]);

//   const markAsRead = useCallback((notificationId: string) => {
//     setNotifications(prev =>
//       prev.map(n =>
//         n.id === notificationId ? { ...n, is_read: true } : n
//       )
//     );
//     setUnreadCount(prev => Math.max(0, prev - 1));
    
//     if (isConnected) {
//       sendMessage({
//         action: 'mark_read',
//         notification_id: notificationId
//       });
//     }
//   }, [sendMessage, isConnected]);

//   const markAllAsRead = useCallback(() => {
//     setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
//     setUnreadCount(0);
    
//     if (isConnected) {
//       sendMessage({
//         action: 'mark_all_read'
//       });
//     }
//   }, [sendMessage, isConnected]);

//   return {
//     notifications,
//     unreadCount,
//     markAsRead,
//     markAllAsRead,
//     isConnected,
//     error
//   };
// }

export function useNotifications() {
  return {
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
    isConnected: false,
    error: null,
  };
}

export function useWebSocketStatus() {
  const { isConnected, reconnectCount, connectionUrl, error } = useWebSocket();
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    const handleMessage = () => {
      setLastActivity(new Date());
    };

    window.addEventListener('ws:message', handleMessage);
    
    return () => {
      window.removeEventListener('ws:message', handleMessage);
    };
  }, []);

  return { isConnected, reconnectCount, connectionUrl, lastActivity, error };
}

export function isWebSocketSupported(): boolean {
  return typeof WebSocket !== 'undefined';
}

export function getConnectionStatus(isConnected: boolean, error: Error | null): string {
  if (error) return 'error';
  if (isConnected) return 'connected';
  return 'disconnected';
}