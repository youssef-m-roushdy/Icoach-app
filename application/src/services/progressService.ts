import { API_BASE_URL, apiCallWithRefresh } from './api';

export interface ProgressDashboardResponse {
  name: string;
  joinedDate: string;
  avatarUrl: string | null;
  currentPoints: number;
  maxPoints: number;
  badgeLevel: number;
  metrics: {
    strength: number;
    endurance: number;
    consistency: number;
    volume: number;
    progress: number;
    habits: number;
  };
  trainingData: {
    totalWorkouts: number;
    weeklyAvg: number;
    currentStreak: number;
    longestStreak: number;
    totalVolume: number;
    personalBests: Array<{
      exercise: string;
      value: string;
    }>;
  };
}

export interface MetricsHistoryItem {
  date: string;
  fitnessScore: number;
  strength: number;
  endurance: number;
  consistency: number;
  volume: number;
  progress: number;
  habits: number;
}

export interface MetricsHistoryResponse {
  success: boolean;
  data: MetricsHistoryItem[];
  meta: {
    totalDays: number;
    metricsIncluded: string[];
    format: string;
  };
}

export const progressService = {
  /**
   * Get user progress dashboard data
   * 
   * Retrieves all data needed for the GymProgressScreen including:
   * - User profile information
   * - Current fitness metrics
   * - Points and badge level
   * - Training statistics
   * - Personal bests
   * 
   * Optional: Include historical data by using query parameters.
   * 
   * @param token - JWT access token
   * @param params - Optional query parameters
   * @param params.includeHistory - Whether to include historical metrics in the response
   * @param params.historyDays - Number of days of history to include (if includeHistory=true)
   * @returns Complete progress dashboard data
   */
  async getProgressDashboard(
    token: string, 
    params?: {
      includeHistory?: boolean;
      historyDays?: number;
    }
  ): Promise<{ success: boolean; data: ProgressDashboardResponse }> {
    return apiCallWithRefresh(async (accessToken) => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params?.includeHistory) {
        queryParams.append('includeHistory', 'true');
        if (params.historyDays) {
          queryParams.append('historyDays', params.historyDays.toString());
        }
      }

      const url = `${API_BASE_URL}/v1/progress/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('📊 Fetching progress dashboard from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      console.log('📊 Progress dashboard response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch progress dashboard');
      }

      return result;
    }, token);
  },

  /**
   * Get historical metrics for charts
   * 
   * Retrieve historical fitness metrics for charts and trend analysis.
   * Returns daily snapshots of all metrics over the specified time period.
   * 
   * Features:
   * - Filter by date range (startDate/endDate) or number of days
   * - Select specific metrics to return
   * - Aggregate by daily, weekly, or monthly format
   * - Max 365 days of history
   * 
   * @param token - JWT access token
   * @param params - Query parameters
   * @param params.days - Number of days of history to return (alternative to startDate/endDate)
   * @param params.startDate - Start date for history range (YYYY-MM-DD)
   * @param params.endDate - End date for history range (YYYY-MM-DD, defaults to today)
   * @param params.metrics - Comma-separated list of metrics to return
   * @param params.format - Aggregation format (daily, weekly, monthly)
   * @returns Historical metrics data
   */
  async getMetricsHistory(
    token: string,
    params?: {
      days?: number;
      startDate?: string;
      endDate?: string;
      metrics?: string;
      format?: 'daily' | 'weekly' | 'monthly';
    }
  ): Promise<MetricsHistoryResponse> {
    return apiCallWithRefresh(async (accessToken) => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/v1/progress/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('📊 Fetching metrics history from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch metrics history');
      }

      return result;
    }, token);
  },
};