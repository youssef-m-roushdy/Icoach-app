// services/chatService.ts

import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  content: string;
  session_id?: string;
}

export type StreamEvent =
  | { type: 'status'; message: string; session_id?: string }
  | { type: 'chunk'; text: string; session_id?: string }
  | { type: 'done'; session_id: string }
  | { type: 'error'; message: string; status?: number };

// Updated to match API response
export interface HistoryMessage {
  id: number;
  userId: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChatHistoryData {
  messages: HistoryMessage[];
  pagination: PaginationInfo;
}

export interface ChatHistoryResponse {
  success: boolean;
  message?: string;
  data?: ChatHistoryData;
}

export interface GetHistoryParams {
  page?: number;
  limit?: number;
  role?: 'user' | 'assistant';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface TokenUsageResponse {
  success: boolean;
  data?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// ============================================================================
// Internal: NDJSON stream reader
// ============================================================================

async function readNdjsonStream(
  response: Response,
  onEvent: (event: StreamEvent) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let lastSessionId = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          
          if (parsed.session_id) {
            lastSessionId = parsed.session_id;
          }

          if (parsed.status !== undefined) {
            onEvent({ 
              type: 'status', 
              message: parsed.status,
              session_id: parsed.session_id 
            });
          }
          
          if (parsed.reply !== undefined) {
            onEvent({ 
              type: 'chunk', 
              text: parsed.reply,
              session_id: parsed.session_id 
            });
          }
        } catch (parseError) {
          console.warn('Failed to parse NDJSON line:', trimmed, parseError);
        }
      }
    }

    const remaining = buffer.trim();
    if (remaining) {
      try {
        const parsed = JSON.parse(remaining);
        if (parsed.session_id) lastSessionId = parsed.session_id;
        if (parsed.reply !== undefined) {
          onEvent({ type: 'chunk', text: parsed.reply, session_id: parsed.session_id });
        }
        if (parsed.status !== undefined) {
          onEvent({ type: 'status', message: parsed.status, session_id: parsed.session_id });
        }
      } catch (parseError) {
        console.warn('Failed to parse final buffer:', remaining, parseError);
      }
    }
    
  } finally {
    reader.releaseLock();
  }

  onEvent({ type: 'done', session_id: lastSessionId });
  return lastSessionId;
}

// ============================================================================
// Internal: Parse buffered NDJSON text
// ============================================================================

async function parseBufferedNdjson(
  responseText: string,
  onEvent: (event: StreamEvent) => void
): Promise<string> {
  const lines = responseText.split('\n');
  let lastSessionId = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    try {
      const parsed = JSON.parse(trimmed);
      
      if (parsed.session_id) {
        lastSessionId = parsed.session_id;
      }
      
      if (parsed.status) {
        onEvent({ type: 'status', message: parsed.status, session_id: parsed.session_id });
      }
      
      if (parsed.reply !== undefined) {
        onEvent({ type: 'chunk', text: parsed.reply, session_id: parsed.session_id });
      }
    } catch (e) {
      console.warn('Failed to parse line:', trimmed);
    }
  }
  
  onEvent({ type: 'done', session_id: lastSessionId });
  return lastSessionId;
}

// ============================================================================
// Service
// ============================================================================

