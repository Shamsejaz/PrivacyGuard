import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWebSocket, initializeWebSocketEventService, cleanupWebSocketEventService } from '../websocket/server';
import { eventService } from '../services/EventService';
import jwt from 'jsonwebtoken';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';

describe('WebSocket Server', () => {
  let server: any;
  let wss: WebSocketServer;
  let wsUrl: string;

  beforeEach(async () => {
    // Create HTTP server
    server = createServer();
    
    // Create WebSocket server
    wss = new WebSocketServer({ server });
    setupWebSocket(wss);
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const port = (server.address() as any).port;
        wsUrl = `ws://localhost:${port}`;
        resolve();
      });
    });

    // Initialize event service
    await initializeWebSocketEventService();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupWebSocketEventService();
    
    // Close WebSocket server
    wss.close();
    
    // Close HTTP server
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Connection Management', () => {
    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should send welcome message on connection', async () => {
      const ws = new WebSocket(wsUrl);
      
      const welcomeMessage = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'welcome') {
            resolve(message);
          }
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Welcome message timeout')), 5000);
      });

      expect(welcomeMessage.type).toBe('welcome');
      expect(welcomeMessage.payload.message).toContain('PrivacyGuard WebSocket server');
      ws.close();
    });

    it('should handle connection close gracefully', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.close();
        });
        ws.on('close', () => resolve());
      });

      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid JWT token', async () => {
      const ws = new WebSocket(wsUrl);
      
      // Create valid JWT token
      const token = jwt.sign(
        {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*']
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'authenticated') {
            expect(message.payload.user.email).toBe('test@example.com');
            resolve();
          }
        });
      });

      ws.close();
    });

    it('should reject invalid JWT token', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: 'invalid-token' }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_error') {
            expect(message.payload.message).toContain('Invalid token');
            resolve();
          }
        });
      });

      ws.close();
    });

    it('should require authentication for subscriptions', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: { channel: 'test:channel' }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error' && message.payload.message === 'Authentication required') {
            resolve();
          }
        });
      });

      ws.close();
    });
  });

  describe('Channel Subscriptions', () => {
    let authenticatedWs: WebSocket;
    let token: string;

    beforeEach(async () => {
      token = jwt.sign(
        {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*']
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      authenticatedWs = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        authenticatedWs.on('open', () => {
          authenticatedWs.send(JSON.stringify({
            type: 'authenticate',
            payload: { token }
          }));
        });

        authenticatedWs.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'authenticated') {
            resolve();
          }
        });
      });
    });

    afterEach(() => {
      if (authenticatedWs.readyState === WebSocket.OPEN) {
        authenticatedWs.close();
      }
    });

    it('should allow subscription to permitted channels', async () => {
      await new Promise<void>((resolve) => {
        authenticatedWs.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: 'dsar:updates' }
        }));

        authenticatedWs.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscribed') {
            expect(message.payload.channel).toBe('dsar:updates');
            resolve();
          }
        });
      });
    });

    it('should allow unsubscription from channels', async () => {
      // First subscribe
      await new Promise<void>((resolve) => {
        authenticatedWs.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel: 'dsar:updates' }
        }));

        authenticatedWs.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'subscribed') {
            resolve();
          }
        });
      });

      // Then unsubscribe
      await new Promise<void>((resolve) => {
        authenticatedWs.send(JSON.stringify({
          type: 'unsubscribe',
          payload: { channel: 'dsar:updates' }
        }));

        authenticatedWs.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'unsubscribed') {
            expect(message.payload.channel).toBe('dsar:updates');
            resolve();
          }
        });
      });
    });
  });

  describe('Heartbeat and Connection Management', () => {
    it('should respond to ping messages', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'ping',
            requestId: 'test-ping'
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong' && message.requestId === 'test-ping') {
            resolve();
          }
        });
      });

      ws.close();
    });

    it('should provide status information', async () => {
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'get_status',
            requestId: 'test-status'
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'status' && message.requestId === 'test-status') {
            expect(message.payload).toHaveProperty('connected');
            expect(message.payload).toHaveProperty('authenticated');
            expect(message.payload).toHaveProperty('subscriptions');
            resolve();
          }
        });
      });

      ws.close();
    });
  });
});

