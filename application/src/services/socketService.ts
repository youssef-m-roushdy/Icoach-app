// application/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, getGlobalRefreshTokenFunction } from './api';

// Extract the base URL from API_BASE_URL (remove /api path)
export const GATEWAY_URL = API_BASE_URL.replace(/\/api$/, '').replace(/\/api\/v1$/, '');

interface SocketEvents {
  onEmailVerified?: (data: EmailVerifiedData) => void;
  onMessageNew?: (data: MessageNewPayload) => void;
  onMessageStatus?: (data: MessageStatusPayload) => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

interface SocketConnectOptions {
  userId?: string;
  token?: string;
  handlers?: SocketEvents;
}

interface EmailVerifiedData {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    isEmailVerified: boolean;
    firstName?: string;
  };
}

interface MessageSender {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

interface MessageNewPayload {
  conversationId: number;
  message: {
    id: number;
    content: string;
    senderId: number;
    sender?: MessageSender;
    createdAt?: string;
  };
}

interface MessageStatusPayload {
  conversationId: number;
  messageId: number;
  recipientId: number;
  status: 'delivered' | 'push' | 'offline';
}

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private authToken: string | null = null;
  private eventHandlers: SocketEvents = {};
  private messageListeners = new Set<(data: MessageNewPayload) => void>();
  private messageStatusListeners = new Set<(data: MessageStatusPayload) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private refreshPromise: Promise<string | null> | null = null;

  private isAuthTokenError(error: Error): boolean {
    const message = (error?.message || '').toLowerCase();
    return message.includes('authentication token');
  }

  private updateSocketAuth(token: string): void {
    this.authToken = token;

    if (!this.socket) return;

    this.socket.auth = { token };
    const existingHeaders = this.socket.io.opts.extraHeaders || {};
    this.socket.io.opts.extraHeaders = {
      ...existingHeaders,
      Authorization: `Bearer ${token}`,
      'X-Client-Type': 'mobile-app',
    };
  }

