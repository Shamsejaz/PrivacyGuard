import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { eventService, EVENT_CHANNELS } from '../services/EventService.js';
import type { EventData } from '../services/EventService.js';

interface AuthenticatedWebSocket extends WebSocket {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  subscriptions?: Set<string>;
  isAlive?: boolean;
  lastActivity?: Date;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  requestId?: string;
}

// Store all connected clients
const connectedClients = new Set<AuthenticatedWebSocket>();

export function setupWebSocket(wss: WebSocketServer): void {
  logger.info('🔌 Setting up WebSocket server...');

  // Setup heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        logger.info('Terminating inactive WebSocket connection');
        connectedClients.delete(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
    logger.info('New WebSocket connection attempt');

    // Initialize connection properties
    ws.subscriptions = new Set();
    ws.isAlive = true;
    ws.lastActivity = new Date();
    
    // Add to connected clients
    connectedClients.add(ws);

    // Handle heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = new Date();
    });

    // Handle authentication and messages
    ws.on('message', async (data: Buffer) => {
      try {
        ws.lastActivity = new Date();
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            await handleAuthentication(ws, message);
            break;
          
          case 'subscribe':
            await handleSubscription(ws, message);
            break;
          
          case 'unsubscribe':
            await handleUnsubscription(ws, message);
            break;
          
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', requestId: message.requestId }));
            break;
          
          case 'get_status':
            handleStatusRequest(ws, message);
            break;
          
          default:
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Unknown message type' },
              requestId: message.requestId
            }));
        }
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    // Handle connection close
    ws.on('close', (code: number, reason: Buffer) => {
      logger.info(`WebSocket connection closed: ${code} ${reason.toString()}`);
      connectedClients.delete(ws);
      
      if (ws.user) {
        logger.info(`User ${ws.user.email} disconnected`);
        // Unsubscribe from all channels
        if (ws.subscriptions) {
          ws.subscriptions.forEach(channel => {
            unsubscribeFromEventChannel(ws, channel);
          });
        }
      }
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      payload: {
        message: 'Connected to PrivacyGuard WebSocket server',
        timestamp: new Date().toISOString()
      }
    }));
  });

  // Cleanup on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    connectedClients.clear();
  });

  logger.info('✅ WebSocket server setup complete');
}

async function handleAuthentication(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  try {
    const { token } = message.payload;
    
    if (!token) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        payload: { message: 'Token required' },
        requestId: message.requestId
      }));
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    ws.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    ws.send(JSON.stringify({
      type: 'authenticated',
      payload: {
        user: {
          id: ws.user.id,
          email: ws.user.email,
          role: ws.user.role
        }
      },
      requestId: message.requestId
    }));

    logger.info(`WebSocket user authenticated: ${ws.user.email}`);
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    ws.send(JSON.stringify({
      type: 'auth_error',
      payload: { message: 'Invalid token' },
      requestId: message.requestId
    }));
  }
}

async function handleSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  if (!ws.user) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Authentication required' },
      requestId: message.requestId
    }));
    return;
  }

  const { channel } = message.payload;
  
  if (!channel) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Channel required' },
      requestId: message.requestId
    }));
    return;
  }

  // Check permissions for channel
  if (!hasChannelPermission(ws.user, channel)) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Insufficient permissions for channel' },
      requestId: message.requestId
    }));
    return;
  }

  try {
    // Subscribe to Redis channel if not already subscribed
    if (!ws.subscriptions?.has(channel)) {
      await subscribeToEventChannel(ws, channel);
      ws.subscriptions?.add(channel);
    }
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      payload: { channel },
      requestId: message.requestId
    }));

    logger.info(`User ${ws.user.email} subscribed to channel: ${channel}`);
  } catch (error) {
    logger.error(`Failed to subscribe user ${ws.user.email} to channel ${channel}:`, error);
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Failed to subscribe to channel' },
      requestId: message.requestId
    }));
  }
}

async function handleUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  const { channel } = message.payload;
  
  if (channel && ws.subscriptions?.has(channel)) {
    try {
      await unsubscribeFromEventChannel(ws, channel);
      ws.subscriptions.delete(channel);
      
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        payload: { channel },
        requestId: message.requestId
      }));
      
      logger.info(`User ${ws.user?.email} unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`Failed to unsubscribe user ${ws.user?.email} from channel ${channel}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to unsubscribe from channel' },
        requestId: message.requestId
      }));
    }
  }
}

