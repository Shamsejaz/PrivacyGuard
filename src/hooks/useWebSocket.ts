import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService, WebSocketEventHandler, EventData, ConnectionStatus } from '../services/websocketService';
import { useAuth } from '../contexts/AuthContext';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  channels?: string[];
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionStatus: ConnectionStatus;
  subscribe: (channel: string, handler: WebSocketEventHandler) => void;
  unsubscribe: (channel: string, handler?: WebSocketEventHandler) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  getStatus: () => Promise<ConnectionStatus>;
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
  const { autoConnect = true, channels = [] } = options;
  const { token, isAuthenticated: authIsAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    authenticated: false,
    subscriptions: []
  });
  const handlersRef = useRef<Map<string, WebSocketEventHandler>>(new Map());
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    if (!token || !authIsAuthenticated) {
      console.warn('Cannot connect WebSocket: not authenticated');
      return;
    }

    try {
      await websocketService.connect(token);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [token, authIsAuthenticated]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const subscribe = useCallback((channel: string, handler: WebSocketEventHandler) => {
    websocketService.subscribe(channel, handler);
    handlersRef.current.set(`${channel}_${handler.toString()}`, handler);
  }, []);

  const unsubscribe = useCallback((channel: string, handler?: WebSocketEventHandler) => {
    websocketService.unsubscribe(channel, handler);
    if (handler) {
      handlersRef.current.delete(`${channel}_${handler.toString()}`);
    } else {
      // Remove all handlers for this channel
      const keysToDelete = Array.from(handlersRef.current.keys())
        .filter(key => key.startsWith(`${channel}_`));
      keysToDelete.forEach(key => handlersRef.current.delete(key));
    }
  }, []);

  const getStatus = useCallback(() => {
    return websocketService.getStatus();
  }, []);

  // Setup connection status monitoring
  useEffect(() => {
    statusUnsubscribeRef.current = websocketService.onConnectionStatus(setConnectionStatus);
    
    return () => {
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
    };
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && authIsAuthenticated && token && !connectionStatus.connected) {
      connect();
    }
  }, [autoConnect, authIsAuthenticated, token, connectionStatus.connected, connect]);

  // Auto-subscribe to specified channels
  useEffect(() => {
    if (connectionStatus.authenticated && channels.length > 0) {
      channels.forEach(channel => {
        if (!connectionStatus.subscriptions.includes(channel)) {
          // Create a default handler that logs events
          const handler: WebSocketEventHandler = (data: EventData) => {
            console.log(`WebSocket event on ${channel}:`, data);
          };
          subscribe(channel, handler);
        }
      });
    }
  }, [connectionStatus.authenticated, connectionStatus.subscriptions, channels, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe all handlers
      handlersRef.current.forEach((handler, key) => {
        const channel = key.split('_')[0];
        websocketService.unsubscribe(channel, handler);
      });
      handlersRef.current.clear();
    };
  }, []);

  // Disconnect when auth is lost
  useEffect(() => {
    if (!authIsAuthenticated && connectionStatus.connected) {
      disconnect();
    }
  }, [authIsAuthenticated, connectionStatus.connected, disconnect]);

  return {
    isConnected: connectionStatus.connected,
    isAuthenticated: connectionStatus.authenticated,
    connectionStatus,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    getStatus
  };
}

// Specialized hooks for common use cases
export function useDSARUpdates(handler: WebSocketEventHandler) {
  const { subscribe, unsubscribe, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated) {
      subscribe('dsar:updates', handler);
      return () => unsubscribe('dsar:updates', handler);
    }
  }, [isAuthenticated, handler, subscribe, unsubscribe]);
}

export function useRiskAlerts(handler: WebSocketEventHandler) {
  const { subscribe, unsubscribe, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated) {
      subscribe('risk:alerts', handler);
      return () => unsubscribe('risk:alerts', handler);
    }
  }, [isAuthenticated, handler, subscribe, unsubscribe]);
}

export function useSystemNotifications(handler: WebSocketEventHandler) {
  const { subscribe, unsubscribe, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated) {
      subscribe('system:notifications', handler);
      return () => unsubscribe('system:notifications', handler);
    }
  }, [isAuthenticated, handler, subscribe, unsubscribe]);
}

export function useDashboardMetrics(handler: WebSocketEventHandler) {
  const { subscribe, unsubscribe, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated) {
      subscribe('dashboard:metrics', handler);
      return () => unsubscribe('dashboard:metrics', handler);
    }
  }, [isAuthenticated, handler, subscribe, unsubscribe]);
}

export function useComplianceAlerts(handler: WebSocketEventHandler) {
  const { subscribe, unsubscribe, isAuthenticated } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated) {
      subscribe('compliance:alerts', handler);
      return () => unsubscribe('compliance:alerts', handler);
    }
  }, [isAuthenticated, handler, subscribe, unsubscribe]);
}