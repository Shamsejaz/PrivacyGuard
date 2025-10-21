import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket, useDSARUpdates, useRiskAlerts, useSystemNotifications } from '../useWebSocket';
import { websocketService } from '../../services/websocketService';
import { useAuth } from '../../contexts/AuthContext';

// Mock the WebSocket service
vi.mock('../../services/websocketService', () => ({
  websocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getStatus: vi.fn(),
    onConnectionStatus: vi.fn(),
    isConnected: vi.fn()
  }
}));

// Mock the Auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('useWebSocket Hook', () => {
  const mockToken = 'mock-jwt-token';
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default auth mock
    vi.mocked(useAuth).mockReturnValue({
      token: mockToken,
      isAuthenticated: true,
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false
    });

    // Default WebSocket service mocks
    vi.mocked(websocketService.onConnectionStatus).mockImplementation((callback) => {
      // Immediately call with default status
      callback({
        connected: false,
        authenticated: false,
        subscriptions: []
      });
      
      // Return unsubscribe function
      return vi.fn();
    });

    vi.mocked(websocketService.connect).mockResolvedValue();
    vi.mocked(websocketService.getStatus).mockResolvedValue({
      connected: true,
      authenticated: true,
      subscriptions: []
    });
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.connectionStatus.subscriptions).toEqual([]);
    });

    it('should auto-connect when authenticated', async () => {
      renderHook(() => useWebSocket({ autoConnect: true }));

      await act(async () => {
        // Wait for useEffect to run
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(websocketService.connect).toHaveBeenCalledWith(mockToken);
    });

    it('should not auto-connect when disabled', () => {
      renderHook(() => useWebSocket({ autoConnect: false }));

      expect(websocketService.connect).not.toHaveBeenCalled();
    });

    it('should not connect when not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        token: null,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      });

      renderHook(() => useWebSocket({ autoConnect: true }));

      expect(websocketService.connect).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should provide connect function', async () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(websocketService.connect).toHaveBeenCalledWith(mockToken);
    });

    it('should provide disconnect function', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.disconnect();
      });

      expect(websocketService.disconnect).toHaveBeenCalled();
    });

    it('should disconnect when authentication is lost', () => {
      const { rerender } = renderHook(() => useWebSocket());

      // Simulate auth loss
      vi.mocked(useAuth).mockReturnValue({
        token: null,
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      });

      // Mock connection status as connected
      vi.mocked(websocketService.onConnectionStatus).mockImplementation((callback) => {
        callback({
          connected: true,
          authenticated: true,
          subscriptions: []
        });
        return vi.fn();
      });

      rerender();

      expect(websocketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should provide subscribe function', () => {
      const { result } = renderHook(() => useWebSocket());
      const handler = vi.fn();

      act(() => {
        result.current.subscribe('test:channel', handler);
      });

      expect(websocketService.subscribe).toHaveBeenCalledWith('test:channel', handler);
    });

    it('should provide unsubscribe function', () => {
      const { result } = renderHook(() => useWebSocket());
      const handler = vi.fn();

      act(() => {
        result.current.unsubscribe('test:channel', handler);
      });

      expect(websocketService.unsubscribe).toHaveBeenCalledWith('test:channel', handler);
    });

    it('should auto-subscribe to specified channels', () => {
      const channels = ['dsar:updates', 'risk:alerts'];
      
      // Mock authenticated status
      vi.mocked(websocketService.onConnectionStatus).mockImplementation((callback) => {
        callback({
          connected: true,
          authenticated: true,
          subscriptions: []
        });
        return vi.fn();
      });

      renderHook(() => useWebSocket({ channels }));

      // Should subscribe to each channel
      expect(websocketService.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should not auto-subscribe when not authenticated', () => {
      const channels = ['dsar:updates', 'risk:alerts'];
      
      renderHook(() => useWebSocket({ channels }));

      // Should not subscribe when not authenticated
      expect(websocketService.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('Status Management', () => {
    it('should provide getStatus function', async () => {
      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        await result.current.getStatus();
      });

      expect(websocketService.getStatus).toHaveBeenCalled();
    });

    it('should update connection status from service', () => {
      let statusCallback: any;
      
      vi.mocked(websocketService.onConnectionStatus).mockImplementation((callback) => {
        statusCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useWebSocket());

      // Simulate status update
      act(() => {
        statusCallback({
          connected: true,
          authenticated: true,
          subscriptions: ['dsar:updates']
        });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.connectionStatus.subscriptions).toEqual(['dsar:updates']);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup subscriptions on unmount', () => {
      const unsubscribeFn = vi.fn();
      
      vi.mocked(websocketService.onConnectionStatus).mockReturnValue(unsubscribeFn);

      const { unmount } = renderHook(() => useWebSocket());

      unmount();

      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });
});

describe('Specialized WebSocket Hooks', () => {
  const mockHandler = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      token: 'mock-token',
      isAuthenticated: true,
      user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      loading: false
    });

    // Mock useWebSocket hook
    vi.doMock('../useWebSocket', () => ({
      useWebSocket: vi.fn(() => ({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isAuthenticated: true
      }))
    }));
  });

  describe('useDSARUpdates', () => {
    it('should subscribe to DSAR updates when authenticated', () => {
      const mockUseWebSocket = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isAuthenticated: true
      };

      // Mock the useWebSocket hook for this test
      vi.doMock('../useWebSocket', () => ({
        useWebSocket: () => mockUseWebSocket
      }));

      renderHook(() => useDSARUpdates(mockHandler));

      expect(mockUseWebSocket.subscribe).toHaveBeenCalledWith('dsar:updates', mockHandler);
    });
  });

  describe('useRiskAlerts', () => {
    it('should subscribe to risk alerts when authenticated', () => {
      const mockUseWebSocket = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isAuthenticated: true
      };

      vi.doMock('../useWebSocket', () => ({
        useWebSocket: () => mockUseWebSocket
      }));

      renderHook(() => useRiskAlerts(mockHandler));

      expect(mockUseWebSocket.subscribe).toHaveBeenCalledWith('risk:alerts', mockHandler);
    });
  });

  describe('useSystemNotifications', () => {
    it('should subscribe to system notifications when authenticated', () => {
      const mockUseWebSocket = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isAuthenticated: true
      };

      vi.doMock('../useWebSocket', () => ({
        useWebSocket: () => mockUseWebSocket
      }));

      renderHook(() => useSystemNotifications(mockHandler));

      expect(mockUseWebSocket.subscribe).toHaveBeenCalledWith('system:notifications', mockHandler);
    });
  });
});