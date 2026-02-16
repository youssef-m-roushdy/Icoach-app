// server/src/services/socketService.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';

interface UserSocket {
  odId: string;
  socket: Socket;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Socket> = new Map(); // Map userId to socket

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8081',
          'http://localhost:19000',
          'http://localhost:19001',
          'exp://localhost:8081',
          'exp://192.168.1.6:8081',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    console.log('🔌 Socket.IO server initialized');

    return this.io;
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);

      // Handle user registration (associate userId with socket)
      socket.on('register', (userId: string) => {
        console.log('\n========== SOCKET REGISTRATION ==========');
        console.log('📝 [REGISTER] Received registration request');
        console.log('📝 [REGISTER] User ID:', userId, '| Type:', typeof userId);
        console.log('📝 [REGISTER] Socket ID:', socket.id);
        
        if (userId) {
          // Always convert to string for consistent Map key lookup
          const normalizedUserId = String(userId);
          this.userSockets.set(normalizedUserId, socket);
          socket.data.userId = normalizedUserId;
          
          console.log('✅ [REGISTER] User registered successfully!');
          console.log('✅ [REGISTER] Normalized User ID:', normalizedUserId, '| Type:', typeof normalizedUserId);
          console.log('✅ [REGISTER] Current connected users:', Array.from(this.userSockets.keys()));
          console.log('✅ [REGISTER] Total connected users:', this.userSockets.size);
          
          // Send confirmation back to client
          socket.emit('registered', { 
            success: true, 
            message: 'Successfully connected to real-time updates' 
          });
          console.log('✅ [REGISTER] Confirmation sent to client');
          console.log('=========================================\n');
        } else {
          console.log('⚠️ [REGISTER] No userId provided!');
          console.log('=========================================\n');
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        const userId = socket.data.userId;
        if (userId) {
          this.userSockets.delete(userId);
          console.log(`🔌 User ${userId} disconnected: ${reason}`);
        } else {
          console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Emit email verified event to specific user
   */
  emitEmailVerified(userId: string, userData: {
    id: string;
    email: string;
    isEmailVerified: boolean;
    firstName?: string;
  }): boolean {
    // Always normalize to string for consistent Map key lookup
    const normalizedUserId = String(userId);
    
    console.log('\n========== EMAIL VERIFICATION SOCKET EMIT ==========');
    console.log('🔍 [SOCKET] Looking for user socket...');
    console.log('🔍 [SOCKET] User ID:', userId, '| Normalized:', normalizedUserId);
    console.log('🔍 [SOCKET] Connected sockets map size:', this.userSockets.size);
    console.log('🔍 [SOCKET] All connected user IDs:', Array.from(this.userSockets.keys()));
    
    const socket = this.userSockets.get(normalizedUserId);
    
    if (socket && socket.connected) {
      const payload = {
        success: true,
        message: 'Your email has been verified successfully!',
        user: userData,
      };
      console.log('✅ [SOCKET] User socket found and connected!');
      console.log('✅ [SOCKET] Socket ID:', socket.id);
      console.log('✅ [SOCKET] Sending payload:', JSON.stringify(payload, null, 2));
      
      socket.emit('email_verified', payload);
      
      console.log('📧 [SOCKET] Email verified event SENT to user', normalizedUserId);
      console.log('================================================\n');
      return true;
    }
    
    console.log('⚠️ [SOCKET] User', normalizedUserId, 'NOT connected!');
    console.log('⚠️ [SOCKET] Socket exists:', !!socket);
    if (socket) {
      console.log('⚠️ [SOCKET] Socket connected status:', socket.connected);
    }
    console.log('================================================\n');
    return false;
  }

  /**
   * Emit a custom event to a specific user
   */
  emitToUser(userId: string, event: string, data: any): boolean {
    const socket = this.userSockets.get(userId);
    
    if (socket && socket.connected) {
      socket.emit(event, data);
      console.log(`📤 Event '${event}' sent to user ${userId}`);
      return true;
    }
    
    console.log(`⚠️ User ${userId} not connected, cannot send event '${event}'`);
    return false;
  }

  /**
   * Broadcast event to all connected users
   */
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`📢 Broadcast event '${event}' to all users`);
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    const socket = this.userSockets.get(userId);
    return socket?.connected ?? false;
  }

  /**
   * Get count of connected users
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }
}

// Export singleton instance
export const socketService = new SocketService();
