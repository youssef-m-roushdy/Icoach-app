import type { Request, Response, NextFunction } from 'express';
import ChatParticipant from '../models/sql/ChatParticipant.js';
import ChatConversation from '../models/sql/ChatConversation.js';
import User from '../models/sql/User.js';
import { Op, Sequelize } from 'sequelize';
import { AppError, NotFoundError, ConflictError } from '../utils/errors.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'owner' | 'admin' | 'member';
  };
}

/**
 * Get all chat participants for the authenticated user
 * with optional filtering and pagination
 */
export const getChatParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const {
      page = 1,
      limit = 20,
      conversationId,
      role,
      isActive,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {};

    // Filter by conversation
    if (conversationId) {
      where.conversationId = parseInt(conversationId as string, 10);
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by active status (leftAt null = active)
    if (isActive !== undefined) {
      const isActiveBool = isActive === 'true';
      if (isActiveBool) {
        where.leftAt = null;
      } else {
        where.leftAt = { [Op.ne]: null };
      }
    }

    // Search by user (through include)
    const include: any[] = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        required: true,
      },
      {
        model: ChatConversation,
        as: 'conversation',
        attributes: ['id', 'name', 'type', 'isArchived'],
        required: conversationId ? true : false,
      },
    ];

    // Add search filter if provided
    if (search) {
      include[0].where = {
        [Op.or]: [
          { email: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const { count, rows } = await ChatParticipant.findAndCountAll({
      where,
      include,
      limit: limitNum,
      offset,
      order: [
        ['role', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      distinct: true,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single chat participant by ID
 */
export const getChatParticipantById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const chatParticipant = await ChatParticipant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'bio'],
        },
        {
          model: ChatConversation,
          as: 'conversation',
          attributes: ['id', 'name', 'type', 'isArchived', 'createdAt'],
        },
      ],
    });

    if (!chatParticipant) {
      throw new NotFoundError('Chat participant not found');
    }

    // Check if user has access (they can view their own participation or if they're admin of the conversation)
    const isOwner = chatParticipant.userId === user.id;
    const isAdmin = chatParticipant.role === 'admin' || chatParticipant.role === 'owner';

    if (!isOwner && !isAdmin) {
      // Check if user is admin of the conversation
      const userParticipation = await ChatParticipant.findOne({
        where: {
          conversationId: chatParticipant.conversationId,
          userId: user.id,
          role: { [Op.in]: ['admin', 'owner'] },
        },
      });

      if (!userParticipation) {
        throw new AppError('You do not have permission to view this participant', 403);
      }
    }

    res.status(200).json({
      success: true,
      data: chatParticipant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new chat participant (Add Member)
 * Permission: Only Admin & Owner can add members
 */
export const createChatParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const {
      conversationId,
      userId: targetUserId,
      role = 'member',
    } = req.body;

    // Verify conversation exists
    const conversation = await ChatConversation.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // ✅ Permission: Only Admin & Owner can add members
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId: user.id,
        role: { [Op.in]: ['admin', 'owner'] },
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You do not have permission to add participants to this conversation', 403);
    }

    // Verify target user exists
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Check if user is already a participant
    const existingParticipant = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId: targetUserId,
        leftAt: null,
      },
    });

    if (existingParticipant) {
      throw new ConflictError('User is already a participant in this conversation');
    }

    // Check if user was previously a participant (left or deleted)
    const previousParticipant = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId: targetUserId,
        leftAt: { [Op.ne]: null },
      },
    });

    let chatParticipant;
    if (previousParticipant) {
      // Reactivate the participant
      chatParticipant = await previousParticipant.update({
        leftAt: null,
        role: role || 'member',
        lastReadAt: new Date(),
      });
    } else {
      // Create new participant
      chatParticipant = await ChatParticipant.create({
        conversationId,
        userId: targetUserId,
        role: role || 'member',
        lastReadAt: new Date(),
      });
    }

    // Fetch the created participant with details
    const participantWithDetails = await ChatParticipant.findByPk(chatParticipant.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        },
        {
          model: ChatConversation,
          as: 'conversation',
          attributes: ['id', 'name', 'type'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Participant added successfully',
      data: participantWithDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a chat participant (Role Management)
 * Permission: Only Owner can promote/demote roles
 */
export const updateChatParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role, lastReadAt } = req.body;

    const chatParticipant = await ChatParticipant.findByPk(id);

    if (!chatParticipant) {
      throw new NotFoundError('Chat participant not found');
    }

    // Permission checks
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId: chatParticipant.conversationId,
        userId: user.id,
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    // Check if user is updating their own record or is admin/owner
    const isSelf = user.id === chatParticipant.userId;
    const isAdmin = userParticipation.role === 'admin' || userParticipation.role === 'owner';
    const isOwner = userParticipation.role === 'owner';

    // ✅ Role changes require owner permission only
    if (role && !isOwner) {
      throw new AppError('Only the conversation owner can change roles', 403);
    }

    // ✅ Cannot change owner role unless you're the owner
    if (role === 'owner' && !isOwner) {
      throw new AppError('Only the conversation owner can assign owner role', 403);
    }

    // ✅ Cannot demote owner unless you're the owner
    if (chatParticipant.role === 'owner' && !isOwner) {
      throw new AppError('Only the conversation owner can change owner role', 403);
    }

    // ✅ Prevent demoting the only owner
    if (chatParticipant.role === 'owner' && role !== 'owner') {
      const ownerCount = await ChatParticipant.count({
        where: {
          conversationId: chatParticipant.conversationId,
          role: 'owner',
          leftAt: null,
        },
      });

      if (ownerCount <= 1) {
        throw new AppError('Cannot demote the only owner of the conversation', 400);
      }
    }

    // ✅ Only allow promoting to admin/owner
    if (role && !['member', 'admin', 'owner'].includes(role)) {
      throw new AppError('Invalid role. Must be member, admin, or owner', 400);
    }

    // Build update object
    const updateData: Partial<{ role: 'owner' | 'admin' | 'member'; lastReadAt: Date }> = {};

    if (role) {
      updateData.role = role;
    }

    if (lastReadAt !== undefined) {
      updateData.lastReadAt = lastReadAt;
    }

    await chatParticipant.update(updateData);

    // Fetch updated participant with details
    const updatedParticipant = await ChatParticipant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        },
        {
          model: ChatConversation,
          as: 'conversation',
          attributes: ['id', 'name', 'type'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Participant updated successfully',
      data: updatedParticipant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a participant from a conversation (soft delete - set leftAt)
 * Permission: 
 * - Members can remove themselves (leave group)
 * - Admin can remove members
 * - Owner can remove anyone except themselves (unless transferring ownership)
 */
export const removeChatParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const chatParticipant = await ChatParticipant.findByPk(id);

    if (!chatParticipant) {
      throw new NotFoundError('Chat participant not found');
    }

    // Check if user is already left
    if (chatParticipant.leftAt) {
      throw new AppError('Participant has already left the conversation', 400);
    }

    // Permission checks
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId: chatParticipant.conversationId,
        userId: user.id,
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    // Check permissions
    const isSelf = user.id === chatParticipant.userId;
    const isAdmin = userParticipation.role === 'admin' || userParticipation.role === 'owner';
    const isOwner = userParticipation.role === 'owner';

    // ✅ Members can only remove themselves
    // ✅ Admin can remove members (but not admins or owners)
    // ✅ Owner can remove anyone
    if (!isSelf && !isAdmin && !isOwner) {
      throw new AppError('You do not have permission to remove this participant', 403);
    }

    // ✅ Admin cannot remove other admins or owners
    if (!isSelf && isAdmin && !isOwner && chatParticipant.role !== 'member') {
      throw new AppError('Admins can only remove members', 403);
    }

    // ✅ Cannot remove the only owner
    if (chatParticipant.role === 'owner') {
      const ownerCount = await ChatParticipant.count({
        where: {
          conversationId: chatParticipant.conversationId,
          role: 'owner',
          leftAt: null,
        },
      });

      if (ownerCount <= 1) {
        throw new AppError('Cannot remove the only owner of the conversation', 400);
      }
    }

    // ✅ Cannot remove owner unless you're an owner yourself
    if (chatParticipant.role === 'owner' && !isOwner) {
      throw new AppError('Only the conversation owner can remove another owner', 403);
    }

    // ✅ If owner is leaving, transfer ownership first
    if (isSelf && chatParticipant.role === 'owner') {
      const ownerCount = await ChatParticipant.count({
        where: {
          conversationId: chatParticipant.conversationId,
          role: 'owner',
          leftAt: null,
          id: { [Op.ne]: chatParticipant.id },
        },
      });

      if (ownerCount === 0) {
        // Transfer ownership to the next admin or oldest member
        const nextAdmin = await ChatParticipant.findOne({
          where: {
            conversationId: chatParticipant.conversationId,
            role: 'admin',
            leftAt: null,
            id: { [Op.ne]: chatParticipant.id },
          },
          order: [['createdAt', 'ASC']],
        });

        if (nextAdmin) {
          await nextAdmin.update({ role: 'owner' });
        } else {
          // No admin, transfer to the oldest member
          const nextMember = await ChatParticipant.findOne({
            where: {
              conversationId: chatParticipant.conversationId,
              role: 'member',
              leftAt: null,
              id: { [Op.ne]: chatParticipant.id },
            },
            order: [['createdAt', 'ASC']],
          });

          if (nextMember) {
            await nextMember.update({ role: 'owner' });
          }
        }
      }
    }

    // Soft delete - set leftAt
    await chatParticipant.update({
      leftAt: new Date(),
    });

    // If user removed themselves, also clear lastReadAt
    if (isSelf) {
      await chatParticipant.update({
        lastReadAt: null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Participant removed from conversation successfully',
      data: {
        id: chatParticipant.id,
        userId: chatParticipant.userId,
        conversationId: chatParticipant.conversationId,
        leftAt: chatParticipant.leftAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Hard delete a chat participant (permanent deletion)
 * Permission: Only Owner can permanently delete participants
 */
export const deleteChatParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const chatParticipant = await ChatParticipant.findByPk(id);

    if (!chatParticipant) {
      throw new NotFoundError('Chat participant not found');
    }

    // ✅ Only owners can hard delete
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId: chatParticipant.conversationId,
        userId: user.id,
        role: 'owner',
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('Only conversation owners can permanently delete participants', 403);
    }

    // ✅ Cannot delete the only owner
    if (chatParticipant.role === 'owner') {
      const ownerCount = await ChatParticipant.count({
        where: {
          conversationId: chatParticipant.conversationId,
          role: 'owner',
          leftAt: null,
        },
      });

      if (ownerCount <= 1) {
        throw new AppError('Cannot delete the only owner of the conversation', 400);
      }
    }

    await chatParticipant.destroy();

    res.status(200).json({
      success: true,
      message: 'Participant permanently deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update last read timestamp for the current user in a conversation
 * Permission: Any participant can update their own lastRead
 */
export const updateLastRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    const chatParticipant = await ChatParticipant.findOne({
      where: {
        conversationId: parseInt(conversationId, 10),
        userId: user.id,
        leftAt: null,
      },
    });

    if (!chatParticipant) {
      throw new NotFoundError('You are not a participant in this conversation');
    }

    await chatParticipant.update({
      lastReadAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Last read timestamp updated successfully',
      data: {
        conversationId: parseInt(conversationId, 10),
        lastReadAt: chatParticipant.lastReadAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get participants by conversation ID with role filtering
 * Permission: Only participants can view other participants
 */
export const getParticipantsByConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    // ✅ Check if user is a participant
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId: parseInt(conversationId, 10),
        userId: user.id,
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const { role, active } = req.query;

    const where: any = {
      conversationId: parseInt(conversationId, 10),
    };

    if (role) {
      where.role = role;
    }

    if (active !== undefined) {
      const isActive = active === 'true';
      where.leftAt = isActive ? null : { [Op.ne]: null };
    }

    const participants = await ChatParticipant.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'isOnline'],
        },
      ],
      order: [
        ['role', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    // Group by role for easier frontend consumption
    const groupedParticipants = participants.reduce((acc: any, p) => {
      const roleKey = p.role;
      if (!acc[roleKey]) {
        acc[roleKey] = [];
      }
      acc[roleKey].push(p);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        participants,
        grouped: groupedParticipants,
        total: participants.length,
        active: participants.filter(p => !p.leftAt).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add participants to a conversation
 * Permission: Only Admin & Owner can add members
 */
export const bulkAddParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const { conversationId, userIds, role = 'member' } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('At least one user ID is required', 400);
    }

    // Verify conversation exists
    const conversation = await ChatConversation.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // ✅ Only Admin & Owner can add participants
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId: user.id,
        role: { [Op.in]: ['admin', 'owner'] },
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You do not have permission to add participants to this conversation', 403);
    }

    // Verify all users exist
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
    });

    if (users.length !== userIds.length) {
      throw new AppError('One or more users not found', 404);
    }

    const results = {
      added: [] as any[],
      alreadyActive: [] as number[],
      reactivated: [] as number[],
      failed: [] as any[],
    };

    for (const targetUserId of userIds) {
      try {
        // Check if user is already a participant
        const existingParticipant = await ChatParticipant.findOne({
          where: {
            conversationId,
            userId: targetUserId,
            leftAt: null,
          },
        });

        if (existingParticipant) {
          results.alreadyActive.push(targetUserId);
          continue;
        }

        // Check if user was previously a participant
        const previousParticipant = await ChatParticipant.findOne({
          where: {
            conversationId,
            userId: targetUserId,
            leftAt: { [Op.ne]: null },
          },
        });

        let participant;
        if (previousParticipant) {
          // Reactivate
          participant = await previousParticipant.update({
            leftAt: null,
            role: role || 'member',
            lastReadAt: new Date(),
          });
          results.reactivated.push(targetUserId);
        } else {
          // Create new
          participant = await ChatParticipant.create({
            conversationId,
            userId: targetUserId,
            role: role || 'member',
            lastReadAt: new Date(),
          });
          results.added.push(participant);
        }
      } catch (error) {
        results.failed.push({
          userId: targetUserId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Fetch all participants for the response
    const allParticipants = await ChatParticipant.findAll({
      where: {
        conversationId,
        leftAt: null,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        },
      ],
      order: [['role', 'ASC']],
    });

    res.status(201).json({
      success: true,
      message: 'Bulk participant operation completed',
      data: {
        participants: allParticipants,
        summary: {
          added: results.added.length,
          reactivated: results.reactivated.length,
          alreadyActive: results.alreadyActive.length,
          failed: results.failed.length,
        },
        details: results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get participant statistics for a conversation
 * Permission: Only participants can view stats
 */
export const getConversationParticipantStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    // ✅ Check if user is a participant
    const userParticipation = await ChatParticipant.findOne({
      where: {
        conversationId: parseInt(conversationId, 10),
        userId: user.id,
        leftAt: null,
      },
    });

    if (!userParticipation) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const stats = await ChatParticipant.findAll({
      where: {
        conversationId: parseInt(conversationId, 10),
      },
      attributes: [
        'role',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.fn('IF', Sequelize.col('left_at IS NULL'), 1, null)), 'active'],
        [Sequelize.fn('COUNT', Sequelize.fn('IF', Sequelize.col('left_at IS NOT NULL'), 1, null)), 'inactive'],
      ],
      group: ['role'],
      raw: true,
    });

    // Also get recent joins/leaves
    const recentActivity = await ChatParticipant.findAll({
      where: {
        conversationId: parseInt(conversationId, 10),
        [Op.or]: [
          { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { leftAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        roleStats: stats,
        recentActivity,
        totalParticipants: stats.reduce((sum: number, stat: any) => sum + parseInt(stat.total, 10), 0),
        activeParticipants: stats.reduce((sum: number, stat: any) => sum + parseInt(stat.active || 0, 10), 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer ownership to another participant
 * Permission: Only Owner can transfer ownership
 */
export const transferOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const conversationId = Array.isArray(req.params.conversationId)
      ? req.params.conversationId[0]
      : req.params.conversationId;

    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      throw new AppError('New owner ID is required', 400);
    }

    // ✅ Check if current user is the owner
    const currentOwner = await ChatParticipant.findOne({
      where: {
        conversationId: parseInt(conversationId, 10),
        userId: user.id,
        role: 'owner',
        leftAt: null,
      },
    });

    if (!currentOwner) {
      throw new AppError('Only the conversation owner can transfer ownership', 403);
    }

    // Check if new owner is a participant
    const newOwner = await ChatParticipant.findOne({
      where: {
        conversationId: parseInt(conversationId, 10),
        userId: parseInt(newOwnerId, 10),
        leftAt: null,
      },
    });

    if (!newOwner) {
      throw new NotFoundError('New owner must be an active participant in the conversation');
    }

    // ✅ Demote current owner to admin
    await currentOwner.update({ role: 'admin' });

    // ✅ Promote new owner
    await newOwner.update({ role: 'owner' });

    // Fetch updated participants
    const updatedParticipants = await ChatParticipant.findAll({
      where: {
        conversationId: parseInt(conversationId, 10),
        leftAt: null,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        },
      ],
      order: [['role', 'ASC']],
    });

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully',
      data: {
        conversationId: parseInt(conversationId, 10),
        previousOwner: {
          id: currentOwner.userId,
          role: 'admin',
        },
        newOwner: {
          id: newOwner.userId,
          role: 'owner',
        },
        participants: updatedParticipants,
      },
    });
  } catch (error) {
    next(error);
  }
};