  private async refreshAuthToken(): Promise<string | null> {
    const refreshFn = getGlobalRefreshTokenFunction();
    if (!refreshFn) return null;

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          return await refreshFn();
        } catch (refreshError) {
          console.error('❌ [GATEWAY SOCKET] Token refresh failed:', refreshError);
          return null;
        }
      })().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async handleAuthError(error: Error): Promise<void> {
    if (this.refreshPromise) return;

    const refreshFn = getGlobalRefreshTokenFunction();
    if (!refreshFn) {
      console.error('❌ [GATEWAY SOCKET] Connection error:', error.message);
      return;
    }

    console.warn('⚠️ [GATEWAY SOCKET] Invalid access token, attempting refresh...');
    const newToken = await this.refreshAuthToken();

    if (newToken) {
      console.log('✅ [GATEWAY SOCKET] Token refreshed, reconnecting socket...');
      this.updateSocketAuth(newToken);
      this.reconnectAttempts = 0;
      this.socket?.connect();
      return;
    }

    console.warn('⚠️ [GATEWAY SOCKET] Token refresh failed; socket will remain disconnected');
  }

  /**
   * Connect to the Socket.IO server THROUGH API GATEWAY
   */
  connect(options: SocketConnectOptions): void {
    const userId = options.userId || null;
    const token = options.token || null;
    const handlers = options.handlers;

    if (this.socket?.connected && this.userId === userId && this.authToken === token) {
      console.log('🔌 [GATEWAY SOCKET] Already connected for user:', userId);
      return;
    }

    // Disconnect existing socket if any
    this.disconnect();

    this.userId = userId;
    this.authToken = token;
    this.eventHandlers = { ...this.eventHandlers, ...(handlers || {}) };

    console.log('🌐 [GATEWAY SOCKET] Connecting through gateway:', GATEWAY_URL);
    console.log('🌐 [GATEWAY SOCKET] User ID:', userId);
    console.log('🌐 [GATEWAY SOCKET] Auth token set:', !!token);
    console.log('🌐 [GATEWAY SOCKET] Socket.IO path: /socket.io');

    // Connect through the gateway
    // Socket.IO will use HTTP polling first, then upgrade to WebSocket
    this.socket = io(GATEWAY_URL, {
      path: '/socket.io',                    // Socket.IO default path
      transports: ['polling', 'websocket'],  // Start with polling, upgrade to WebSocket
      upgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      auth: token ? { token } : undefined,
      // Important for gateway routing
      extraHeaders: {
        'X-Client-Type': 'mobile-app',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Handle CORS
      withCredentials: true,
    });

    this.setupEventListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('\n═══════════════════════════════════════════');
      console.log('✅ [GATEWAY SOCKET] Connected through gateway!');
      console.log('✅ [GATEWAY SOCKET] Socket ID:', this.socket?.id);
      console.log('✅ [GATEWAY SOCKET] Gateway URL:', GATEWAY_URL);
      console.log('✅ [GATEWAY SOCKET] Transport:', this.socket?.io.engine.transport.name);
      this.reconnectAttempts = 0;

      // Register user with server
      if (this.authToken || this.userId) {
        const payload = this.authToken
          ? { token: this.authToken, userId: this.userId }
          : this.userId;
        console.log('📤 [GATEWAY SOCKET] Emitting register event');
        this.socket?.emit('register', payload);
      } else {
        console.log('⚠️ [GATEWAY SOCKET] No auth token or userId to register');
      }

      this.eventHandlers.onConnected?.();
      console.log('═══════════════════════════════════════════\n');
    });

    // Registration confirmed
    this.socket.on('registered', (data: { success: boolean; message: string }) => {
      console.log('\n═══════════════════════════════════════════');
      console.log('📋 [GATEWAY SOCKET] Registration confirmed!');
      console.log('📋 [GATEWAY SOCKET] Success:', data.success);
      console.log('📋 [GATEWAY SOCKET] Message:', data.message);
      console.log('📋 [GATEWAY SOCKET] User ID:', this.userId);
      console.log('📋 [GATEWAY SOCKET] Socket ID:', this.socket?.id);
      console.log('═══════════════════════════════════════════\n');
    });

    // Email verified event from server
    this.socket.on('email_verified', (data: EmailVerifiedData) => {
      console.log('\n═══════════════════════════════════════════');
      console.log('📧 [GATEWAY SOCKET] Email verified event received!');
      console.log('📧 [GATEWAY SOCKET] Success:', data.success);
      console.log('📧 [GATEWAY SOCKET] Message:', data.message);
      console.log('📧 [GATEWAY SOCKET] User:', data.user?.email);
      console.log('📧 [GATEWAY SOCKET] Handler exists:', !!this.eventHandlers.onEmailVerified);

      if (this.eventHandlers.onEmailVerified) {
        console.log('📧 [GATEWAY SOCKET] Calling onEmailVerified handler...');
        this.eventHandlers.onEmailVerified(data);
        console.log('✅ [GATEWAY SOCKET] Handler executed successfully');
      } else {
        console.log('⚠️ [GATEWAY SOCKET] No handler registered for email_verified event!');
      }
      console.log('═══════════════════════════════════════════\n');
    });

    // New message event
    this.socket.on('message:new', (data: MessageNewPayload) => {
      this.eventHandlers.onMessageNew?.(data);
      this.messageListeners.forEach((handler) => handler(data));
    });

    this.socket.on('message:status', (data: MessageStatusPayload) => {
      this.eventHandlers.onMessageStatus?.(data);
      this.messageStatusListeners.forEach((handler) => handler(data));
    });

    // Transport upgrade (polling → WebSocket)
    this.socket.io.engine.on('upgrade', (transport) => {
      console.log('⬆️ [GATEWAY SOCKET] Transport upgraded to:', transport.name);
    });

    // Reconnection attempts
    this.socket.io.on('reconnect_attempt', (attempt: number) => {
      console.log(`🔄 [GATEWAY SOCKET] Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
      this.eventHandlers.onReconnecting?.(attempt);
    });

    // Reconnected successfully
    this.socket.io.on('reconnect', () => {
      console.log('✅ [GATEWAY SOCKET] Reconnected to gateway!');
      // Re-register user after reconnection
      if (this.authToken || this.userId) {
        const payload = this.authToken
          ? { token: this.authToken, userId: this.userId }
          : this.userId;
        this.socket?.emit('register', payload);
      }
    });

    // Reconnection failed
    this.socket.io.on('reconnect_failed', () => {
      console.log('❌ [GATEWAY SOCKET] Reconnection failed after max attempts');
      this.eventHandlers.onReconnectFailed?.();
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 [GATEWAY SOCKET] Disconnected:', reason);
      this.eventHandlers.onDisconnected?.(reason);
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      if (this.isAuthTokenError(error)) {
        void this.handleAuthError(error);
        return;
      }

      console.error('❌ [GATEWAY SOCKET] Connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('⚠️ [GATEWAY SOCKET] Max reconnection attempts reached');
        this.eventHandlers.onError?.(error);
      }
    });

    // Generic error
    this.socket.on('error', (error: Error) => {
      console.error('❌ [GATEWAY SOCKET] Socket error:', error);
      this.eventHandlers.onError?.(error);
    });

    // Debug packet events (only in development)
    if (__DEV__) {
      this.socket.io.on('packet', (packet) => {
        if (packet.type === 2 || packet.type === 3) return; // 2 = PING, 3 = PONG
        console.log('📦 [GATEWAY SOCKET] Packet:', packet.type);
      });
    }
  }

  /**
   * Update event handlers
   */
  setEventHandlers(handlers: SocketEvents): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  addMessageListener(handler: (data: MessageNewPayload) => void): void {
    this.messageListeners.add(handler);
  }

  removeMessageListener(handler: (data: MessageNewPayload) => void): void {
    this.messageListeners.delete(handler);
  }

  addMessageStatusListener(handler: (data: MessageStatusPayload) => void): void {
    this.messageStatusListeners.add(handler);
  }

  removeMessageStatusListener(handler: (data: MessageStatusPayload) => void): void {
    this.messageStatusListeners.delete(handler);
  }

  /**
   * Set email verified handler specifically
   */
  onEmailVerified(handler: (data: EmailVerifiedData) => void): void {
    this.eventHandlers.onEmailVerified = handler;
  }

  /**
   * Emit custom event through gateway
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ [GATEWAY SOCKET] Cannot emit - socket not connected');
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.authToken = null;
      console.log('🔌 [GATEWAY SOCKET] Disconnected from gateway');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  /**
   * Get current transport type
   */
  getTransport(): string | null {
    return this.socket?.io.engine.transport.name ?? null;
  }

  /**
   * Get gateway URL being used
   */
  getGatewayUrl(): string {
    return GATEWAY_URL;
  }

  /**
   * Force reconnect
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Debug helper for testing
export const testGatewaySocket = () => {
  console.log('🧪 [TEST] Testing Gateway Socket Connection...');
  console.log('🧪 [TEST] Gateway URL:', GATEWAY_URL);
  console.log('🧪 [TEST] Socket.IO Path: /socket.io');

  socketService.connect({
    userId: 'test-user-' + Date.now(),
    handlers: {
    onConnected: () => {
      console.log('✅ [TEST] Connection successful!');
      console.log('✅ [TEST] Socket ID:', socketService.getSocketId());
      console.log('✅ [TEST] Transport:', socketService.getTransport());
    },
    onError: (error) => {
      console.error('❌ [TEST] Connection failed:', error.message);
    },
    onDisconnected: (reason) => {
      console.log('🔌 [TEST] Disconnected:', reason);
    }
    }
  });

  setTimeout(() => {
    if (!socketService.isConnected()) {
      console.error('❌ [TEST] Connection timeout - check gateway logs');
    }
  }, 5000);
};