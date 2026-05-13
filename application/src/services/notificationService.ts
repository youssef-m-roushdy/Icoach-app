// services/notificationService.ts
import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

// ============================================================================
// Types matching your ExpoToken model
// ============================================================================

export interface ExpoToken {
  id: number;
  userId: number;
  token: string;
  provider?: 'expo' | 'fcm';
  deviceType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPushTokenData {
  token: string;
  deviceType?: 'ios' | 'android' | 'web';
  provider?: 'expo' | 'fcm';
}

export interface UpdatePushTokenData {
  token?: string;
  deviceType?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface GetExpoTokensResponse {
  success: boolean;
  data?: ExpoToken[];
  message?: string;
}

export interface RegisterExpoTokenResponse {
  success: boolean;
  data?: ExpoToken;
  message?: string;
}

export interface UpdateExpoTokenResponse {
  success: boolean;
  data?: ExpoToken;
  message?: string;
}

export interface DeleteExpoTokenResponse {
  success: boolean;
  message?: string;
}

// ============================================================================
// Service
// ============================================================================

export const notificationService = {
  /**
   * Register or update a push notification token
   * POST /api/v1/notifications/expo-tokens
   */
  async registerExpoToken(
    pushTokenData: RegisterPushTokenData,
    authToken: string
  ): Promise<RegisterExpoTokenResponse> {
    return apiCallWithRefresh(
      async (accessToken: string) =>
        request<RegisterExpoTokenResponse>(
          `/v1/notifications/expo-tokens`,
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(pushTokenData),
          }
        ),
      authToken
    );
  },

  /**
   * Get all expo tokens for the authenticated user
   * GET /api/v1/notifications/expo-tokens
   */
  async getUserExpoTokens(
    authToken: string
  ): Promise<GetExpoTokensResponse> {
    return apiCallWithRefresh(
      async (accessToken: string) =>
        request<GetExpoTokensResponse>(
          `/v1/notifications/expo-tokens`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        ),
      authToken
    );
  },

  /**
   * Delete a specific expo token
   * DELETE /api/v1/notifications/expo-tokens/{expoPushToken}
   */
  async removeExpoToken(
    expoPushToken: string,
    authToken: string
  ): Promise<DeleteExpoTokenResponse> {
    return apiCallWithRefresh(
      async (accessToken: string) =>
        request<DeleteExpoTokenResponse>(
          `/v1/notifications/expo-tokens/${encodeURIComponent(expoPushToken)}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        ),
      authToken
    );
  },

  /**
   * Update device type for a token
   * PUT /api/v1/notifications/expo-tokens/{expoPushToken}
   */
  async updateExpoToken(
    expoPushToken: string,
    updateData: UpdatePushTokenData,
    authToken: string
  ): Promise<UpdateExpoTokenResponse> {
    return apiCallWithRefresh(
      async (accessToken: string) =>
        request<UpdateExpoTokenResponse>(
          `/v1/notifications/expo-tokens/${encodeURIComponent(expoPushToken)}`,
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(updateData),
          }
        ),
      authToken
    );
  },
};