export interface WebSocketMessage {
  type: string;
  payload?: any;
  requestId?: string;
}

export interface EventData {
  type: string;
  payload: any;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WebSocketEventHandler {
  (data: EventData): void;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  subscriptions: string[];
  lastActivity?: string;
  serverTime?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isAuthenticated = false;
  private subscriptions = new Set<string>();
  private eventHandlers = new Map<string, Set<WebSocketEventHandler>>();
  private messageHandlers = new Map<string, (data: any) => void>();
  private connectionStatusCallbacks = new Set<(status: ConnectionStatus) => void>();
  private authToken: string | null = null;

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('welcome', (data) => {
      console.log('WebSocket connected:', data.payload.message);
      this.startHeartbeat();
    });

    this.messageHandlers.set('authenticated', (data) => {
      this.isAuthenticated = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket authenticated for user:', data.payload.user.email);
      this.notifyConnectionStatus();
    });

    this.messageHandlers.set('auth_error', (data) => {
      console.error('WebSocket authentication failed:', data.payload.message);
      this.isAuthenticated = false;
      this.notifyConnectionStatus();
    });

    this.messageHandlers.set('subscribed', (data) => {
      const { channel } = data.payload;
      this.subscriptions.add(channel);
      console.log('Subscribed to channel:', channel);
      this.notifyConnectionStatus();
    });

    this.messageHandlers.set('unsubscribed', (data) => {
      const { channel } = data.payload;
      this.subscriptions.delete(channel);
      console.log('Unsubscribed from channel:', channel);
      this.notifyConnectionStatus();
    });

    this.messageHandlers.set('event', (data) => {
      const { channel, event } = data.payload;
      this.handleEvent(channel, event);
    });

    this.messageHandlers.set('status', (data) => {
      console.log('WebSocket status:', data.payload);
    });

    this.messageHandlers.set('error', (data) => {
      console.error('WebSocket error:', data.payload.message);
    });

    this.messageHandlers.set('pong', () => {
      // Heartbeat response received
    });
  }

  async connect(token: string): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.authToken = token;
    this.isConnecting = true;

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection opened');
        this.isConnecting = false;
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.stopHeartbeat();
        this.notifyConnectionStatus();
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:3001' 
      : window.location.host;
    return `${protocol}//${host}`;
  }

  private authenticate(): void {
    if (!this.authToken) {
      console.error('No auth token available for WebSocket authentication');
      return;
    }

    this.send({
      type: 'authenticate',
      payload: { token: this.authToken }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.warn('Unhandled WebSocket message type:', message.type);
    }
  }

  private handleEvent(channel: string, event: EventData): void {
    const handlers = this.eventHandlers.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.authToken) {
        this.connect(this.authToken);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private notifyConnectionStatus(): void {
    const status: ConnectionStatus = {
      connected: this.ws?.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated,
      subscriptions: Array.from(this.subscriptions)
    };

    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  // Public API methods
  subscribe(channel: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set());
    }
    this.eventHandlers.get(channel)!.add(handler);

    // Subscribe to channel if connected and authenticated
    if (this.isAuthenticated && !this.subscriptions.has(channel)) {
      this.send({
        type: 'subscribe',
        payload: { channel }
      });
    }
  }

  unsubscribe(channel: string, handler?: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(channel);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(channel);
        }
      } else {
        this.eventHandlers.delete(channel);
      }

      // Unsubscribe from channel if no more handlers
      if (!this.eventHandlers.has(channel) && this.subscriptions.has(channel)) {
        this.send({
          type: 'unsubscribe',
          payload: { channel }
        });
      }
    }
  }

  onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusCallbacks.add(callback);
    
    // Immediately call with current status
    callback({
      connected: this.ws?.readyState === WebSocket.OPEN,
      authenticated: this.isAuthenticated,
      subscriptions: Array.from(this.subscriptions)
    });

    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  getStatus(): Promise<ConnectionStatus> {
    return new Promise((resolve) => {
      const requestId = `status_${Date.now()}`;
      
      const handler = (message: WebSocketMessage) => {
        if (message.type === 'status' && message.requestId === requestId) {
          this.messageHandlers.delete(`status_${requestId}`);
          resolve(message.payload);
        }
      };

      this.messageHandlers.set(`status_${requestId}`, handler);
      
      this.send({
        type: 'get_status',
        requestId
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.messageHandlers.delete(`status_${requestId}`);
        resolve({
          connected: this.ws?.readyState === WebSocket.OPEN,
          authenticated: this.isAuthenticated,
          subscriptions: Array.from(this.subscriptions)
        });
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isAuthenticated = false;
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.reconnectAttempts = 0;
    this.notifyConnectionStatus();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  // Convenience methods for common channels
  subscribeToDSARUpdates(handler: WebSocketEventHandler): void {
    this.subscribe('dsar:updates', handler);
  }

  subscribeToRiskAlerts(handler: WebSocketEventHandler): void {
    this.subscribe('risk:alerts', handler);
  }

  subscribeToGDPRNotifications(handler: WebSocketEventHandler): void {
    this.subscribe('gdpr:notifications', handler);
  }

  subscribeToPolicyChanges(handler: WebSocketEventHandler): void {
    this.subscribe('policy:changes', handler);
  }

  subscribeToSystemNotifications(handler: WebSocketEventHandler): void {
    this.subscribe('system:notifications', handler);
  }

  subscribeToDashboardMetrics(handler: WebSocketEventHandler): void {
    this.subscribe('dashboard:metrics', handler);
  }

  subscribeToComplianceAlerts(handler: WebSocketEventHandler): void {
    this.subscribe('compliance:alerts', handler);
  }

  subscribeToUserActivity(handler: WebSocketEventHandler): void {
    this.subscribe('user:activity', handler);
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Event channel constants (matching backend)
export const EVENT_CHANNELS = {
  DSAR_UPDATES: 'dsar:updates',
  RISK_ALERTS: 'risk:alerts',
  GDPR_NOTIFICATIONS: 'gdpr:notifications',
  POLICY_CHANGES: 'policy:changes',
  SYSTEM_NOTIFICATIONS: 'system:notifications',
  USER_ACTIVITY: 'user:activity',
  DASHBOARD_METRICS: 'dashboard:metrics',
  COMPLIANCE_ALERTS: 'compliance:alerts'
} as const;