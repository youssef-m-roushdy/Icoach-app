// API service for backend communication
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Global reference to auth refresh function (will be set by AuthContext)
let globalRefreshTokenFunction: (() => Promise<string | null>) | null = null;

export const setGlobalRefreshTokenFunction = (fn: () => Promise<string | null>) => {
  globalRefreshTokenFunction = fn;
};

// API wrapper with automatic token refresh
export const apiCallWithRefresh = async <T>(
  apiCall: (token: string) => Promise<T>,
  token: string,
  retryCount = 0
): Promise<T> => {
  try {
    return await apiCall(token);
  } catch (error: any) {
    // Check if it's an authentication error
    const isAuthError = 
      error?.message?.includes('expired') || 
      error?.message?.includes('Authentication') ||
      error?.message?.includes('token');
    
    // Only retry once with refreshed token
    if (isAuthError && retryCount === 0 && globalRefreshTokenFunction) {
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

interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: any;
    accessToken: string;
    refreshToken?: string;
  };
}

export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.log('Registration failed:', result);
        throw new Error(result.message || 'Registration failed');
      }
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  async logout(token: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/v1/users/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Token refresh failed');
      }
      
      return result;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  },

  // Forgot password
  // In your authService.ts
  async forgotPassword(email: string): Promise<{ success: boolean; message?: string; data?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result; // Return the full response
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Password reset failed');
      }
      
      return result; // Return the full response
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  // Google OAuth - Get the OAuth URL
  getGoogleOAuthUrl(): string {
    return `${API_BASE_URL}/v1/auth/google`;
  },
};

interface BodyInformationData {
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  fitnessGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  bodyFatPercentage?: number;
}

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatar?: string;
}

export const userService = {
  // Get user profile
  async getProfile(token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to get profile');
      }
      
      return result;
    }, token);
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }
      
      return result;
    }, token);
  },

  // Update body information
  async updateBodyInformation(data: BodyInformationData, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/body-information`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update body information');
      }
      
      return result;
    }, token);
  },

  async updateProfilePicture(avatarUri: string, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const formData = new FormData();
      const file = {
        uri: avatarUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      };
      // @ts-ignore - React Native handles file objects differently
      formData.append('avatar', file);
      const response = await fetch(`${API_BASE_URL}/v1/users/profile/avatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile picture');
      }
      return result;
    }, token);
  },

  async deleteProfilePicture(token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete profile picture');
      }
      return result;
    }, token);
  },

  async verifyEmail(verifyToken: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/verify-email/${encodeURIComponent(verifyToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify email');
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  async resendEmailVerification(email: string, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend verification email');
      }
      return result;
    }, token);
  },

  async changePassword(currentPassword: string, newPassword: string, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password');
      }
      return result;
    }, token);
  }
};

// Workout Service
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
    return apiCallWithRefresh(async (accessToken) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/v1/workouts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get workouts');
      }

      return result;
    }, token);
  },

  // Get workout by ID
  async getWorkoutById(workoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workouts/${workoutId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get workout');
      }

      return result;
    }, token);
  },

  // Get workout filters
  async getWorkoutFilters(token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workouts/filters`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get filters');
      }

      return result;
    }, token);
  },
};

// Food AI Service
const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL || 'http://localhost:8000';

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
  predicted_food: string;
  confidence: number;
  food_data: FoodData;
  message: string;
}

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

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.detail || `Server error: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Food prediction failed');
      }

      if (!data.food_data) {
        throw new Error('Food not found in database. Please try another image.');
      }
      
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to identify food. Please try again.');
    }
  },
};

// Saved Workouts Service
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
    return apiCallWithRefresh(async (accessToken) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/v1/saved-workouts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get saved workouts');
      }

      return result;
    }, token);
  },

  // Get saved workout by ID
  async getSavedWorkoutById(savedWorkoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/saved-workouts/${savedWorkoutId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get saved workout');
      }

      return result;
    }, token);
  },

  // Get saved workout filters
  async getSavedWorkoutFilters(token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/saved-workouts/filters`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get saved workout filters');
      }

      return result;
    }, token);
  },

  // Add workout to saved list
  async AddWorkoutToSaveList(workoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/saved-workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ workoutId: workoutId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save workout to saved list');
      }

      return result;
    }, token);
  },

  // delete saved workout
  async removeWorkoutFromSaveList(savedWorkoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/saved-workouts/${savedWorkoutId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to remove workout from saved list');
      }

      return result;
    }, token);
  },

  // Check if workout is in saved list
  async CheckWorkoutIsInSavedList(savedWorkoutId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/saved-workouts/check/${savedWorkoutId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to check workout in saved list');
      }

      return result;
    }, token);
  },
};