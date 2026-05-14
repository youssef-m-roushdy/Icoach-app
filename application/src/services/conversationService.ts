import { apiCallWithRefresh, createJsonHeaders, request } from './api';

export interface ConversationEntity {
  id: number;
  isGroup: boolean;
  title?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  id: number;
  userId: number;
  role: 'member' | 'admin';
  lastReadAt?: string | null;
  user?: UserSummary;
}

export interface UserSummary {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  isActive?: boolean;
  lastReadAt?: string | null;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  editedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: UserSummary;
}

export interface ConversationListItem {
  conversation: ConversationEntity;
  participants: UserSummary[];
  lastMessage?: ConversationMessage | null;
  lastReadAt?: string | null;
  unreadCount?: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConversationListResponse {
  success: boolean;
  message?: string;
  data?: {
    conversations: ConversationListItem[];
    pagination: PaginationInfo;
  };
}

export interface ConversationResponse {
  success: boolean;
  message?: string;
  data?: {
    conversation: ConversationEntity;
    participants: ConversationParticipant[];
  };
}

export interface MessageListResponse {
  success: boolean;
  message?: string;
  data?: ConversationMessage[];
}

export interface MessageResponse {
  success: boolean;
  message?: string;
  data?: ConversationMessage;
}

export interface MarkReadResponse {
  success: boolean;
  message?: string;
  data?: {
    conversationId: number;
    lastReadAt: string;
  };
}

export interface PresenceState {
  userId: string;
  online: boolean;
  lastSeen: string | null;
}

export interface PresenceResponse {
  success: boolean;
  message?: string;
  data?: PresenceState[];
}

export interface UserSearchResponse {
  success: boolean;
  message?: string;
  data?: UserSummary[];
}

export const conversationService = {
  async listConversations(token: string, page: number = 1, limit: number = 20): Promise<ConversationListResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<ConversationListResponse>(
          '/v1/conversations',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          { page, limit }
        ),
      token
    );
  },

  async createConversation(token: string, participantId: number): Promise<ConversationResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<ConversationResponse>('/v1/conversations', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify({ participantId }),
        }),
      token
    );
  },

  async getMessages(
    token: string,
    conversationId: number,
    options?: { limit?: number; before?: string }
  ): Promise<MessageListResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<MessageListResponse>(
          `/v1/conversations/${conversationId}/messages`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          {
            limit: options?.limit,
            before: options?.before,
          }
        ),
      token
    );
  },

  async sendMessage(token: string, conversationId: number, content: string): Promise<MessageResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<MessageResponse>(
          `/v1/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify({ content }),
          }
        ),
      token
    );
  },

  async markRead(token: string, conversationId: number, lastReadAt?: string): Promise<MarkReadResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<MarkReadResponse>(
          `/v1/conversations/${conversationId}/read`,
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify({ lastReadAt }),
          }
        ),
      token
    );
  },

  async getPresence(token: string, userIds: Array<string | number>): Promise<PresenceResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<PresenceResponse>(
          '/v1/presence',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          { userIds: userIds.join(',') }
        ),
      token
    );
  },

  async searchUsers(token: string, query: string, limit: number = 10): Promise<UserSearchResponse> {
    return apiCallWithRefresh(
      (accessToken) =>
        request<UserSearchResponse>(
          '/v1/users/search',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          { q: query, limit }
        ),
      token
    );
  },
};
