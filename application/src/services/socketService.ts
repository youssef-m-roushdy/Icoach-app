// application/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

interface SocketEvents {
  onEmailVerified?: (data: EmailVerifiedData) => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onError?: (error: Error) => void;
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
  private maxReconnectAttempts = 5;

  /**
   * Connect to the WebSocket server
   */
  connect(userId: string, handlers?: SocketEvents): void {
    if (this.socket?.connected && this.userId === userId) {
      console.log('🔌 Socket already connected for user:', userId);
      return;
    }

    // Disconnect existing socket if any
    this.disconnect();

    this.userId = userId;
    this.eventHandlers = handlers || {};

    // Extract base URL without /api path
    const wsUrl = API_BASE_URL.replace('/api/v1', '').replace('/api', '');
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
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
      console.log('\n========== APP: SOCKET CONNECTED ==========');
      console.log('✅ [APP SOCKET] Connected!');
      console.log('✅ [APP SOCKET] Socket ID:', this.socket?.id);
      console.log('✅ [APP SOCKET] User ID to register:', this.userId);
      this.reconnectAttempts = 0;
      
      // Register user with server
      if (this.userId) {
        console.log('✅ [APP SOCKET] Emitting register event with userId:', this.userId);
        this.socket?.emit('register', this.userId);
      } else {
        console.log('⚠️ [APP SOCKET] No userId to register!');
      }
      
      this.eventHandlers.onConnected?.();
      console.log('==========================================\n');
    });

    // Registration confirmed
    this.socket.on('registered', (data: { success: boolean; message: string }) => {
      console.log('\n========== APP: SOCKET REGISTERED ==========');
      console.log('✅ [APP SOCKET] Registration confirmed!');
      console.log('✅ [APP SOCKET] Success:', data.success);
      console.log('✅ [APP SOCKET] Message:', data.message);
      console.log('✅ [APP SOCKET] User ID:', this.userId);
      console.log('✅ [APP SOCKET] Socket ID:', this.socket?.id);
      console.log('✅ [APP SOCKET] Now listening for email_verified events...');
      console.log('============================================\n');
    });

    // Email verified event from server
    this.socket.on('email_verified', (data: EmailVerifiedData) => {
      console.log('\n========== APP: EMAIL VERIFIED EVENT RECEIVED ==========');
      console.log('📧 [APP SOCKET] Raw data received:', JSON.stringify(data, null, 2));
      console.log('📧 [APP SOCKET] Success:', data.success);
      console.log('📧 [APP SOCKET] Message:', data.message);
      console.log('📧 [APP SOCKET] User data:', JSON.stringify(data.user, null, 2));
      console.log('📧 [APP SOCKET] Handler exists:', !!this.eventHandlers.onEmailVerified);
      
      if (this.eventHandlers.onEmailVerified) {
        console.log('📧 [APP SOCKET] Calling onEmailVerified handler...');
        this.eventHandlers.onEmailVerified(data);
        console.log('📧 [APP SOCKET] Handler called successfully!');
      } else {
        console.log('⚠️ [APP SOCKET] No handler registered for email_verified event!');
      }
      console.log('=======================================================\n');
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      this.eventHandlers.onDisconnected?.(reason);
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('⚠️ Max reconnection attempts reached');
        this.eventHandlers.onError?.(error);
      }
    });

    // Generic error
    this.socket.on('error', (error: Error) => {
      console.error('❌ Socket error:', error);
      this.eventHandlers.onError?.(error);
    });
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
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      console.log('🔌 Socket disconnected');
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
}

// Export singleton instance
export const socketService = new SocketService();
