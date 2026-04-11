import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

export interface DailyActiveData {
  id: string;
  userId: string;
  date: string;
  steps: number;
  goal: number;
  isCompleted: boolean;
  completedAt: string | null;
  pointsEarned: number;
  streakDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyActiveSyncRequest {
  steps: number;
  date: string;
}

export interface DailyActiveSyncResponse {
  success: boolean;
  message?: string;
  data?: {
    dailyActive: DailyActiveData;
    pointsAdded: number;
    newTotalPoints: number;
    streakMaintained: boolean;
    goalAchieved: boolean;
  };
}

export interface DailyActiveStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    today: DailyActiveData | null;
    currentStreak: number;
    longestStreak: number;
    totalDaysCompleted: number;
    totalSteps: number;
    averageDailySteps: number;
    weeklyData: Array<{
      date: string;
      steps: number;
      completed: boolean;
    }>;
    monthlyData: Array<{
      date: string;
      steps: number;
      completed: boolean;
    }>;
  };
}

export interface DailyActiveHistoryResponse {
  success: boolean;
  message?: string;
  data?: DailyActiveData[];
  meta?: {
    totalDays: number;
    startDate: string;
    endDate: string;
  };
}

export interface DailyActiveGoalUpdateRequest {
  goal: number;
}

export interface DailyActiveGoalUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    dailyActive: DailyActiveData & {
      progress: number;
      remaining: number;
    };
    newGoal: number;
    goalAchieved: boolean;
  };
}

export interface DailyActiveGoalResponse {
  success: boolean;
  data?: {
    goal: number;
  };
}

export interface DailyActiveWeeklySummaryResponse {
  success: boolean;
  data?: {
    totalSteps: number;
    completedDays: number;
    averageSteps: number;
  };
}

export interface DailyActivePointsResponse {
  success: boolean;
  data?: {
    totalPoints: number;
  };
}

export interface DailyActiveStreakResponse {
  success: boolean;
  data?: {
    currentStreak: number;
  };
}

