import type { Request, Response, NextFunction } from 'express';
import { Notification, User, ExpoToken } from '../models/sql/index.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { Expo } from 'expo-server-sdk';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Initialize Expo SDK
const expo = new Expo();

/**
 * Get all notifications for authenticated user
 * GET /api/v1/notifications
 */
export const getUserNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = (page - 1) * limit;

    const type = req.query.type as string;
    const unreadOnly = req.query.unreadOnly as string;

    // Build where clause
    const where: any = {
      userId: user.id,
      isDeleted: false,
    };

    if (type) {
      where.type = type;
    }

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Add formatted time to each notification
    const formattedNotifications = notifications.map(notification => ({
      ...notification.toJSON(),
      formattedTime: notification.getFormattedTime(),
    }));

    const unreadCount = await Notification.getUnreadCount(user.id);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: formattedNotifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: offset + limit < count,
        hasPreviousPage: page > 1,
      },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread count for authenticated user
 * GET /api/v1/notifications/unread-count
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const unreadCount = await Notification.getUnreadCount(user.id);

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
export const getNotificationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const idParam = req.params.id;
    if (!idParam) {
      throw new AppError('Notification ID is required', 400);
    }

    const id = parseInt(idParam as string, 10);
    if (isNaN(id)) {
      throw new AppError('Valid notification ID is required', 400);
    }

    const notification = await Notification.findOne({
      where: {
        id,
        userId: user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const formattedNotification = {
      ...notification.toJSON(),
      formattedTime: notification.getFormattedTime(),
    };

    res.status(200).json({
      success: true,
      data: formattedNotification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const idParam = req.params.id;
    if (!idParam) {
      throw new AppError('Notification ID is required', 400);
    }

    const id = parseInt(idParam as string, 10);
    if (isNaN(id)) {
      throw new AppError('Valid notification ID is required', 400);
    }

    const notification = await Notification.findOne({
      where: {
        id,
        userId: user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/mark-all-read
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const affectedCount = await Notification.markAllAsRead(user.id);

    res.status(200).json({
      success: true,
      message: `${affectedCount} notifications marked as read`,
      data: {
        updatedCount: affectedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification (soft delete)
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const idParam = req.params.id;
    if (!idParam) {
      throw new AppError('Notification ID is required', 400);
    }

    const id = parseInt(idParam as string, 10);
    if (isNaN(id)) {
      throw new AppError('Valid notification ID is required', 400);
    }

    const notification = await Notification.findOne({
      where: {
        id,
        userId: user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await notification.softDelete();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all read notifications
 * DELETE /api/v1/notifications/delete-read
 */
export const deleteReadNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const affectedCount = await Notification.deleteAllRead(user.id);

    res.status(200).json({
      success: true,
      message: `${affectedCount} read notifications deleted successfully`,
      data: {
        deletedCount: affectedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a notification (internal use or admin)
 * POST /api/v1/notifications
 */
export const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, type, title, content, data } = req.body;

    if (!userId || !type || !title) {
      throw new AppError('userId, type, and title are required', 400);
    }

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const notification = await Notification.createNotification(
      userId,
      type,
      title,
      data,
      content
    );

    // Send push notification if user has Expo tokens
    try {
      const userTokens = await ExpoToken.findByUserId(userId);
      if (userTokens.length > 0) {
        const pushTokens = userTokens.map(t => t.token);
        const messages = pushTokens
          .filter(token => Expo.isExpoPushToken(token))
          .map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: content || title,
            data: { notificationId: notification.id, ...(data || {}) },
          }));

        if (messages.length > 0) {
          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
        }
      }
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError);
      // Don't fail the request if push fails
    }

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notifications by type
 * GET /api/v1/notifications/type/:type
 */
export const getNotificationsByType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const type = req.params.type as string;
    if (!type) {
      throw new AppError('Notification type is required', 400);
    }

    const limitParam = req.query.limit;
    const limit = limitParam ? parseInt(limitParam as string, 10) : 20;

    const notifications = await Notification.getByType(
      user.id,
      type,
      limit
    );

    const formattedNotifications = notifications.map(notification => ({
      ...notification.toJSON(),
      formattedTime: notification.getFormattedTime(),
    }));

    res.status(200).json({
      success: true,
      data: formattedNotifications,
      count: formattedNotifications.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send test notification (for debugging)
 * POST /api/v1/notifications/test
 */
export const sendTestNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { title = 'Test Notification', body = 'This is a test notification' } = req.body;

    // Create notification record
    const notification = await Notification.createNotification(
      user.id,
      'system',
      title,
      { test: true },
      body
    );

    let pushDelivered = false;

    // Send push notification
    try {
      const userTokens = await ExpoToken.findByUserId(user.id);
      if (userTokens.length > 0) {
        const pushTokens = userTokens.map(t => t.token);
        const messages = pushTokens
          .filter(token => Expo.isExpoPushToken(token))
          .map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: { notificationId: notification.id, test: true },
          }));

        if (messages.length > 0) {
          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
          pushDelivered = true;
        }
      }
    } catch (pushError) {
      console.error('Failed to send test push notification:', pushError);
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notificationId: notification.id,
        pushDelivered,
      },
    });
  } catch (error) {
    next(error);
  }
};