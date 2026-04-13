// application/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Extract the base URL from API_BASE_URL (remove /api path)
export const GATEWAY_URL = API_BASE_URL.replace(/\/api$/, '').replace(/\/api\/v1$/, '');

interface SocketEvents {
  onEmailVerified?: (data: EmailVerifiedData) => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
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

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private eventHandlers: SocketEvents = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  /**
   * Connect to the Socket.IO server THROUGH API GATEWAY
   */
  connect(userId: string, handlers?: SocketEvents): void {
    if (this.socket?.connected && this.userId === userId) {
      console.log('🔌 [GATEWAY SOCKET] Already connected for user:', userId);
      return;
    }

    // Disconnect existing socket if any
    this.disconnect();

    this.userId = userId;
    this.eventHandlers = handlers || {};

    console.log('🌐 [GATEWAY SOCKET] Connecting through gateway:', GATEWAY_URL);
    console.log('🌐 [GATEWAY SOCKET] User ID:', userId);
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
      // Important for gateway routing
      extraHeaders: {
        'X-Client-Type': 'mobile-app',
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
      if (this.userId) {
        console.log('📤 [GATEWAY SOCKET] Emitting register event with userId:', this.userId);
        this.socket?.emit('register', this.userId);
      } else {
        console.log('⚠️ [GATEWAY SOCKET] No userId to register!');
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
      if (this.userId) {
        this.socket?.emit('register', this.userId);
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
        if (packet.type === 'ping' || packet.type === 'pong') return;
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
  
  socketService.connect('test-user-' + Date.now(), {
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
  });
  
  setTimeout(() => {
    if (!socketService.isConnected()) {
      console.error('❌ [TEST] Connection timeout - check gateway logs');
    }
  }, 5000);
};