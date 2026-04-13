import type { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { ChatHistory } from '../models/sql/index.js';
import { sequelize } from '../config/database.js';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export class ChatHistoryController {
  /**
   * Create a new chat message
   */
  static async createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { role, content } = req.body;

      // Validate role
      if (!['user', 'assistant', 'system'].includes(role)) {
        throw new AppError('Invalid role. Must be user, assistant, or system', 400);
      }

      // Create chat message
      const message = await ChatHistory.create({
        userId: user.id,
        role,
        content,
      });

      res.status(201).json({
        success: true,
        message: 'Chat message saved successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat history for the authenticated user
   */
  static async getChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { 
        page = 1, 
        limit = 50, 
        role,
        startDate,
        endDate,
        search 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = { userId: user.id };

      // Filter by role
      if (role) {
        where.role = role;
      }

      // Filter by date range
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate as string);
        }
      }

      // Search in content (case-insensitive for PostgreSQL)
      if (search) {
        where.content = { [Op.iLike]: `%${search}%` };
      }

      const { count, rows } = await ChatHistory.findAndCountAll({
        where,
        limit: Number(limit),
        offset: offset,
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        success: true,
        message: 'Chat history retrieved successfully',
        data: {
          messages: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single chat message by ID
   */
  static async getMessageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;

      const message = await ChatHistory.findOne({
        where: {
          id: id,
          userId: user.id,
        },
      });

      if (!message) {
        throw new NotFoundError('Chat message not found');
      }

      res.status(200).json({
        success: true,
        message: 'Chat message retrieved successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a chat message (user messages only)
   */
  static async updateMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const { content } = req.body;

      const message = await ChatHistory.findOne({
        where: {
          id: id,
          userId: user.id,
        },
      });

      if (!message) {
        throw new NotFoundError('Chat message not found');
      }

      // Only allow updating user messages
      if (message.role !== 'user') {
        throw new ForbiddenError('Only user messages can be updated');
      }

      await message.update({ content });

      res.status(200).json({
        success: true,
        message: 'Chat message updated successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat message
   */
  static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;

      const message = await ChatHistory.findOne({
        where: {
          id: id,
          userId: user.id,
        },
      });

      if (!message) {
        throw new NotFoundError('Chat message not found');
      }

      await message.destroy();

      res.status(200).json({
        success: true,
        message: 'Chat message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all chat history for the authenticated user
   */
  static async clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { beforeDate } = req.query;

      const where: any = { userId: user.id };
      
      if (beforeDate) {
        where.createdAt = { [Op.lt]: new Date(beforeDate as string) };
      }

      const deletedCount = await ChatHistory.destroy({ where });

      res.status(200).json({
        success: true,
        message: 'Chat history cleared successfully',
        data: {
          deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversation context for AI (last N messages)
   */
  static async getConversationContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { limit = 20 } = req.query;

      const messages = await ChatHistory.findAll({
        where: { userId: user.id },
        limit: Number(limit),
        order: [['createdAt', 'DESC']],
        attributes: ['role', 'content'],
      });

      // Return in chronological order for AI context
      const context = messages.reverse();

      res.status(200).json({
        success: true,
        message: 'Conversation context retrieved successfully',
        data: context,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch create multiple messages (useful for saving entire conversations)
   */
  static async batchCreateMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const { messages } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        throw new AppError('Messages array is required', 400);
      }

      // Validate all messages
      for (const msg of messages) {
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          throw new AppError('Invalid role in messages. Must be user, assistant, or system', 400);
        }
        if (!msg.content) {
          throw new AppError('Content is required for all messages', 400);
        }
      }

      // Prepare messages with userId
      const messagesWithUserId = messages.map(msg => ({
        ...msg,
        userId: user.id,
      }));

      const createdMessages = await ChatHistory.bulkCreate(messagesWithUserId);

      res.status(201).json({
        success: true,
        message: 'Messages saved successfully',
        data: {
          count: createdMessages.length,
          messages: createdMessages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat statistics for the user
   */
  static async getChatStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      const stats = await ChatHistory.findAll({
        where: { userId: user.id },
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastMessageAt'],
        ],
        group: ['role'],
      });

      const totalMessages = stats.reduce((sum, stat) => sum + Number(stat.get('count')), 0);

      res.status(200).json({
        success: true,
        message: 'Chat statistics retrieved successfully',
        data: {
          totalMessages,
          breakdown: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}