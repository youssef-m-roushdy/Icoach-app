import { apiCallWithRefresh, createJsonHeaders, request } from './api';

// ============================================================================
// Core Types
// ============================================================================

export type ChatParticipantRole = 'member' | 'admin' | 'owner';

export interface ChatParticipantUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio?: string | null;
}

export interface ChatParticipantConversation {
  id: number;
  title: string | null;
  isGroup: boolean;
  createdAt?: string;
}

export interface ChatParticipant {
  id: number;
  conversationId: number;
  userId: number;
  role: ChatParticipantRole;
  lastReadAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: ChatParticipantUser;
  conversation?: ChatParticipantConversation;
}

export interface CreateChatParticipantData {
  conversationId: number;
  userId: number;
  role?: Extract<ChatParticipantRole, 'member' | 'admin'>;
}

export interface UpdateChatParticipantData {
  role?: ChatParticipantRole;
  lastReadAt?: string;
}

export interface BulkAddParticipantsData {
  conversationId: number;
  userIds: number[];
  role?: Extract<ChatParticipantRole, 'member' | 'admin'>;
}

export interface BulkAddParticipantsResult {
  participants: ChatParticipant[];
  summary: {
    added: number;
    reactivated: number;
    alreadyActive: number;
    failed: number;
  };
  details: {
    added: ChatParticipant[];
    alreadyActive: number[];
    reactivated: number[];
    failed: Array<{ userId: number; error: string }>;
  };
}

export interface ConversationParticipantRoleStat {
  role: ChatParticipantRole;
  total: string | number;
  active: string | number;
  inactive: string | number;
}

export interface ConversationParticipantStats {
  roleStats: ConversationParticipantRoleStat[];
  recentActivity: ChatParticipant[];
  totalParticipants: number;
  activeParticipants: number;
}

export interface TransferOwnershipData {
  newOwnerId: number;
}

export interface TransferOwnershipResult {
  conversationId: number;
  previousOwner: { id: number; role: 'admin' };
  newOwner: { id: number; role: 'owner' };
  participants: ChatParticipant[];
}

