import { API_BASE_URL, apiCallWithRefresh } from './api';

export interface CreateWorkoutSessionData {
  workoutId: number;
  duration: number;
  sets: number;
  reps: number;
  weight: number;
  volume?: number;
  notes?: string;
  completedAt?: string;
}

export interface WorkoutSession {
  id: number;
  userId: number;
  workoutId: number;
  duration: number;
  volume: number;
  sets: number;
  reps: number;
  weight: number;
  completedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workout?: {
    id: number;
    name: string;
    body_part: string;
    target_area: string;
    gif_link: string;
  };
}

export interface WorkoutSessionStats {
  summary: {
    totalSessions: number;
    totalDuration: number;
    totalVolume: number;
    averageDuration: number;
    averageVolume: number;
  };
  chartData: Array<{
    date: string;
    sessions: number;
    duration: number;
    volume: number;
  }>;
}

export const workoutSessionService = {
  /**
   * Get all workout sessions for the user
   */
  async getWorkoutSessions(
    token: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      workoutId?: number;
      minDuration?: number;
      minVolume?: number;
    }
  ): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/v1/workout-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get workout sessions');
      }

      return result;
    }, token);
  },

  /**
   * Get workout session by ID
   */
  async getWorkoutSessionById(sessionId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workout-sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get workout session');
      }

      return result;
    }, token);
  },

  /**
   * Create a new workout session
   */
  async createWorkoutSession(data: CreateWorkoutSessionData, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workout-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create workout session');
      }

      return result;
    }, token);
  },

  /**
   * Update a workout session
   */
  async updateWorkoutSession(sessionId: number, data: Partial<CreateWorkoutSessionData>, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workout-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update workout session');
      }

      return result;
    }, token);
  },

  /**
   * Delete a workout session
   */
  async deleteWorkoutSession(sessionId: number, token: string): Promise<any> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workout-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete workout session');
      }

      return result;
    }, token);
  },

  /**
   * Get workout session statistics
   */
  async getWorkoutStats(token: string, days: number = 30): Promise<{ success: boolean; data: WorkoutSessionStats }> {
    return apiCallWithRefresh(async (accessToken) => {
      const response = await fetch(`${API_BASE_URL}/v1/workout-sessions/stats?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get workout stats');
      }

      return result;
    }, token);
  },
};