function hasChannelPermission(user: any, channel: string): boolean {
  // Admin has access to all channels
  if (user.role === 'admin' || user.permissions.includes('*')) {
    return true;
  }

  // Define channel permissions
  const channelPermissions: Record<string, string[]> = {
    'dsar:updates': ['dsar:read', 'dsar:*'],
    'risk:alerts': ['risk:read', 'risk:*'],
    'gdpr:notifications': ['gdpr:read', 'gdpr:*'],
    'policy:changes': ['policy:read', 'policy:*'],
    'system:notifications': ['system:read', 'system:*'],
  };

  const requiredPermissions = channelPermissions[channel] || [];
  
  return requiredPermissions.some(permission => 
    user.permissions.includes(permission) ||
    user.permissions.some((userPerm: string) => 
      userPerm.endsWith(':*') && permission.startsWith(userPerm.slice(0, -1))
    )
  );
}

// Handle status request
function handleStatusRequest(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
  const status = {
    connected: true,
    authenticated: !!ws.user,
    subscriptions: Array.from(ws.subscriptions || []),
    lastActivity: ws.lastActivity,
    serverTime: new Date().toISOString()
  };

  ws.send(JSON.stringify({
    type: 'status',
    payload: status,
    requestId: message.requestId
  }));
}

// Subscribe WebSocket client to Redis event channel
async function subscribeToEventChannel(ws: AuthenticatedWebSocket, channel: string): Promise<void> {
  const callback = (eventData: EventData) => {
    // Filter events based on user permissions and context
    if (shouldReceiveEvent(ws, eventData)) {
      ws.send(JSON.stringify({
        type: 'event',
        payload: {
          channel,
          event: eventData
        }
      }));
    }
  };

  // Store callback reference for cleanup
  if (!(ws as any).eventCallbacks) {
    (ws as any).eventCallbacks = new Map();
  }
  (ws as any).eventCallbacks.set(channel, callback);

  await eventService.subscribe(channel, callback);
}

// Unsubscribe WebSocket client from Redis event channel
async function unsubscribeFromEventChannel(ws: AuthenticatedWebSocket, channel: string): Promise<void> {
  const callbacks = (ws as any).eventCallbacks;
  if (callbacks && callbacks.has(channel)) {
    const callback = callbacks.get(channel);
    await eventService.unsubscribe(channel, callback);
    callbacks.delete(channel);
  }
}

// Check if user should receive specific event
function shouldReceiveEvent(ws: AuthenticatedWebSocket, eventData: EventData): boolean {
  if (!ws.user) return false;

  // Admin users receive all events
  if (ws.user.role === 'admin') return true;

  // If event has userId, only send to that user (unless admin)
  if (eventData.userId && eventData.userId !== ws.user.id) {
    return false;
  }

  // Check resource-level permissions
  if (eventData.metadata?.resourceType) {
    const resourceType = eventData.metadata.resourceType;
    const requiredPermission = `${resourceType}:read`;
    
    return ws.user.permissions.includes(requiredPermission) ||
           ws.user.permissions.includes(`${resourceType}:*`) ||
           ws.user.permissions.includes('*');
  }

  return true;
}

// Broadcast message to all connected clients subscribed to a channel
export async function broadcast(channel: string, data: Omit<EventData, 'timestamp'>): Promise<void> {
  try {
    await eventService.publish(channel, data);
    logger.debug(`Broadcasted event to channel ${channel}:`, data.type);
  } catch (error) {
    logger.error(`Failed to broadcast to channel ${channel}:`, error);
  }
}

// Broadcast to specific user
export async function broadcastToUser(userId: string, channel: string, data: Omit<EventData, 'timestamp' | 'userId'>): Promise<void> {
  try {
    await eventService.publish(channel, { ...data, userId });
    logger.debug(`Broadcasted user-specific event to ${userId} on channel ${channel}:`, data.type);
  } catch (error) {
    logger.error(`Failed to broadcast to user ${userId} on channel ${channel}:`, error);
  }
}

// Get WebSocket server statistics
export function getWebSocketStats(): any {
  return {
    connectedClients: connectedClients.size,
    authenticatedClients: Array.from(connectedClients).filter(ws => ws.user).length,
    totalSubscriptions: Array.from(connectedClients).reduce((total, ws) => 
      total + (ws.subscriptions?.size || 0), 0),
    eventServiceHealth: eventService.isHealthy(),
    eventServiceSubscriptions: eventService.getSubscriptionCount(),
    activeChannels: eventService.getActiveChannels()
  };
}

// Initialize event service connection
export async function initializeWebSocketEventService(): Promise<void> {
  try {
    await eventService.connect();
    logger.info('✅ WebSocket EventService initialized');
  } catch (error) {
    logger.error('Failed to initialize WebSocket EventService:', error);
    throw error;
  }
}

// Cleanup event service
export async function cleanupWebSocketEventService(): Promise<void> {
  try {
    await eventService.disconnect();
    logger.info('WebSocket EventService cleaned up');
  } catch (error) {
    logger.error('Error cleaning up WebSocket EventService:', error);
  }
}