describe('Event Service', () => {
  beforeEach(async () => {
    await eventService.connect();
  });

  afterEach(async () => {
    await eventService.disconnect();
  });

  describe('Pub/Sub Functionality', () => {
    it('should publish and receive events', async () => {
      const testChannel = 'test:channel';
      const testEvent = {
        type: 'test_event',
        payload: { message: 'Hello, World!' }
      };

      let receivedEvent: any = null;

      // Subscribe to channel
      await eventService.subscribe(testChannel, (data) => {
        receivedEvent = data;
      });

      // Publish event
      await eventService.publish(testChannel, testEvent);

      // Wait for event to be received
      await new Promise<void>((resolve) => {
        const checkReceived = () => {
          if (receivedEvent) {
            resolve();
          } else {
            setTimeout(checkReceived, 10);
          }
        };
        checkReceived();
      });

      expect(receivedEvent.type).toBe('test_event');
      expect(receivedEvent.payload.message).toBe('Hello, World!');
      expect(receivedEvent.timestamp).toBeDefined();
    });

    it('should handle multiple subscribers', async () => {
      const testChannel = 'test:multi';
      const testEvent = {
        type: 'multi_test',
        payload: { count: 1 }
      };

      const receivedEvents: any[] = [];

      // Subscribe multiple handlers
      const handler1 = (data: any) => receivedEvents.push({ handler: 1, data });
      const handler2 = (data: any) => receivedEvents.push({ handler: 2, data });

      await eventService.subscribe(testChannel, handler1);
      await eventService.subscribe(testChannel, handler2);

      // Publish event
      await eventService.publish(testChannel, testEvent);

      // Wait for events to be received
      await new Promise<void>((resolve) => {
        const checkReceived = () => {
          if (receivedEvents.length >= 2) {
            resolve();
          } else {
            setTimeout(checkReceived, 10);
          }
        };
        checkReceived();
      });

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].data.type).toBe('multi_test');
      expect(receivedEvents[1].data.type).toBe('multi_test');
    });

    it('should unsubscribe handlers correctly', async () => {
      const testChannel = 'test:unsub';
      let eventCount = 0;

      const handler = () => {
        eventCount++;
      };

      // Subscribe and publish
      await eventService.subscribe(testChannel, handler);
      await eventService.publish(testChannel, { type: 'test', payload: {} });

      // Wait and check
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(eventCount).toBe(1);

      // Unsubscribe and publish again
      await eventService.unsubscribe(testChannel, handler);
      await eventService.publish(testChannel, { type: 'test', payload: {} });

      // Wait and check - should still be 1
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(eventCount).toBe(1);
    });
  });

  describe('Convenience Methods', () => {
    it('should publish DSAR updates', async () => {
      let receivedEvent: any = null;

      await eventService.subscribe('dsar:updates', (data) => {
        receivedEvent = data;
      });

      await eventService.publishDSARUpdate('dsar-123', 'completed', 'user-456');

      await new Promise<void>((resolve) => {
        const checkReceived = () => {
          if (receivedEvent) {
            resolve();
          } else {
            setTimeout(checkReceived, 10);
          }
        };
        checkReceived();
      });

      expect(receivedEvent.type).toBe('dsar_status_changed');
      expect(receivedEvent.payload.dsarId).toBe('dsar-123');
      expect(receivedEvent.payload.status).toBe('completed');
      expect(receivedEvent.userId).toBe('user-456');
    });

    it('should publish risk alerts', async () => {
      let receivedEvent: any = null;

      await eventService.subscribe('risk:alerts', (data) => {
        receivedEvent = data;
      });

      await eventService.publishRiskAlert('risk-789', 'high', 'Critical vulnerability detected');

      await new Promise<void>((resolve) => {
        const checkReceived = () => {
          if (receivedEvent) {
            resolve();
          } else {
            setTimeout(checkReceived, 10);
          }
        };
        checkReceived();
      });

      expect(receivedEvent.type).toBe('risk_alert');
      expect(receivedEvent.payload.riskId).toBe('risk-789');
      expect(receivedEvent.payload.level).toBe('high');
      expect(receivedEvent.payload.message).toBe('Critical vulnerability detected');
    });

    it('should publish system notifications', async () => {
      let receivedEvent: any = null;

      await eventService.subscribe('system:notifications', (data) => {
        receivedEvent = data;
      });

      await eventService.publishSystemNotification('System maintenance scheduled', 'warning');

      await new Promise<void>((resolve) => {
        const checkReceived = () => {
          if (receivedEvent) {
            resolve();
          } else {
            setTimeout(checkReceived, 10);
          }
        };
        checkReceived();
      });

      expect(receivedEvent.type).toBe('system_notification');
      expect(receivedEvent.payload.message).toBe('System maintenance scheduled');
      expect(receivedEvent.payload.severity).toBe('warning');
    });
  });

  describe('Health and Monitoring', () => {
    it('should report healthy status when connected', () => {
      expect(eventService.isHealthy()).toBe(true);
    });

    it('should track subscription count', async () => {
      const initialCount = eventService.getSubscriptionCount();
      
      await eventService.subscribe('test:count', () => {});
      
      expect(eventService.getSubscriptionCount()).toBe(initialCount + 1);
    });

    it('should track active channels', async () => {
      const initialChannels = eventService.getActiveChannels();
      
      await eventService.subscribe('test:channels', () => {});
      
      const updatedChannels = eventService.getActiveChannels();
      expect(updatedChannels).toContain('test:channels');
      expect(updatedChannels.length).toBe(initialChannels.length + 1);
    });
  });
});