export const chatService = {
  /**
   * Send a message and stream the AI response token-by-token.
   */
  async sendMessage(
    content: string,
    token: string,
    onEvent: (event: StreamEvent) => void,
    sessionId?: string
  ): Promise<string> {
    console.log('📤 Sending message:', content.substring(0, 50) + '...');
    
    const body: ChatMessage = { content };
    if (sessionId) {
      body.session_id = sessionId;
      console.log('🔄 Session:', sessionId);
    }

    try {
      const url = `${API_BASE_URL}/v1/ai/chat`;
      console.log('📍 URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson, application/json, text/plain',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.text();
          console.error('❌ Error response:', errorData);
          
          if (response.status === 401) errorMessage = 'Session expired – please log in again.';
          else if (response.status === 429) errorMessage = 'Too many requests. Please wait.';
          else if (response.status === 400) errorMessage = 'Invalid request. Please try again.';
        } catch (parseErr) {}
        
        onEvent({ type: 'error', message: errorMessage, status: response.status });
        throw Object.assign(new Error(errorMessage), { status: response.status });
      }

      const contentType = response.headers.get('content-type') || '';
      
      // Try streaming first
      if (contentType.includes('application/x-ndjson') && response.body) {
        try {
          console.log('🔄 Attempting streaming mode...');
          return await readNdjsonStream(response, onEvent);
        } catch (streamError) {
          console.warn('Streaming failed, falling back to buffered mode:', streamError);
        }
      }
      
      // Buffered mode
      console.log('📦 Using buffered mode...');
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      return await parseBufferedNdjson(responseText, onEvent);
      
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      
      if (error.message === 'Network request failed' || error.name === 'TypeError') {
        onEvent({ 
          type: 'error', 
          message: 'Network error – check your connection.',
          status: 0
        });
      } else if (!error.status) {
        onEvent({ type: 'error', message: error.message || 'Unknown error occurred' });
      }
      
      throw error;
    }
  },

  /**
   * Get chat history with pagination and filters
   * 
   * @param token - JWT access token
   * @param params - Query parameters for filtering
   * @returns Chat history with messages and pagination
   */
  async getHistory(
    token: string,
    params?: GetHistoryParams
  ): Promise<ChatHistoryResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        
        if (params) {
          if (params.page) queryParams.page = params.page;
          if (params.limit) queryParams.limit = params.limit;
          if (params.role) queryParams.role = params.role;
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.search) queryParams.search = params.search;
        }
        
        console.log('📜 Fetching chat history with params:', queryParams);
        
        return request<ChatHistoryResponse>(
          '/v1/chat-history',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          queryParams
        );
      },
      token
    );
  },

  /**
   * Get chat history grouped by session
   * 
   * @param token - JWT access token
   * @returns Messages grouped by session_id
   */
  async getHistoryGroupedBySession(token: string): Promise<Map<string, HistoryMessage[]>> {
    const response = await this.getHistory(token, { limit: 100 });
    
    if (!response.success || !response.data?.messages) {
      return new Map();
    }
    
    const grouped = new Map<string, HistoryMessage[]>();
    
    for (const message of response.data.messages) {
      if (!grouped.has(message.session_id)) {
        grouped.set(message.session_id, []);
      }
      grouped.get(message.session_id)!.push(message);
    }
    
    return grouped;
  },

  /**
   * Get a specific chat session by ID
   */
  async getSession(
    token: string,
    sessionId: string
  ): Promise<HistoryMessage[]> {
    const response = await this.getHistory(token, { limit: 100 });
    
    if (!response.success || !response.data?.messages) {
      return [];
    }
    
    return response.data.messages.filter(msg => msg.session_id === sessionId);
  },

  /**
   * Clear chat history for the current user
   */
  async clearHistory(token: string): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🗑️ Clearing chat history');
        
        return request<{ success: boolean; message?: string }>(
          '/v1/chat-history/clear/all',
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        );
      },
      token
    );
  },

  /**
   * Delete a specific message
   */
  async deleteMessage(
    token: string,
    messageId: number
  ): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🗑️ Deleting message:', messageId);
        
        return request<{ success: boolean; message?: string }>(
          `/v1/chat-history/${messageId}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        );
      },
      token
    );
  },

  /**
   * Get token usage statistics
   */
  async getTokenUsage(token: string): Promise<TokenUsageResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('📊 Fetching token usage');
        
        return request<TokenUsageResponse>(
          '/v1/ai/chat/tokens/usage',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
      },
      token
    );
  },

  /**
   * Get chat context (for continuing conversations)
   */
  async getChatContext(
    token: string,
    sessionId?: string
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        if (sessionId) queryParams.session_id = sessionId;
        
        console.log('🔍 Fetching chat context' + (sessionId ? ` for session ${sessionId}` : ''));
        
        return request<any>(
          '/v1/chat-history/context',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          queryParams
        );
      },
      token
    );
  },

  /**
   * Get chat statistics
   */
  async getStats(token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('📊 Fetching chat statistics');
        
        return request<any>(
          '/v1/chat-history/stats',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
      },
      token
    );
  },

  /**
   * Batch save messages (for offline sync)
   */
  async batchSaveMessages(
    token: string,
    messages: Array<{ role: string; content: string; session_id?: string }>
  ): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💾 Batch saving', messages.length, 'messages');
        
        return request<{ success: boolean; message?: string }>(
          '/v1/chat-history/batch',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify({ messages }),
          }
        );
      },
      token
    );
  },
};

// ============================================================================
// Export types for convenience
// ============================================================================

export type { StreamEvent as ChatStreamEvent };
export type { TokenUsageResponse as TokenUsageResponseType };