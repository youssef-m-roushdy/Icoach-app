import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

// ============================================================================
// Core Types
// ============================================================================

export interface WorkoutSessionSet {
  id: number;
  sessionId: number;
  reps: number;
  weight: number;
  isCompleted: boolean;
  completed_at: string | null;
  restTimeSeconds: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutSessionSet {
  reps: number;
  weight: number;
  isCompleted?: boolean;
  completed_at?: string;
  restTimeSeconds?: number;
  notes?: string;
}

export interface CreateWorkoutSessionData {
  workoutId: number;
  duration: number;
  completedAt?: string;
  notes?: string;
  sets: CreateWorkoutSessionSet[];
}

export interface UpdateWorkoutSessionSet {
  reps?: number;
  weight?: number;
  isCompleted?: boolean;
  restTimeSeconds?: number;
  notes?: string;
}

export interface UpdateWorkoutSessionData {
  workoutId?: number;
  duration?: number;
  completedAt?: string;
  notes?: string;
  sets?: UpdateWorkoutSessionSet[];
}

export interface WorkoutSessionWorkout {
  id: number;
  name: string;
  body_part: string;
  target_area: string;
  equipment: string;
  level: string;
  gif_link: string;
}

export interface WorkoutSession {
  id: number;
  userId: number;
  workoutId: number;
  duration: number;
  totalSets?: number;
  totalReps?: number;
  totalVolume?: number;
  maxWeight?: number;
  completedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workout?: WorkoutSessionWorkout;
  sets?: WorkoutSessionSet[];
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
  distribution?: {
    byBodyPart: Record<string, number>;
    byTargetArea: Record<string, number>;
  };
}

// ============================================================================
// Response Types
// ============================================================================

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

export interface AddSetResponse {
  success: boolean;
  message?: string;
  data?: WorkoutSessionSet;
}

// ============================================================================
// Service
// ============================================================================

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
      bodyPart?: string;
      targetArea?: string;
      workoutName?: string;
      minDuration?: number;
      minVolume?: number;
      minSets?: number;
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
    data: UpdateWorkoutSessionData,
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
    params?: {
      days?: number;
      includeDistribution?: boolean;
    }
  ): Promise<WorkoutSessionStatsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionStatsResponse>(
          '/v1/workout-sessions/stats',
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
   * Add a set to an existing workout session
   * POST /api/v1/workout-sessions/{id}/sets
   */
  async addSetToSession(
    sessionId: number,
    data: CreateWorkoutSessionSet,
    token: string
  ): Promise<AddSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<AddSetResponse>(`/v1/workout-sessions/${sessionId}/sets`, {
          method: 'POST',
          headers: createJsonHeaders(accessToken),
          body: JSON.stringify(data),
        }),
      token
    );
  },

  /**
   * Update only notes and duration for a workout session (lightweight patch)
   * PATCH /api/v1/workout-sessions/{id}/details
   */
  async patchWorkoutSessionDetails(
    sessionId: number,
    data: {
      notes?: string;
      duration?: number;
    },
    token: string
  ): Promise<WorkoutSessionResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<WorkoutSessionResponse>(
          `/v1/workout-sessions/${sessionId}/details`,
          {
            method: 'PATCH',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },
};