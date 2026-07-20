import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import {
  Friendship,
  Post,
  PostLike,
  PostComment,
  Story,
  StoryView,
  User,
  Notification,
} from '../models/sql/index.js';
import { NotificationTypes } from '../models/sql/Notification.js';
import { FriendshipStatus } from '../models/sql/Friendship.js';
import { PostVisibility } from '../models/sql/Post.js';
import { AppError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import type { PostMedia, StoryMedia } from '../models/sql/index.js';
import type { PostVisibilityValue } from '../models/sql/Post.js';

const USER_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'avatar', 'isActive'];

interface PaginationInput {
  page?: number | string;
  limit?: number | string;
}

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function parsePagination(pagination: PaginationInput): { page: number; limit: number; offset: number } {
  const rawPage = Number(pagination.page || 1);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const rawLimit = Number(pagination.limit || 20);
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  if (userId1 === userId2) return true;

  const friendship = await Friendship.findOne({
    where: {
      status: FriendshipStatus.ACCEPTED,
      [Op.or]: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
    },
  });

  return !!friendship;
}

export class CommunityService {
  // ==================== FRIENDSHIPS ====================

  static async sendFriendRequest(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      throw new AppError('Cannot send friend request to yourself', 400);
    }

    const targetUser = await User.findByPk(targetUserId, { attributes: USER_ATTRIBUTES });
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    const [smallerId, largerId] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requesterId: smallerId, addresseeId: largerId },
          { requesterId: largerId, addresseeId: smallerId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenError('Unable to send friend request');
      }
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictError('You are already friends with this user');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requesterId === userId) {
          throw new ConflictError('Friend request already sent');
        }

        // The other user already sent a request; auto-accept
        await existing.update({ status: FriendshipStatus.ACCEPTED });
        return { friendship: existing, targetUser, accepted: true };
      }
    }

    const friendship = await Friendship.create({
      requesterId: userId,
      addresseeId: targetUserId,
      status: FriendshipStatus.PENDING,
    });

    // Create notification for recipient
    const sender = await User.findByPk(userId, { attributes: USER_ATTRIBUTES });
    await Notification.createNotification(
      targetUserId,
      NotificationTypes.FRIEND_REQUEST,
      `${sender?.firstName || sender?.username || 'Someone'} sent you a friend request`,
      { requesterId: userId, friendshipId: friendship.id }
    );

    return { friendship, targetUser, accepted: false };
  }

  static async acceptFriendRequest(userId: number, friendshipId: number) {
    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      throw new NotFoundError('Friend request not found');
    }

    if (friendship.addresseeId !== userId) {
      throw new ForbiddenError('Only the request recipient can accept this request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new ConflictError('Friend request is no longer pending');
    }

    await friendship.update({ status: FriendshipStatus.ACCEPTED });

    const requester = await User.findByPk(friendship.requesterId, { attributes: USER_ATTRIBUTES });
    const recipient = await User.findByPk(userId, { attributes: USER_ATTRIBUTES });

    await Notification.createNotification(
      friendship.requesterId,
      NotificationTypes.FRIEND_ACCEPT,
      `${recipient?.firstName || recipient?.username || 'Someone'} accepted your friend request`,
      { recipientId: userId, friendshipId: friendship.id }
    );

    return { friendship, requester, recipient };
  }

  static async declineOrCancelFriendRequest(userId: number, friendshipId: number) {
    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      throw new NotFoundError('Friend request not found');
    }

    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenError('You are not part of this friend request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new ConflictError('Friend request is no longer pending');
    }

    await friendship.destroy();
    return { success: true };
  }

  static async removeFriend(userId: number, friendId: number) {
    const friendship = await Friendship.findOne({
      where: {
        status: FriendshipStatus.ACCEPTED,
        [Op.or]: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundError('Friendship not found');
    }

    await friendship.destroy();
    return { success: true };
  }

  static async getFriends(userId: number, pagination: PaginationInput): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = parsePagination(pagination);

    const { count, rows } = await Friendship.findAndCountAll({
      where: {
        status: FriendshipStatus.ACCEPTED,
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
      },
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });

    const friendIds = rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
    const friends = await User.findAll({
      where: { id: friendIds },
      attributes: USER_ATTRIBUTES,
    });

    const friendMap = new Map(friends.map((u) => [u.id, u]));
    const items = rows.map((friendship) => {
      const friendId = friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;
      return {
        friendshipId: friendship.id,
        friend: friendMap.get(friendId) || { id: friendId },
        since: friendship.updatedAt,
      };
    });

    return {
      items,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async getPendingRequests(userId: number): Promise<{ sent: any[]; received: any[] }> {
    const [sentRows, receivedRows] = await Promise.all([
      Friendship.findAll({
        where: { requesterId: userId, status: FriendshipStatus.PENDING },
        include: [{ model: User, as: 'addressee', attributes: USER_ATTRIBUTES }],
        order: [['createdAt', 'DESC']],
      }),
      Friendship.findAll({
        where: { addresseeId: userId, status: FriendshipStatus.PENDING },
        include: [{ model: User, as: 'requester', attributes: USER_ATTRIBUTES }],
        order: [['createdAt', 'DESC']],
      }),
    ]);

    return { sent: sentRows, received: receivedRows };
  }

  static async getFriendshipStatus(userId: number, otherUserId: number) {
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return { status: 'none' };
    }

    const direction = friendship.requesterId === userId ? 'sent' : 'received';
    return { status: friendship.status, direction, friendshipId: friendship.id };
  }

  static async getSuggestedFriends(userId: number, pagination: PaginationInput): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = parsePagination(pagination);

    // Get existing friend IDs and pending requests to exclude
    const existingRelations = await Friendship.findAll({
      where: {
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
        status: { [Op.in]: [FriendshipStatus.PENDING, FriendshipStatus.ACCEPTED] },
      },
      attributes: ['requesterId', 'addresseeId'],
      raw: true,
    });

    const excludeIds = new Set<number>([userId]);
    existingRelations.forEach((row: any) => {
      const other = row.requester_id === userId ? row.addressee_id : row.requester_id;
      excludeIds.add(other);
    });

    const { count, rows } = await User.findAndCountAll({
      where: {
        id: { [Op.notIn]: Array.from(excludeIds) },
        isActive: true,
      },
      attributes: USER_ATTRIBUTES,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  // ==================== POSTS ====================

  static async createPost(userId: number, data: {
    content?: string;
    media?: PostMedia[];
    visibility?: string;
    location?: string;
  }) {
    const visibility: PostVisibilityValue = Object.values(PostVisibility).includes(
      data.visibility as PostVisibilityValue
    )
      ? (data.visibility as PostVisibilityValue)
      : PostVisibility.PUBLIC;

    const post = await Post.create({
      userId,
      content: data.content || null,
      media: data.media || [],
      visibility,
      location: data.location || null,
    });

    return post;
  }

  static async getFeed(userId: number, pagination: PaginationInput): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = parsePagination(pagination);

    // Get friend IDs
    const friendships = await Friendship.findAll({
      where: {
        status: FriendshipStatus.ACCEPTED,
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
      },
      attributes: ['requesterId', 'addresseeId'],
      raw: true,
    });

    const friendIds = friendships.map((f: any) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Visible posts:
    // - Own posts
    // - Public posts from anyone
    // - Friends-only posts from friends
    const where: WhereOptions<any> = {
      isDeleted: false,
      [Op.or]: [
        { userId },
        { visibility: PostVisibility.PUBLIC },
        { visibility: PostVisibility.FRIENDS, userId: { [Op.in]: friendIds } },
      ],
    };

    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const posts = await this.enrichPosts(rows, userId);

    return {
      items: posts,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async getUserPosts(
    viewerId: number,
    targetUserId: number,
    pagination: PaginationInput
  ): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = parsePagination(pagination);

    const isOwn = viewerId === targetUserId;
    const friends = isOwn ? true : await areFriends(viewerId, targetUserId);

    const where: WhereOptions<any> = {
      userId: targetUserId,
      isDeleted: false,
    };

    if (!isOwn) {
      if (friends) {
        where.visibility = { [Op.in]: [PostVisibility.PUBLIC, PostVisibility.FRIENDS] };
      } else {
        where.visibility = PostVisibility.PUBLIC;
      }
    }

    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const posts = await this.enrichPosts(rows, viewerId);

    return {
      items: posts,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async getPostById(postId: number, viewerId: number) {
    const post = await Post.findOne({
      where: { id: postId, isDeleted: false },
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const canView = await this.canViewPost(post, viewerId);
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view this post');
    }

    const [enriched] = await this.enrichPosts([post], viewerId);
    return enriched;
  }

  static async canViewPost(post: Post, viewerId: number): Promise<boolean> {
    if (post.userId === viewerId) return true;
    if (post.visibility === PostVisibility.PUBLIC) return true;
    if (post.visibility === PostVisibility.FRIENDS) {
      return areFriends(post.userId, viewerId);
    }
    return false;
  }

  static async enrichPosts(posts: Post[], viewerId: number): Promise<any[]> {
    const likedSet = await this.getUserLikeSet(posts.map((p) => p.id), viewerId);

    return posts.map((post) => ({
      ...post.toJSON(),
      isLiked: likedSet.has(post.id),
    }));
  }

  static async getUserLikeSet(postIds: number[], userId: number): Promise<Set<number>> {
    if (postIds.length === 0) return new Set();

    const likes = await PostLike.findAll({
      where: { postId: postIds, userId },
      attributes: ['postId'],
      raw: true,
    });

    return new Set(likes.map((l: any) => l.post_id));
  }

  static async deletePost(userId: number, postId: number) {
    const post = await Post.findByPk(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await post.update({ isDeleted: true, deletedAt: new Date() });
    return { success: true };
  }

  static async likePost(userId: number, postId: number) {
    const post = await Post.findByPk(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    const canView = await this.canViewPost(post, userId);
    if (!canView) {
      throw new ForbiddenError('You do not have permission to interact with this post');
    }

    const [like, created] = await PostLike.findOrCreate({
      where: { postId, userId },
      defaults: { postId, userId },
    });

    if (created) {
      await post.increment('likeCount');

      if (post.userId !== userId) {
        const liker = await User.findByPk(userId, { attributes: USER_ATTRIBUTES });
        await Notification.createNotification(
          post.userId,
          NotificationTypes.LIKE,
          `${liker?.firstName || liker?.username || 'Someone'} liked your post`,
          { postId, userId }
        );
      }
    }

    return { like, created };
  }

  static async unlikePost(userId: number, postId: number) {
    const deleted = await PostLike.destroy({ where: { postId, userId } });

    if (deleted > 0) {
      await Post.decrement('likeCount', { where: { id: postId } });
    }

    return { success: deleted > 0 };
  }

  static async commentOnPost(userId: number, postId: number, content: string) {
    const post = await Post.findByPk(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    const canView = await this.canViewPost(post, userId);
    if (!canView) {
      throw new ForbiddenError('You do not have permission to interact with this post');
    }

    const comment = await PostComment.create({ postId, userId, content });
    await post.increment('commentCount');

    if (post.userId !== userId) {
      const commenter = await User.findByPk(userId, { attributes: USER_ATTRIBUTES });
      await Notification.createNotification(
        post.userId,
        NotificationTypes.COMMENT,
        `${commenter?.firstName || commenter?.username || 'Someone'} commented on your post`,
        { postId, commentId: comment.id, userId }
      );
    }

    return comment;
  }

  static async getPostComments(postId: number, pagination: PaginationInput): Promise<PaginatedResult<any>> {
    const { page, limit, offset } = parsePagination(pagination);

    const { count, rows } = await PostComment.findAndCountAll({
      where: { postId, isDeleted: false },
      include: [{ model: User, as: 'user', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async deleteComment(userId: number, commentId: number) {
    const comment = await PostComment.findByPk(commentId);
    if (!comment || comment.isDeleted) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await comment.update({ isDeleted: true, deletedAt: new Date() });
    await Post.decrement('commentCount', { where: { id: comment.postId } });

    return { success: true };
  }

  // ==================== STORIES ====================

  static async createStory(userId: number, data: {
    media: StoryMedia;
    caption?: string;
    backgroundColor?: string;
    duration?: number;
  }) {
    const story = await Story.create({
      userId,
      media: data.media,
      caption: data.caption || null,
      backgroundColor: data.backgroundColor || null,
      duration: data.duration ?? 15,
    });

    return story;
  }

  static async getActiveStories(userId: number) {
    const now = new Date();

    const friendships = await Friendship.findAll({
      where: {
        status: FriendshipStatus.ACCEPTED,
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
      },
      attributes: ['requesterId', 'addresseeId'],
      raw: true,
    });

    const authorIds = [userId, ...friendships.map((f: any) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    )];

    const stories = await Story.findAll({
      where: {
        userId: authorIds,
        expiresAt: { [Op.gt]: now },
        isDeleted: false,
      },
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
    });

    // Deduplicate by user, keeping only latest story per user for previews
    const seenUsers = new Set<number>();
    const grouped: any[] = [];

    for (const story of stories) {
      const authorId = story.userId;
      if (!seenUsers.has(authorId)) {
        seenUsers.add(authorId);
        grouped.push({
          userId: authorId,
          user: (story as any).author,
          stories: stories.filter((s) => s.userId === authorId),
        });
      }
    }

    return grouped;
  }

  static async getStory(userId: number, storyId: number) {
    const now = new Date();

    const story = await Story.findOne({
      where: { id: storyId, isDeleted: false, expiresAt: { [Op.gt]: now } },
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
    });

    if (!story) {
      throw new NotFoundError('Story not found or expired');
    }

    const canView = story.userId === userId || await areFriends(userId, story.userId);
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view this story');
    }

    return story;
  }

  static async viewStory(userId: number, storyId: number) {
    const story = await this.getStory(userId, storyId);

    const [view, created] = await StoryView.findOrCreate({
      where: { storyId, userId },
      defaults: { storyId, userId },
    });

    if (created && story.userId !== userId) {
      await story.increment('viewCount');
    }

    return { view, story };
  }

  static async deleteStory(userId: number, storyId: number) {
    const story = await Story.findByPk(storyId);
    if (!story || story.isDeleted) {
      throw new NotFoundError('Story not found');
    }

    if (story.userId !== userId) {
      throw new ForbiddenError('You can only delete your own stories');
    }

    await story.update({ isDeleted: true, deletedAt: new Date() });
    return { success: true };
  }
}

export default CommunityService;