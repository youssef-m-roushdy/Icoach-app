import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';
import { 
  WorkoutSessionSet, 
  WorkoutSession, 
  CreateWorkoutSessionSet 
} from './workoutSessionService';

// ============================================================================
// Set-Specific Types (only what's unique to sets endpoints)
// ============================================================================

export interface BulkCreateSetsData {
  sets: CreateWorkoutSessionSet[];
}

export interface UpdateSetData {
  reps?: number;
  weight?: number;
  is_completed?: boolean;
  rest_time_seconds?: number;
  notes?: string;
}

export interface BulkUpdateSetItem {
  id: number;
  reps?: number;
  weight?: number;
  is_completed?: boolean;
  rest_time_seconds?: number;
  notes?: string;
}

export interface BulkUpdateSetsData {
  sets: BulkUpdateSetItem[];
}

export interface ReorderSetsData {
  setOrder: number[];
}

export interface MarkSetCompletedData {
  completed_at?: string;
}

export interface SetStatistics {
  totalSets: number;
  completedSets: number;
  incompleteSets: number;
  totalReps: number;
  totalVolume: number;
  maxWeight: number;
  averageWeight: number;
  averageReps: number;
  maxReps: number;
  bodyweightOnly: boolean;
  completionRate: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface GetSetsResponse {
  success: boolean;
  data?: WorkoutSessionSet[];
  message?: string;
}

export interface GetSetResponse {
  success: boolean;
  data?: WorkoutSessionSet;
  message?: string;
}

export interface CreateSetResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
  };
}

export interface BulkCreateSetsResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
    addedSets: WorkoutSessionSet[];
  };
}

export interface UpdateSetResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
  };
}

export interface BulkUpdateSetsResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
    updatedSets: WorkoutSessionSet[];
  };
}

export interface DeleteSetResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
  };
}

export interface ReorderSetsResponse {
  success: boolean;
  message?: string;
  data?: {
    session: WorkoutSession;
    sets: WorkoutSessionSet[];
  };
}

export interface SetStatisticsResponse {
  success: boolean;
  data?: SetStatistics;
  message?: string;
}

// ============================================================================
// Service
// ============================================================================

export const workoutSessionSetService = {
  /**
   * Get all sets for a workout session
   * GET /api/v1/workout-sessions/{sessionId}/sets
   */
  async getSessionSets(
    sessionId: number,
    token: string,
    params?: {
      completed?: boolean;
      limit?: number;
    }
  ): Promise<GetSetsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<GetSetsResponse>(
          `/v1/workout-sessions/${sessionId}/sets`,
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
   * Get set statistics for a workout session
   * GET /api/v1/workout-sessions/{sessionId}/sets/stats
   */
  async getSetStatistics(
    sessionId: number,
    token: string
  ): Promise<SetStatisticsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<SetStatisticsResponse>(
          `/v1/workout-sessions/${sessionId}/sets/stats`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },

  /**
   * Get a single set by ID
   * GET /api/v1/workout-sessions/{sessionId}/sets/{setId}
   */
  async getSetById(
    sessionId: number,
    setId: number,
    token: string
  ): Promise<GetSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<GetSetResponse>(
          `/v1/workout-sessions/${sessionId}/sets/${setId}`,
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },

  /**
   * Add a single set to a workout session
   * POST /api/v1/workout-sessions/{sessionId}/sets
   */
  async addSet(
    sessionId: number,
    data: CreateWorkoutSessionSet,
    token: string
  ): Promise<CreateSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<CreateSetResponse>(
          `/v1/workout-sessions/${sessionId}/sets`,
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
   * Add multiple sets to a workout session
   * POST /api/v1/workout-sessions/{sessionId}/sets/bulk
   */
  async bulkAddSets(
    sessionId: number,
    data: BulkCreateSetsData,
    token: string
  ): Promise<BulkCreateSetsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<BulkCreateSetsResponse>(
          `/v1/workout-sessions/${sessionId}/sets/bulk`,
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
   * Update a specific set
   * PUT /api/v1/workout-sessions/{sessionId}/sets/{setId}
   */
  async updateSet(
    sessionId: number,
    setId: number,
    data: UpdateSetData,
    token: string
  ): Promise<UpdateSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<UpdateSetResponse>(
          `/v1/workout-sessions/${sessionId}/sets/${setId}`,
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },

  /**
   * Mark a set as completed
   * PATCH /api/v1/workout-sessions/{sessionId}/sets/{setId}/complete
   */
  async markSetCompleted(
    sessionId: number,
    setId: number,
    data: MarkSetCompletedData = {},
    token: string
  ): Promise<UpdateSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<UpdateSetResponse>(
          `/v1/workout-sessions/${sessionId}/sets/${setId}/complete`,
          {
            method: 'PATCH',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },

  /**
   * Update multiple sets at once
   * PUT /api/v1/workout-sessions/{sessionId}/sets/bulk
   */
  async bulkUpdateSets(
    sessionId: number,
    data: BulkUpdateSetsData,
    token: string
  ): Promise<BulkUpdateSetsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<BulkUpdateSetsResponse>(
          `/v1/workout-sessions/${sessionId}/sets/bulk`,
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },

  /**
   * Reorder sets in a session
   * PUT /api/v1/workout-sessions/{sessionId}/sets/reorder
   */
  async reorderSets(
    sessionId: number,
    data: ReorderSetsData,
    token: string
  ): Promise<ReorderSetsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<ReorderSetsResponse>(
          `/v1/workout-sessions/${sessionId}/sets/reorder`,
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(data),
          }
        ),
      token
    );
  },

  /**
   * Delete a specific set
   * DELETE /api/v1/workout-sessions/{sessionId}/sets/{setId}
   */
  async deleteSet(
    sessionId: number,
    setId: number,
    token: string
  ): Promise<DeleteSetResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<DeleteSetResponse>(
          `/v1/workout-sessions/${sessionId}/sets/${setId}`,
          {
            method: 'DELETE',
            headers: createJsonHeaders(accessToken),
          }
        ),
      token
    );
  },
};