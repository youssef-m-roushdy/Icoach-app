// ===============================
// API configuration
// ===============================
import type { User } from '../types';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const AI_API_URL =
  process.env.EXPO_PUBLIC_AI_API_URL || 'http://localhost:8000';

// ===============================
// Global refresh token handler
// ===============================
let globalRefreshTokenFunction: (() => Promise<string | null>) | null = null;

export const setGlobalRefreshTokenFunction = (
  fn: () => Promise<string | null>
) => {
  globalRefreshTokenFunction = fn;
};

// ===============================
// API Error class
// ===============================
export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ===============================
// Helpers
// ===============================
const safeParseJson = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const buildUrl = (
  base: string,
  path: string,
  query?: Record<string, any>
): string => {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, any>,
  baseUrl: string = API_BASE_URL
): Promise<T> => {
  const url = buildUrl(baseUrl, path, query);

  const response = await fetch(url, options);
  const result = await safeParseJson(response);

  if (!response.ok) {
    throw new ApiError(
      result?.message ||
        result?.error ||
        result?.detail ||
        `Request failed with status ${response.status}`,
      response.status,
      result
    );
  }

  return result as T;
};

const createJsonHeaders = (token?: string): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// ===============================
// API wrapper with token refresh
// ===============================
export const apiCallWithRefresh = async <T>(
  apiCall: (token: string) => Promise<T>,
  token: string,
  retryCount = 0
): Promise<T> => {
  try {
    return await apiCall(token);
  } catch (error: unknown) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      retryCount === 0 &&
      globalRefreshTokenFunction
    ) {
      console.log('Token expired, attempting refresh...');
      const newToken = await globalRefreshTokenFunction();

      if (newToken) {
        console.log('Token refreshed successfully, retrying request...');
        return await apiCallWithRefresh(apiCall, newToken, retryCount + 1);
      }
    }

    throw error;
  }
};

// ===============================
// Shared types
// ===============================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export type UserEntity = User;
export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: UserEntity;
    accessToken: string;
    refreshToken?: string;
  };
}

export interface BodyInformationData {
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  fitnessGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  activityLevel?:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active';
  bodyFatPercentage?: number;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatar?: string;
}

export interface FoodData {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar: number;
  pic: string;
}

export interface FoodPredictionResponse {
  success: boolean;
  predicted_food?: string;
  confidence?: number;
  food_data?: FoodData | null;
  message?: string;
  suggestions?: string[];
}

export interface WorkoutFiltersResponse {
  success: boolean;
  message?: string;
  data?: {
    bodyParts?: string[];
    levels?: string[];
    targetAreas?: string[];
    equipment?: string[];
  };
}