export interface ParticipantsByConversationResult {
  participants: ChatParticipant[];
  grouped: Partial<Record<ChatParticipantRole, ChatParticipant[]>>;
  total: number;
  active: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ChatParticipantsResponse {
  success: boolean;
  message?: string;
  data?: ChatParticipant[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ChatParticipantResponse {
  success: boolean;
  message?: string;
  data?: ChatParticipant;
}

export interface BulkAddParticipantsResponse {
  success: boolean;
  message?: string;
  data?: BulkAddParticipantsResult;
}

export interface ConversationParticipantStatsResponse {
  success: boolean;
  message?: string;
  data?: ConversationParticipantStats;
}

export interface TransferOwnershipResponse {
  success: boolean;
  message?: string;
  data?: TransferOwnershipResult;
}

export interface ParticipantsByConversationResponse {
  success: boolean;
  message?: string;
  data?: ParticipantsByConversationResult;
}

export interface RemoveParticipantResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    userId: number;
    conversationId: number;
    leftAt: string | null;
    conversationDeleted?: boolean;
  };
}

// ============================================================================
// Service
// ============================================================================

export const chatParticipantService = {
  /**
   * Get all chat participants (paginated, filterable)
   * GET /api/v1/chat-participants
   */
  async getChatParticipants(
    token: string,
    params?: {
      page?: number;
      limit?: number;
      conversationId?: number;
      role?: ChatParticipantRole;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<ChatParticipantsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ChatParticipantsResponse>(
          '/v1/chat-participants',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params
        ),
      token
    );
  },

  /**
   * Get a single chat participant by ID
   * GET /api/v1/chat-participants/{id}
   */
  async getChatParticipantById(
    participantId: number,
    token: string
  ): Promise<ChatParticipantResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ChatParticipantResponse>(`/v1/chat-participants/${participantId}`, {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  /**
   * Add a participant to a conversation
   * POST /api/v1/chat-participants
   */
  async createChatParticipant(
    data: CreateChatParticipantData,
    token: string
  ): Promise<ChatParticipantResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ChatParticipantResponse>('/v1/chat-participants', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Update a chat participant (role change, owner only; or your own lastReadAt)
   * PUT /api/v1/chat-participants/{id}
   */
  async updateChatParticipant(
    participantId: number,
    data: UpdateChatParticipantData,
    token: string
  ): Promise<ChatParticipantResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ChatParticipantResponse>(`/v1/chat-participants/${participantId}`, {
          method: 'PUT',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Leave a conversation / remove a participant (soft delete - sets leftAt)
   * PATCH /api/v1/chat-participants/{id}/leave
   */
  async removeChatParticipant(
    participantId: number,
    token: string
  ): Promise<RemoveParticipantResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<RemoveParticipantResponse>(`/v1/chat-participants/${participantId}/leave`, {
          method: 'PATCH',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  /**
   * Permanently delete a participant (owner only)
   * DELETE /api/v1/chat-participants/{id}
   */
  async deleteChatParticipant(
    participantId: number,
    token: string
  ): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<{ success: boolean; message?: string }>(
          `/v1/chat-participants/${participantId}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },

  /**
   * Update last-read timestamp for the current user in a conversation
   * PATCH /api/v1/chat-participants/conversations/{conversationId}/read
   */
  async updateLastRead(
    conversationId: number,
    token: string
  ): Promise<{ success: boolean; message?: string; data?: { conversationId: number; lastReadAt: string } }> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<{
          success: boolean;
          message?: string;
          data?: { conversationId: number; lastReadAt: string };
        }>(`/v1/chat-participants/conversations/${conversationId}/read`, {
          method: 'PATCH',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  /**
   * Get participants for a specific conversation, grouped by role
   * GET /api/v1/chat-participants/conversations/{conversationId}
   */
  async getParticipantsByConversation(
    conversationId: number,
    token: string,
    params?: {
      role?: ChatParticipantRole;
      active?: boolean;
    }
  ): Promise<ParticipantsByConversationResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ParticipantsByConversationResponse>(
          `/v1/chat-participants/conversations/${conversationId}`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params
        ),
      token
    );
  },

  /**
   * Bulk add participants to a conversation (max 50 per request)
   * POST /api/v1/chat-participants/bulk
   */
  async bulkAddParticipants(
    data: BulkAddParticipantsData,
    token: string
  ): Promise<BulkAddParticipantsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<BulkAddParticipantsResponse>('/v1/chat-participants/bulk', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Get participant statistics for a conversation
   * GET /api/v1/chat-participants/conversations/{conversationId}/stats
   */
  async getConversationParticipantStats(
    conversationId: number,
    token: string,
    params?: { days?: number }
  ): Promise<ConversationParticipantStatsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ConversationParticipantStatsResponse>(
          `/v1/chat-participants/conversations/${conversationId}/stats`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params
        ),
      token
    );
  },

  /**
   * Transfer conversation ownership to another active participant
   * POST /api/v1/chat-participants/conversations/{conversationId}/transfer-ownership
   */
  async transferOwnership(
    conversationId: number,
    data: TransferOwnershipData,
    token: string
  ): Promise<TransferOwnershipResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<TransferOwnershipResponse>(
          `/v1/chat-participants/conversations/${conversationId}/transfer-ownership`,
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },

  /**
   * Delete an entire conversation (group), owner only.
   *
   * NOTE: the controller exports `deleteConversation`, but the route file you
   * shared doesn't wire it up yet (no `router.delete('/conversations/:conversationId', ...)`).
   * This method assumes that route once added — update the path here if you
   * end up mounting it somewhere else.
   * DELETE /api/v1/chat-participants/conversations/{conversationId}
   */
  async deleteConversation(
    conversationId: number,
    token: string
  ): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<{ success: boolean; message?: string }>(
          `/v1/chat-participants/conversations/${conversationId}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },
};