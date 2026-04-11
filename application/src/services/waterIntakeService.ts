import { API_BASE_URL, apiCallWithRefresh, createJsonHeaders, request } from './api';

export interface WaterIntakeData {
  id: string;
  userId: string;
  date: string;
  amountInLiters: number;
  goalInLiters: number;
  isCompleted: boolean;
  completedAt: string | null;
  streakDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface WaterIntakeSyncRequest {
  amount: number;
  unit: 'L' | 'ML';
  date: string;
  goalInLiters?: number;
}

export interface WaterIntakeSyncResponse {
  success: boolean;
  message?: string;
  data?: {
    waterIntake: WaterIntakeData & {
      amountInML: number;
      progress: number;
    };
    amountAdded: number;
    amountAddedML: number;
    totalIntakeLiters: number;
    totalIntakeML: number;
    remainingLiters: number;
    remainingML: number;
    streakMaintained: boolean;
    goalAchieved: boolean;
  };
}

export interface WaterIntakeAddRequest {
  amount: number;
  unit: 'L' | 'ML';
}

export interface WaterIntakeAddResponse {
  success: boolean;
  message?: string;
  data?: {
    waterIntake: WaterIntakeData & {
      amountInML: number;
      progress: number;
    };
    addedAmount: number;
    addedAmountML: number;
    currentAmount: number;
    currentAmountML: number;
    remainingLiters: number;
    remainingML: number;
    goalAchieved: boolean;
  };
}

export interface WaterIntakeStatsResponse {
  success: boolean;
  message?: string;
  data?: {
    today: (WaterIntakeData & {
      amountInML: number;
      progress: number;
      remainingLiters: number;
      remainingML: number;
    }) | {
      amountInLiters: number;
      amountInML: number;
      goalInLiters: number;
      goalInML: number;
      isCompleted: boolean;
      progress: number;
      remainingLiters: number;
      remainingML: number;
    };
    currentStreak: number;
    longestStreak: number;
    totalDaysCompleted: number;
    totalLiters: number;
    totalML: number;
    averageDailyLiters: number;
    averageDailyML: number;
    weeklyData: Array<{
      date: string;
      amount: number;
      amountML: number;
      goal: number;
      completed: boolean;
    }>;
    monthlyData: Array<{
      date: string;
      amount: number;
      amountML: number;
      goal: number;
      completed: boolean;
    }>;
  };
}

export interface WaterIntakeHistoryResponse {
  success: boolean;
  message?: string;
  data?: Array<WaterIntakeData & {
    amountInML: number;
    goalInML: number;
    progress: number;
    remainingML: number;
  }>;
  meta?: {
    totalDays: number;
    startDate: string;
    endDate: string;
  };
}

export interface WaterIntakeTodayResponse {
  success: boolean;
  data?: WaterIntakeData & {
    amountInML: number;
    goalInML: number;
    progress: number;
    remainingLiters: number;
    remainingML: number;
    cupsAmount: number;
    cupsGoal: number;
  } | {
    date: string;
    amountInLiters: number;
    amountInML: number;
    goalInLiters: number;
    goalInML: number;
    isCompleted: boolean;
    completedAt: null;
    streakDays: number;
    progress: number;
    remainingLiters: number;
    remainingML: number;
    cupsAmount: number;
    cupsGoal: number;
  };
}

export interface WaterIntakeWeeklySummaryResponse {
  success: boolean;
  data?: {
    totalLiters: number;
    totalML: number;
    completedDays: number;
    averageDailyLiters: number;
    averageDailyML: number;
    bestDay: {
      date: string;
      amount: number;
    } | null;
  };
}

export interface WaterIntakeMonthlySummaryResponse {
  success: boolean;
  data?: {
    totalLiters: number;
    totalML: number;
    completedDays: number;
    averageDailyLiters: number;
    averageDailyML: number;
    daysWithIntake: number;
  };
}

export interface WaterIntakeTotalResponse {
  success: boolean;
  data?: {
    totalLiters: number;
    totalML: number;
    averageDailyLiters: number;
    averageDailyML: number;
    averageDailyCups: number;
  };
}

export interface WaterIntakeStreakResponse {
  success: boolean;
  data?: {
    currentStreak: number;
    longestStreak: number;
  };
}

export interface WaterIntakeGoalUpdateRequest {
  goalInLiters: number;
}

export interface WaterIntakeGoalUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    goalInLiters: number;
    goalInML: number;
    cupsGoal: number;
    waterIntake: WaterIntakeData & {
      amountInML: number;
      progress: number;
    };
  };
}

