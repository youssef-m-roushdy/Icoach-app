import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

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

export interface WorkoutSessionsResponse {
  success: boolean;
  message?: string;
  data?: WorkoutSession[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WorkoutSessionResponse {
  success: boolean;
  message?: string;
  data?: WorkoutSession;
}

export interface WorkoutSessionStatsResponse {
  success: boolean;
  message?: string;
  data?: WorkoutSessionStats;
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
  ): Promise<WorkoutSessionsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionsResponse>(
          '/v1/workout-sessions',
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
   * Get workout session by ID
   */
  async getWorkoutSessionById(
    sessionId: number,
    token: string
  ): Promise<WorkoutSessionResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionResponse>(`/v1/workout-sessions/${sessionId}`, {
          method: 'GET',
          headers: createJsonHeaders(accessToken),
        }),
      token
    );
  },

  /**
   * Create a new workout session
   */
  async createWorkoutSession(
    data: CreateWorkoutSessionData,
    token: string
  ): Promise<WorkoutSessionResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionResponse>('/v1/workout-sessions', {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Update a workout session
   */
  async updateWorkoutSession(
    sessionId: number,
    data: Partial<CreateWorkoutSessionData>,
    token: string
  ): Promise<WorkoutSessionResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionResponse>(`/v1/workout-sessions/${sessionId}`, {
          method: 'PUT',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Delete a workout session
   */
  async deleteWorkoutSession(
    sessionId: number,
    token: string
  ): Promise<{ success: boolean; message?: string }> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<{ success: boolean; message?: string }>(
          `/v1/workout-sessions/${sessionId}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },

  /**
   * Get workout session statistics
   */
  async getWorkoutStats(
    token: string,
    days: number = 30
  ): Promise<WorkoutSessionStatsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionStatsResponse>(
          '/v1/workout-sessions/stats',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          { days }
        ),
      token
    );
  },
};