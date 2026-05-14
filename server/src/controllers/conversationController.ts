import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import {
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  User,
} from '../models/sql/index.js';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { socketService } from '../services/socketService.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const USER_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'avatar', 'isActive'];

const parseLimit = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

const ensureParticipant = async (conversationId: number, userId: number) => {
  const participant = await ChatParticipant.findOne({
    where: {
      conversationId,
      userId,
      leftAt: null,
    },
  });

  if (!participant) {
    throw new ForbiddenError('You are not a participant in this conversation');
  }

  return participant;
};

const findExistingDirectConversation = async (
  userId: number,
  otherUserId: number
): Promise<ChatConversation | null> => {
  const userConversations = await ChatParticipant.findAll({
    where: { userId, leftAt: null },
    attributes: ['conversationId'],
    raw: true,
  });

  const otherConversations = await ChatParticipant.findAll({
    where: { userId: otherUserId, leftAt: null },
    attributes: ['conversationId'],
    raw: true,
  });

  const userIds = new Set(userConversations.map((row: any) => row.conversationId));
  const commonIds = otherConversations
    .map((row: any) => row.conversationId)
    .filter((id: number) => userIds.has(id));

  if (commonIds.length === 0) return null;

  return ChatConversation.findOne({
    where: {
      id: commonIds,
      isGroup: false,
    },
  });
};

