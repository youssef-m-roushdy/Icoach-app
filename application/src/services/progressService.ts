import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

export interface ProgressDashboardData {
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

export interface MetricsHistoryMeta {
  totalDays: number;
  metricsIncluded: string[];
  format: string;
}

export interface ProgressDashboardResponse {
  success: boolean;
  message?: string;
  data?: ProgressDashboardData;
}

export interface MetricsHistoryResponse {
  success: boolean;
  message?: string;
  data?: MetricsHistoryItem[];
  meta?: MetricsHistoryMeta;
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
  ): Promise<ProgressDashboardResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        
        if (params?.includeHistory) {
          queryParams.includeHistory = 'true';
          if (params.historyDays) {
            queryParams.historyDays = params.historyDays;
          }
        }

        console.log('📊 Fetching progress dashboard');
        
        return request<ProgressDashboardResponse>(
          '/v1/progress/dashboard',
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
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        
        if (params) {
          if (params.days) queryParams.days = params.days;
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.metrics) queryParams.metrics = params.metrics;
          if (params.format) queryParams.format = params.format;
        }

        console.log('📊 Fetching metrics history');
        
        return request<MetricsHistoryResponse>(
          '/v1/progress/history',
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
};