export const waterIntakeService = {
  /**
   * Sync water intake with the server
   * 
   * Sends the current water intake for the day to the server.
   * The server will:
   * - Update or create water intake record
   * - Update streak if goal is achieved
   * - Return updated stats
   * 
   * @param token - JWT access token
   * @param intakeData - Water intake data to sync
   * @param intakeData.amount - Amount of water consumed
   * @param intakeData.unit - Unit of measurement ('L' or 'ML')
   * @param intakeData.date - Date in YYYY-MM-DD format
   * @param intakeData.goalInLiters - Optional custom daily goal in liters
   * @returns Sync response with intake and streak info
   */
  async syncIntake(
    token: string,
    intakeData: WaterIntakeSyncRequest
  ): Promise<WaterIntakeSyncResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧 Syncing water intake:', intakeData.amount, intakeData.unit, 'for date:', intakeData.date);
        
        return request<WaterIntakeSyncResponse>(
          '/v1/water-intake/sync',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(intakeData),
          }
        );
      },
      token
    );
  },

  /**
   * Add water intake incrementally
   * 
   * Adds a specific amount of water to today's intake.
   * Creates today's record if it doesn't exist.
   * 
   * @param token - JWT access token
   * @param intakeData - Water amount to add
   * @param intakeData.amount - Amount of water to add
   * @param intakeData.unit - Unit of measurement ('L' or 'ML')
   * @returns Add response with updated intake info
   */
  async addIntake(
    token: string,
    intakeData: WaterIntakeAddRequest
  ): Promise<WaterIntakeAddResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('➕ Adding water intake:', intakeData.amount, intakeData.unit);
        
        return request<WaterIntakeAddResponse>(
          '/v1/water-intake/add',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(intakeData),
          }
        );
      },
      token
    );
  },

  /**
   * Get water intake stats
   * 
   * Retrieves comprehensive statistics about water intake including:
   * - Today's intake (with defaults if none)
   * - Current and longest streaks
   * - Total days completed
   * - Weekly and monthly aggregated data
   * 
   * Useful for displaying in a dashboard or hydration screen.
   * 
   * @param token - JWT access token
   * @returns Water intake statistics
   */
  async getStats(token: string): Promise<WaterIntakeStatsResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧📊 Fetching water intake stats');
        
        return request<WaterIntakeStatsResponse>(
          '/v1/water-intake/stats',
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
   * Get water intake history for a date range
   * 
   * Retrieves historical water intake data for charts and analysis.
   * Useful for showing progress over time in a calendar or graph view.
   * 
   * Features:
   * - Filter by date range
   * - Returns daily intake amounts and completion status
   * - Max 90 days of history per request
   * 
   * @param token - JWT access token
   * @param params - Query parameters
   * @param params.startDate - Start date for history (YYYY-MM-DD)
   * @param params.endDate - End date for history (YYYY-MM-DD, defaults to today)
   * @param params.limit - Maximum number of days to return (default: 30, max: 90)
   * @returns Historical water intake data
   */
  async getHistory(
    token: string,
    params?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<WaterIntakeHistoryResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        
        if (params) {
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.limit) queryParams.limit = params.limit;
        }

        console.log('💧📜 Fetching water intake history');
        
        return request<WaterIntakeHistoryResponse>(
          '/v1/water-intake/history',
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
   * Get today's water intake
   * 
   * Convenience method to quickly get today's water intake record.
   * Returns default values if no intake has been recorded for today yet.
   * 
   * @param token - JWT access token
   * @returns Today's water intake data
   */
  async getToday(token: string): Promise<WaterIntakeTodayResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧📅 Fetching today\'s water intake');
        
        const response = await request<WaterIntakeTodayResponse>(
          '/v1/water-intake/today',
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
   * Get weekly summary
   * 
   * Retrieves aggregated weekly summary including total intake,
   * completed days, average intake, and best day.
   * 
   * @param token - JWT access token
   * @param date - Optional date within the target week (YYYY-MM-DD, defaults to today)
   * @returns Weekly summary data
   */
  async getWeeklySummary(
    token: string,
    date?: string
  ): Promise<WaterIntakeWeeklySummaryResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        if (date) queryParams.date = date;

        console.log('💧📊 Fetching weekly water intake summary');
        
        const response = await request<WaterIntakeWeeklySummaryResponse>(
          '/v1/water-intake/weekly-summary',
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
   * Get monthly summary
   * 
   * Retrieves aggregated monthly summary including total intake,
   * completed days, average daily intake, and days with intake.
   * 
   * @param token - JWT access token
   * @param year - Year (defaults to current year)
   * @param month - Month (1-12, defaults to current month)
   * @returns Monthly summary data
   */
  async getMonthlySummary(
    token: string,
    year?: number,
    month?: number
  ): Promise<WaterIntakeMonthlySummaryResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        const queryParams: Record<string, any> = {};
        if (year) queryParams.year = year;
        if (month) queryParams.month = month;

        console.log('💧📅 Fetching monthly water intake summary');
        
        const response = await request<WaterIntakeMonthlySummaryResponse>(
          '/v1/water-intake/monthly-summary',
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
   * Get total water intake
   * 
   * Retrieves the total water intake and average daily intake across all time.
   * 
   * @param token - JWT access token
   * @returns Total intake statistics
   */
  async getTotalIntake(token: string): Promise<WaterIntakeTotalResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧🔢 Fetching total water intake');
        
        const response = await request<WaterIntakeTotalResponse>(
          '/v1/water-intake/total',
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
   * Get streak information
   * 
   * Retrieves the user's current consecutive days streak of hitting their water intake goal,
   * along with their longest streak.
   * 
   * @param token - JWT access token
   * @returns Current and longest streak
   */
  async getStreak(token: string): Promise<WaterIntakeStreakResponse['data']> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧🔥 Fetching water intake streak');
        
        const response = await request<WaterIntakeStreakResponse>(
          '/v1/water-intake/streak',
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
   * Update water intake goal
   * 
   * Updates the daily water intake goal for the current user.
   * 
   * @param token - JWT access token
   * @param goalData - New goal data
   * @param goalData.goalInLiters - New daily water goal in liters (0.5 - 10)
   * @returns Updated goal information
   */
  async updateGoal(
    token: string,
    goalData: WaterIntakeGoalUpdateRequest
  ): Promise<WaterIntakeGoalUpdateResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        console.log('💧🎯 Updating water intake goal to:', goalData.goalInLiters, 'L');
        
        return request<WaterIntakeGoalUpdateResponse>(
          '/v1/water-intake/goal',
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(goalData),
          }
        );
      },
      token
    );
  },

  /**
   * Quick add presets for common water amounts
   * 
   * Returns an array of common water amounts for quick addition.
   * Useful for UI buttons that allow one-tap water logging.
   * 
   * @returns Array of preset water amounts
   */
  getQuickAddPresets(): Array<{ amount: number; unit: 'L' | 'ML'; label: string }> {
    return [
      { amount: 150, unit: 'ML', label: 'Small Glass' },
      { amount: 250, unit: 'ML', label: 'Glass' },
      { amount: 330, unit: 'ML', label: 'Can' },
      { amount: 500, unit: 'ML', label: 'Bottle' },
      { amount: 750, unit: 'ML', label: 'Large Bottle' },
      { amount: 1, unit: 'L', label: '1 Liter' },
    ];
  },

  /**
   * Convert between L and ML
   * 
   * Utility function to convert between liters and milliliters.
   * 
   * @param amount - Amount to convert
   * @param from - Source unit
   * @param to - Target unit
   * @returns Converted amount
   */
  convertUnit(amount: number, from: 'L' | 'ML', to: 'L' | 'ML'): number {
    if (from === to) return amount;
    
    if (from === 'L' && to === 'ML') {
      return amount * 1000;
    } else {
      return amount / 1000;
    }
  },

  /**
   * Format water amount for display
   * 
   * Formats a water amount with appropriate unit.
   * Automatically chooses between L and ML based on amount.
   * 
   * @param amountInLiters - Amount in liters
   * @returns Formatted string (e.g., "1.5 L" or "500 ML")
   */
  formatAmount(amountInLiters: number): string {
    if (amountInLiters >= 1) {
      return `${amountInLiters.toFixed(1)} L`;
    } else {
      const ml = amountInLiters * 1000;
      return `${Math.round(ml)} ML`;
    }
  },

  /**
   * Calculate cups from liters
   * 
   * Converts liters to cups (assuming 1 cup = 250ml).
   * 
   * @param amountInLiters - Amount in liters
   * @returns Number of cups (rounded)
   */
  litersToCups(amountInLiters: number): number {
    return Math.round((amountInLiters * 1000) / 250);
  },

  /**
   * Calculate liters from cups
   * 
   * Converts cups to liters (assuming 1 cup = 250ml).
   * 
   * @param cups - Number of cups
   * @returns Amount in liters
   */
  cupsToLiters(cups: number): number {
    return (cups * 250) / 1000;
  },
};