export const dailyActiveService = {
  /**
   * Sync daily steps with the server
   * 
   * Sends the current step count for the day to the server.
   * The server will:
   * - Update or create daily activity record
   * - Award points if goal is achieved
   * - Update user streak
   * - Return updated stats
   * 
   * @param token - JWT access token
   * @param stepsData - Steps data to sync
   * @param stepsData.steps - Current step count
   * @param stepsData.date - Date in YYYY-MM-DD format
   * @returns Sync response with points and streak info
   */
  async syncSteps(
    token: string,
    stepsData: DailyActiveSyncRequest
  ): Promise<DailyActiveSyncResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('👟 Syncing steps:', stepsData.steps, 'for date:', stepsData.date);
        
        return request<DailyActiveSyncResponse>(
          '/v1/daily-active/sync',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(stepsData),
          }
        );
      },
      token
    );
  },

  /**
   * Get daily activity stats
   * 
   * Retrieves comprehensive statistics about daily activity including:
   * - Today's activity (if any)
   * - Current and longest streaks
   * - Total days completed
   * - Weekly and monthly aggregated data
   * 
   * Useful for displaying in a dashboard or activity screen.
   * 
   * @param token - JWT access token
   * @returns Daily activity statistics
   */
  async getStats(token: string): Promise<DailyActiveStatsResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('📊 Fetching daily activity stats');
        
        return request<DailyActiveStatsResponse>(
          '/v1/daily-active/stats',
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
   * Get daily activity history for a date range
   * 
   * Retrieves historical daily activity data for charts and analysis.
   * Useful for showing progress over time in a calendar or graph view.
   * 
   * Features:
   * - Filter by date range
   * - Returns daily step counts and completion status
   * - Max 90 days of history per request
   * 
   * @param token - JWT access token
   * @param params - Query parameters
   * @param params.startDate - Start date for history (YYYY-MM-DD)
   * @param params.endDate - End date for history (YYYY-MM-DD, defaults to today)
   * @param params.limit - Maximum number of days to return (default: 30, max: 90)
   * @returns Historical daily activity data
   */
  async getHistory(
    token: string,
    params?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<DailyActiveHistoryResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        
        if (params) {
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.limit) queryParams.limit = params.limit;
        }

        console.log('📜 Fetching daily activity history');
        
        return request<DailyActiveHistoryResponse>(
          '/v1/daily-active/history',
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
   * Get today's activity
   * 
   * Convenience method to quickly get today's daily activity record.
   * Returns null if no activity has been synced for today yet.
   * 
   * @param token - JWT access token
   * @returns Today's daily activity or null
   */
  async getToday(token: string): Promise<DailyActiveData | null> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('📅 Fetching today\'s activity');
        
        const response = await request<{ success: boolean; data?: DailyActiveData }>(
          '/v1/daily-active/today',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
        
        return response.data || null;
      },
      token
    );
  },

  /**
   * Update daily step goal
   * 
   * Updates the daily step goal for the current user.
   * 
   * @param token - JWT access token
   * @param goalData - New goal data
   * @param goalData.goal - New daily step goal (1000-50000)
   * @param date - Optional date to update goal for (defaults to today)
   * @returns Updated goal information
   */
  async updateGoal(
    token: string,
    goalData: DailyActiveGoalUpdateRequest,
    date?: string
  ): Promise<DailyActiveGoalUpdateResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🎯 Updating step goal to:', goalData.goal);
        
        const queryParams: Record<string, any> = {};
        if (date) queryParams.date = date;
        
        return request<DailyActiveGoalUpdateResponse>(
          '/v1/daily-active/goal',
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(goalData),
          },
          queryParams
        );
      },
      token
    );
  },

  /**
   * Get current step goal
   * 
   * Retrieves the user's current daily step goal.
   * 
   * @param token - JWT access token
   * @returns Current goal
   */
  async getGoal(token: string): Promise<{ goal: number }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🎯 Fetching current step goal');
        
        const response = await request<DailyActiveGoalResponse>(
          '/v1/daily-active/goal',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
        
        return response.data || { goal: 10000 };
      },
      token
    );
  },

  /**
   * Get weekly summary
   * 
   * Retrieves aggregated weekly summary including total steps,
   * completed days, and average steps.
   * 
   * @param token - JWT access token
   * @param date - Optional date within the target week (YYYY-MM-DD, defaults to today)
   * @returns Weekly summary data
   */
  async getWeeklySummary(
    token: string,
    date?: string
  ): Promise<DailyActiveWeeklySummaryResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        if (date) queryParams.date = date;

        console.log('📊 Fetching weekly activity summary');
        
        const response = await request<DailyActiveWeeklySummaryResponse>(
          '/v1/daily-active/weekly-summary',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          queryParams
        );
        
        return response.data || null;
      },
      token
    );
  },

  /**
   * Get total points
   * 
   * Retrieves the total points earned by the user across all daily activities.
   * 
   * @param token - JWT access token
   * @returns Total points
   */
  async getTotalPoints(token: string): Promise<{ totalPoints: number }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🏆 Fetching total points');
        
        const response = await request<DailyActivePointsResponse>(
          '/v1/daily-active/points',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
        
        return response.data || { totalPoints: 0 };
      },
      token
    );
  },

  /**
   * Get streak information
   * 
   * Retrieves the user's current consecutive days streak of hitting their step goal.
   * 
   * @param token - JWT access token
   * @returns Current streak
   */
  async getStreak(token: string): Promise<{ currentStreak: number }> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('🔥 Fetching current streak');
        
        const response = await request<DailyActiveStreakResponse>(
          '/v1/daily-active/streak',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          }
        );
        
        return response.data || { currentStreak: 0 };
      },
      token
    );
  },

  /**
   * Format steps for display
   * 
   * Formats a step count with thousand separators.
   * 
   * @param steps - Number of steps
   * @returns Formatted string (e.g., "10,000")
   */
  formatSteps(steps: number): string {
    return steps.toLocaleString();
  },

  /**
   * Calculate progress percentage
   * 
   * Calculates the progress percentage towards the goal.
   * 
   * @param steps - Current steps
   * @param goal - Daily goal
   * @returns Progress percentage (0-100)
   */
  calculateProgress(steps: number, goal: number): number {
    return Math.min(Math.round((steps / goal) * 100), 100);
  },

  /**
   * Get motivational message based on progress
   * 
   * Returns a motivational message based on current progress.
   * 
   * @param progress - Progress percentage (0-100)
   * @returns Motivational message
   */
  getMotivationalMessage(progress: number): string {
    if (progress >= 100) {
      return '🎉 Amazing! You crushed your goal today!';
    } else if (progress >= 75) {
      return '💪 Almost there! Keep pushing!';
    } else if (progress >= 50) {
      return '👍 Halfway there! You got this!';
    } else if (progress >= 25) {
      return '🚶 Good start! Keep moving!';
    } else {
      return '👟 Every step counts! Let\'s get moving!';
    }
  },
};