export const createConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const participantId = Number(req.body.participantId);
    if (!participantId || Number.isNaN(participantId)) {
      throw new AppError('participantId is required', 400);
    }

    if (participantId === user.id) {
      throw new AppError('Cannot create a conversation with yourself', 400);
    }

    const otherUser = await User.findByPk(participantId, { attributes: USER_ATTRIBUTES });
    if (!otherUser) {
      throw new NotFoundError('User not found');
    }

    const existing = await findExistingDirectConversation(user.id, participantId);
    if (existing) {
      const participants = await ChatParticipant.findAll({
        where: { conversationId: existing.id, leftAt: null },
        include: [{ model: User, as: 'user', attributes: USER_ATTRIBUTES }],
      });

      res.status(200).json({
        success: true,
        message: 'Conversation already exists',
        data: {
          conversation: existing,
          participants,
        },
      });
      return;
    }

    const conversation = await ChatConversation.create({
      createdBy: user.id,
      isGroup: false,
      title: null,
    });

    await ChatParticipant.bulkCreate([
      {
        conversationId: conversation.id,
        userId: user.id,
        role: 'admin',
      },
      {
        conversationId: conversation.id,
        userId: participantId,
        role: 'member',
      },
    ]);

    const participants = await ChatParticipant.findAll({
      where: { conversationId: conversation.id, leftAt: null },
      include: [{ model: User, as: 'user', attributes: USER_ATTRIBUTES }],
    });

    socketService.emitToUser(participantId, 'conversation:new', {
      conversation,
      participants,
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversation,
        participants,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const rawPage = Number(req.query.page || 1);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = parseLimit(req.query.limit, 20);
    const offset = (page - 1) * limit;

    const participantRows = await ChatParticipant.findAll({
      where: { userId: user.id, leftAt: null },
      attributes: ['conversationId', 'lastReadAt'],
      raw: true,
    });

    const conversationIds = participantRows.map((row: any) => row.conversationId);
    if (conversationIds.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No conversations found',
        data: {
          conversations: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        },
      });
      return;
    }

    const { count, rows } = await ChatConversation.findAndCountAll({
      where: { id: conversationIds },
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: { leftAt: null },
          required: false,
          include: [{ model: User, as: 'user', attributes: USER_ATTRIBUTES }],
        },
      ],
      distinct: true,
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });

    const lastMessages = await Promise.all(
      rows.map(async (conversation) => {
        const lastMessage = await ChatMessage.findOne({
          where: { conversationId: conversation.id },
          order: [['createdAt', 'DESC']],
        });
        return { conversationId: conversation.id, lastMessage };
      })
    );

    const lastReadMap = new Map<number, Date | null>();
    participantRows.forEach((row: any) => {
      lastReadMap.set(row.conversationId, row.lastReadAt || null);
    });

    const lastMessageMap = new Map<number, ChatMessage | null>();
    lastMessages.forEach((entry) => {
      lastMessageMap.set(entry.conversationId, entry.lastMessage || null);
    });

    const unreadCounts = await Promise.all(
      rows.map(async (conversation) => {
        const lastReadAt = lastReadMap.get(conversation.id) || null;
        const where: any = {
          conversationId: conversation.id,
          senderId: { [Op.ne]: user.id },
        };

        if (lastReadAt) {
          where.createdAt = { [Op.gt]: lastReadAt };
        }

        const count = await ChatMessage.count({ where });
        return { conversationId: conversation.id, count };
      })
    );

    const unreadCountMap = new Map<number, number>();
    unreadCounts.forEach((entry) => {
      unreadCountMap.set(entry.conversationId, entry.count);
    });

    const conversations = rows.map((conversation) => {
      const participants = (conversation as any).participants || [];
      const otherParticipants = participants
        .map((participant: any) => {
          const userData = participant.user ? (typeof participant.user.toJSON === 'function' ? participant.user.toJSON() : participant.user) : null;
          if (userData) {
            userData.lastReadAt = participant.lastReadAt;
          }
          return userData;
        })
        .filter((participant: any) => participant?.id !== user.id);

      return {
        conversation,
        participants: otherParticipants,
        lastMessage: lastMessageMap.get(conversation.id) || null,
        lastReadAt: lastReadMap.get(conversation.id) || null,
        unreadCount: unreadCountMap.get(conversation.id) || 0,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Number(req.params.id);
    if (Number.isNaN(conversationId)) {
      throw new AppError('Invalid conversation id', 400);
    }

    await ensureParticipant(conversationId, user.id);

    const limit = parseLimit(req.query.limit, 50);
    const before = req.query.before ? new Date(req.query.before as string) : null;

    const where: any = { conversationId };
    if (before && !Number.isNaN(before.getTime())) {
      where.createdAt = { [Op.lt]: before };
    }

    const messages = await ChatMessage.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: messages.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Number(req.params.id);
    if (Number.isNaN(conversationId)) {
      throw new AppError('Invalid conversation id', 400);
    }

    await ensureParticipant(conversationId, user.id);

    const content = String(req.body.content || '').trim();
    if (!content) {
      throw new AppError('Message content is required', 400);
    }

    const message = await ChatMessage.create({
      conversationId,
      senderId: user.id,
      content,
    });

    await ChatConversation.update(
      { updatedAt: new Date() },
      { where: { id: conversationId } }
    );

    const sender = await User.findByPk(user.id, { attributes: USER_ATTRIBUTES });

    const payload = {
      conversationId,
      message: {
        ...message.toJSON(),
        sender,
      },
    };

    socketService.emitToConversation(conversationId, 'message:new', payload);

    const participants = await ChatParticipant.findAll({
      where: { conversationId, leftAt: null },
      attributes: ['userId'],
    });

    const senderName =
      sender?.firstName || sender?.username || sender?.lastName || 'User';

    for (const participant of participants) {
      const recipientId = participant.userId;
      if (recipientId === user.id) continue;

      const isDelivered = socketService.emitToUser(recipientId, 'message:new', payload);

      if (isDelivered) {
        socketService.emitMessageStatus(user.id, {
          conversationId,
          messageId: message.id,
          recipientId,
          status: 'delivered',
        });
        continue;
      }

      const status = await socketService.sendChatPushNotification(
        recipientId,
        senderName,
        content,
        conversationId,
      );

      socketService.emitMessageStatus(user.id, {
        conversationId,
        messageId: message.id,
        recipientId,
        status,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: payload.message,
    });
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Number(req.params.id);
    if (Number.isNaN(conversationId)) {
      throw new AppError('Invalid conversation id', 400);
    }

    const participant = await ensureParticipant(conversationId, user.id);

    const lastReadAt = req.body?.lastReadAt ? new Date(req.body.lastReadAt) : new Date();
    if (Number.isNaN(lastReadAt.getTime())) {
      throw new AppError('Invalid lastReadAt date', 400);
    }

    await participant.update({ lastReadAt });

    socketService.emitToConversation(conversationId, 'message:read', {
      conversationId,
      userId: user.id,
      lastReadAt,
    });

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
      data: { conversationId, lastReadAt },
    });
  } catch (error) {
    next(error);
  }
};
