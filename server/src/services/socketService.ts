// server/src/services/socketService.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { Expo } from 'expo-server-sdk';
import type { ExpoPushMessage } from 'expo-server-sdk';
import { jwtConfig } from '../config/jwt.js';

import {
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  User,
  ExpoToken,
} from '../models/sql/index.js';

interface PresenceState {
  online: boolean;
  lastSeen: Date | null;
}

interface RegisterPayload {
  token?: string;
  userId?: string | number;
}

const USER_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'avatar', 'isActive'];

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<Socket>> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private presence: Map<string, PresenceState> = new Map();

  // Single shared Expo SDK instance (handles chunking, retries, receipts)
  private expo = new Expo();

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

    this.setupAuth();
    this.setupEventHandlers();
    console.log('Socket.IO server initialized');

    return this.io;
  }

  /**
   * Setup connection auth middleware
   */
  private setupAuth(): void {
    if (!this.io) return;

    this.io.use((socket, next) => {
      const token = this.extractToken(socket);
      if (!token) {
        return next();
      }

      const userId = this.verifyAccessToken(token);
      if (!userId) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = userId;
      return next();
    });
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Auto-register if userId is present from auth middleware
      if (socket.data.userId) {
        this.registerSocket(socket, String(socket.data.userId));
        socket.emit('registered', {
          success: true,
          message: 'Connected to real-time updates',
        });
      }

      // Handle manual registration event
      socket.on('register', (payload: RegisterPayload | string) => {
        const currentUserId = socket.data.userId ? String(socket.data.userId) : null;
        if (currentUserId) {
          return;
        }

        const token = typeof payload === 'string' ? payload : payload?.token;
        const fallbackUserId = typeof payload === 'object' ? payload?.userId : null;

        let userId = token ? this.verifyAccessToken(token) : null;

        // Development fallback for userId mapping
        if (!userId && fallbackUserId && process.env.NODE_ENV !== 'production') {
          userId = String(fallbackUserId);
        }

        if (!userId) {
          socket.emit('registered', {
            success: false,
            message: 'Authentication required for socket registration',
          });
          return;
        }

        socket.data.userId = userId;
        this.registerSocket(socket, userId);

        socket.emit('registered', {
          success: true,
          message: 'Connected to real-time updates',
        });
      });

      // Presence Management
      socket.on('presence:watch', (userIds: Array<string | number> | string) => {
        const ids = Array.isArray(userIds)
          ? userIds
          : typeof userIds === 'string'
            ? userIds.split(',')
            : [];

        ids.forEach((id) => {
          const normalized = String(id);
          socket.join(this.getPresenceRoom(normalized));
          const presence = this.getPresence([normalized])[0];
          socket.emit('presence:update', presence);
        });
      });

      socket.on('presence:unwatch', (userIds: Array<string | number> | string) => {
        const ids = Array.isArray(userIds)
          ? userIds
          : typeof userIds === 'string'
            ? userIds.split(',')
            : [];

        ids.forEach((id) => {
          socket.leave(this.getPresenceRoom(String(id)));
        });
      });

      // Conversation Management
      socket.on('conversation:join', async (conversationId: number) => {
        const userId = socket.data.userId ? Number(socket.data.userId) : null;
        if (!userId) return;

        const id = Number(conversationId);
        if (Number.isNaN(id)) return;

        const participant = await ChatParticipant.findOne({
          where: { conversationId: id, userId, leftAt: null },
        });

        if (!participant) {
          socket.emit('conversation:error', {
            conversationId: id,
            message: 'Not a participant in this conversation',
          });
          return;
        }

        socket.join(this.getConversationRoom(id));
        socket.emit('conversation:joined', { conversationId: id });
      });

      socket.on('conversation:leave', (conversationId: number) => {
        const id = Number(conversationId);
        if (Number.isNaN(id)) return;
        socket.leave(this.getConversationRoom(id));
      });

      // Message Handling
      socket.on('message:send', async (payload: { conversationId: number; content: string }, ack?: Function) => {
        try {
          const userId = socket.data.userId ? Number(socket.data.userId) : null;
          if (!userId) {
            throw new Error('Authentication required');
          }

          const conversationId = Number(payload?.conversationId);
          if (Number.isNaN(conversationId)) {
            throw new Error('Invalid conversation id');
          }

          const content = String(payload?.content || '').trim();
          if (!content) {
            throw new Error('Content is required');
          }

          const participant = await ChatParticipant.findOne({
            where: { conversationId, userId, leftAt: null },
          });

          if (!participant) {
            throw new Error('Not a participant in this conversation');
          }

          const message = await ChatMessage.create({
            conversationId,
            senderId: userId,
            content,
          });

          await ChatConversation.update(
            { updatedAt: new Date() },
            { where: { id: conversationId } }
          );

          const sender: any = await User.findByPk(userId, { attributes: USER_ATTRIBUTES });
          const data = {
            conversationId,
            message: {
              ...message.toJSON(),
              sender,
            },
          };

          this.emitToConversation(conversationId, 'message:new', data);

          const participants = await ChatParticipant.findAll({
            where: { conversationId, leftAt: null },
            attributes: ['userId'],
          });

          // Process delivery and fallback to Expo push if offline
          participants.forEach(async (participantItem) => {
            const recipientId = participantItem.userId;

            // Try WebSocket delivery first
            const isDelivered = this.emitToUser(recipientId, 'message:new', data);

            // If offline and not the sender → send push notification
            if (!isDelivered && recipientId !== userId) {
              const senderName = sender.firstName || sender.username || 'User';
              await this.sendExpoPushNotification(
                recipientId,
                senderName,
                content,
                conversationId,
              );
            }
          });

          // Acknowledge success to sender
          if (typeof ack === 'function') {
            ack({ ok: true, message: data.message });
          }
        } catch (error: any) {
          if (typeof ack === 'function') {
            ack({ ok: false, error: error?.message || 'Failed to send message' });
          }
        }
      });

      socket.on('disconnect', (reason) => {
        this.unregisterSocket(socket);
        console.log(`Socket disconnected: ${socket.id} (${reason})`);
      });

      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Send push notifications via Expo Push Service.
   *
   * This replaces the previous Firebase FCM implementation.
   * The expo_tokens table stores ExponentPushToken[…] strings (registered
   * by the React Native app via getExpoPushTokenAsync). The Expo Push Service
   * handles FCM/APNs routing internally, so no Firebase Admin SDK is needed
   * for this delivery path.
   */
  private async sendExpoPushNotification(
    recipientId: number,
    senderName: string,
    messageContent: string,
    conversationId: number,
  ): Promise<void> {
    try {
      const userTokens: any[] = await ExpoToken.findAll({
        where: { userId: recipientId },
      });

      if (!userTokens?.length) return;

      // Filter to valid Expo push tokens only
      const messages: ExpoPushMessage[] = userTokens
        .filter((t) => Expo.isExpoPushToken(t.token))
        .map((t) => ({
          to: t.token,
          title: `New message from ${senderName}`,
          body: messageContent,
          data: {
            type: 'chat',
            conversationId: String(conversationId),
            // NOTE: participant data is not included here because we don't
            // have the full participant object at this point. The AppNavigator
            // tap handler will fall back to the Messages screen when participant
            // is absent (see the navigation listener in AppNavigator.tsx).
          },
          sound: 'default' as const,
          priority: 'high' as const,
        }));

      if (!messages.length) {
        console.warn(`No valid Expo tokens for user ${recipientId}`);
        return;
      }

      // Expo SDK handles chunking automatically (max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        try {
          const tickets = await this.expo.sendPushNotificationsAsync(chunk);
          console.log(
            `Expo push sent to user ${recipientId}:`,
            tickets.map((t) => t.status).join(', '),
          );

          // Log any per-token errors (invalid tokens should be cleaned up)
          tickets.forEach((ticket, i) => {
            if (ticket.status === 'error') {
              console.error(
                `Expo push error for token ${messages[i]?.to}:`,
                ticket.message,
                ticket.details,
              );
            }
          });
        } catch (chunkError) {
          console.error('Expo push chunk error:', chunkError);
        }
      }
    } catch (error) {
      console.error('Error sending Expo push notification:', error);
    }
  }

  /**
   * Extract JWT from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake as any)?.auth?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

    const header = socket.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.substring('Bearer '.length).trim();
    }

    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  /**
   * Verify the extracted JWT using the public key
   */
  private verifyAccessToken(token: string): string | null {
    const publicKey = jwtConfig.access.publicKey;
    if (!publicKey) {
      return null;
    }

    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: [jwtConfig.access.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as any;

      if (decoded.type !== 'access') {
        return null;
      }

      return String(decoded.id);
    } catch {
      return null;
    }
  }

  /**
   * Register a user's socket connection
   */
  private registerSocket(socket: Socket, userId: string): void {
    const sockets = this.userSockets.get(userId) ?? new Set<Socket>();
    sockets.add(socket);
    this.userSockets.set(userId, sockets);
    this.socketToUser.set(socket.id, userId);

    socket.join(this.getUserRoom(userId));
    this.emitPresenceUpdate(userId, true);
  }

  /**
   * Unregister a user's socket connection on disconnect
   */
  private unregisterSocket(socket: Socket): void {
    const userId = this.socketToUser.get(socket.id) || (socket.data.userId ? String(socket.data.userId) : null);
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.emitPresenceUpdate(userId, false);
      }
    }

    this.socketToUser.delete(socket.id);
  }

  /**
   * Broadcast presence status updates
   */
  private emitPresenceUpdate(userId: string, online: boolean): void {
    const state: PresenceState = {
      online,
      lastSeen: online ? null : new Date(),
    };

    this.presence.set(userId, state);

    if (this.io) {
      this.io.to(this.getPresenceRoom(userId)).emit('presence:update', {
        userId,
        online,
        lastSeen: state.lastSeen,
      });
    }
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getConversationRoom(conversationId: number): string {
    return `conversation:${conversationId}`;
  }

  private getPresenceRoom(userId: string): string {
    return `presence:${userId}`;
  }

  /**
   * Emit email verified event to a specific user
   */
  emitEmailVerified(userId: string, userData: {
    id: string;
    email: string;
    isEmailVerified: boolean;
    firstName?: string;
  }): boolean {
    const normalizedUserId = String(userId);
    const payload = {
      success: true,
      message: 'Your email has been verified successfully!',
      user: userData,
    };

    return this.emitToUser(normalizedUserId, 'email_verified', payload);
  }

  /**
   * Emit a custom event to a specific user.
   * Returns true if delivered via WebSocket, false if the user is offline.
   */
  emitToUser(userId: string | number, event: string, data: any): boolean {
    const normalizedUserId = String(userId);
    const sockets = this.userSockets.get(normalizedUserId);

    if (!sockets || sockets.size === 0) {
      return false;
    }

    let delivered = false;
    sockets.forEach((socket) => {
      if (socket.connected) {
        socket.emit(event, data);
        delivered = true;
      }
    });

    return delivered;
  }

  /**
   * Emit a custom event to a conversation room
   */
  emitToConversation(conversationId: number, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(this.getConversationRoom(conversationId)).emit(event, data);
  }

  /**
   * Broadcast an event to all connected users
   */
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Check if a specific user currently has an active socket connection
   */
  isUserConnected(userId: string | number): boolean {
    const normalizedUserId = String(userId);
    const sockets = this.userSockets.get(normalizedUserId);
    if (!sockets || sockets.size === 0) return false;
    return Array.from(sockets).some((socket) => socket.connected);
  }

  /**
   * Retrieve the presence state for an array of users
   */
  getPresence(userIds: Array<string | number>): Array<{ userId: string; online: boolean; lastSeen: Date | null }> {
    return userIds.map((id) => {
      const normalized = String(id);
      const state = this.presence.get(normalized);
      return {
        userId: normalized,
        online: state?.online ?? this.isUserConnected(normalized),
        lastSeen: state?.lastSeen ?? null,
      };
    });
  }

  /**
   * Get the total count of currently connected users
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }
}

// Export a singleton instance of the service
export const socketService = new SocketService();