// ===============================
// Auth Service
// ===============================
export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    return request<AuthResponse>('/v1/users/register', {
      method: 'POST',
      headers: createJsonHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return request<AuthResponse>('/v1/users/login', {
      method: 'POST',
      headers: createJsonHeaders(),
      body: JSON.stringify(credentials),
    });
  },

  // Logout user
  // Best-effort: even if request fails, local logout can still continue
  async logout(token: string): Promise<void> {
    try {
      await request('/v1/users/logout', {
        method: 'POST',
        headers: createJsonHeaders(token),
      });
    } catch (error) {
      console.error('Logout request failed, continuing local logout:', error);
    }
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return request<AuthResponse>('/v1/users/refresh-token', {
      method: 'POST',
      headers: createJsonHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
  },

  // Forgot password
  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message?: string; data?: string }> {
    return request('/v1/users/forgot-password', {
      method: 'POST',
      headers: createJsonHeaders(),
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; data?: any }> {
    return request('/v1/users/reset-password', {
      method: 'POST',
      headers: createJsonHeaders(),
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // Google OAuth - Get the OAuth URL
  getGoogleOAuthUrl(): string {
    return `${API_BASE_URL}/v1/auth/google`;
  },
};

// ===============================
// User Service
// ===============================
export const userService = {
  // Get user profile
  async getProfile(token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/profile', {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/profile', {
          method: 'PUT',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  // Update body information
  async updateBodyInformation(
    data: BodyInformationData,
    token: string
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/body-information', {
          method: 'PUT',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  async updateProfilePicture(avatarUri: string, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const formData = new FormData();
        const file = {
          uri: avatarUri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        };

        // @ts-ignore - React Native handles file objects differently
        formData.append('avatar', file);

        return request('/v1/users/profile/avatar', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
      },
      token
    );
  },

  async deleteProfilePicture(token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/profile/avatar', {
          method: 'DELETE',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  async verifyEmail(verifyToken: string, token: string): Promise<any> {
    return request(
      `/v1/users/verify-email/${encodeURIComponent(verifyToken)}`,
      {
        method: 'GET',
        headers: createJsonHeaders(token),
      }
    );
  },

  async resendEmailVerification(email: string, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/resend-verification', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify({ email }),
        }),
      token
    );
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    token: string
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/users/change-password', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify({ currentPassword, newPassword }),
        }),
      token
    );
  },
};

// ===============================
// Workout Service
// ===============================
export const workoutService = {
  // Get workouts with filters and pagination
  async getWorkouts(
    token: string,
    params?: {
      page?: number;
      limit?: number;
      body_part?: string;
      target_area?: string;
      equipment?: string;
      level?: string;
      search?: string;
    }
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(
          '/v1/workouts',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params
        ),
      token
    );
  },

  // Get workout by ID
  async getWorkoutById(workoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(`/v1/workouts/${workoutId}`, {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Get workout filters
  async getWorkoutFilters(token: string): Promise<WorkoutFiltersResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutFiltersResponse>('/v1/workouts/filters', {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },
};

// ===============================
// Food AI Service
// ===============================
export const foodService = {
  // Predict food from image
  async predictFood(imageUri: string): Promise<FoodPredictionResponse> {
    try {
      const formData = new FormData();

      const file = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food.jpg',
      };

      // @ts-ignore - React Native handles file objects differently
      formData.append('file', file);

      const response = await fetch(`${AI_API_URL}/api/food/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await safeParseJson(response);

      if (!response.ok) {
        throw new ApiError(
          data?.detail ||
            data?.message ||
            `Food prediction request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      // هنا بنرجع الداتا حتى لو success = false
      // علشان الشاشة تقدر تتعامل مع no-result أو suggestions بدون throw
      return (data || {
        success: false,
        message: 'Invalid response from AI service',
      }) as FoodPredictionResponse;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error?.message || 'Failed to identify food. Please try again.'
      );
    }
  },
};

// ===============================
// Saved Workouts Service
// ===============================
export const savedWorkoutService = {
  // Get saved workouts with filters and pagination
  async getSavedWorkouts(
    token: string,
    params?: {
      page?: number;
      limit?: number;
      bodyPart?: string;
      level?: string;
    }
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(
          '/v1/saved-workouts',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params
        ),
      token
    );
  },

  // Get saved workout by ID
  async getSavedWorkoutById(savedWorkoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(`/v1/saved-workouts/${savedWorkoutId}`, {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Get saved workout filters
  async getSavedWorkoutFilters(token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/saved-workouts/filters', {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Add workout to saved list
  async addWorkoutToSaveList(workoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request('/v1/saved-workouts', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify({ workoutId }),
        }),
      token
    );
  },

  // Backward-compatible alias (keep existing screens working)
  async AddWorkoutToSaveList(workoutId: number, token: string): Promise<any> {
    return this.addWorkoutToSaveList(workoutId, token);
  },

  // Delete saved workout
  async removeWorkoutFromSaveList(
    savedWorkoutId: number,
    token: string
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(`/v1/saved-workouts/${savedWorkoutId}`, {
          method: 'DELETE',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Check if workout is in saved list
  async checkWorkoutIsInSavedList(
    savedWorkoutId: number,
    token: string
  ): Promise<any> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request(`/v1/saved-workouts/check/${savedWorkoutId}`, {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  // Backward-compatible alias
  async CheckWorkoutIsInSavedList(
    savedWorkoutId: number,
    token: string
  ): Promise<any> {
    return this.checkWorkoutIsInSavedList(savedWorkoutId, token);
  },
};