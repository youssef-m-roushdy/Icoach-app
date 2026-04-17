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
   */
  async syncIntake(
    token: string,
    intakeData: WaterIntakeSyncRequest
  ): Promise<WaterIntakeSyncResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        // Convert ML to L if needed (server expects amount in liters for validation)
        let amountInLiters = intakeData.amount;
        if (intakeData.unit === 'ML') {
          amountInLiters = intakeData.amount / 1000;
        }
        
        // Ensure amount is within validation range (0 to 10)
        const validatedAmount = Math.min(Math.max(amountInLiters, 0), 10);
        
        const payload = {
          amount: validatedAmount,
          unit: 'L' as const, // Always send as 'L' to avoid validation issues
          date: intakeData.date,
          ...(intakeData.goalInLiters !== undefined && { 
            goalInLiters: Number(intakeData.goalInLiters) 
          }),
        };
        
        console.log('💧 Syncing water intake:', JSON.stringify(payload));
        
        return request<WaterIntakeSyncResponse>(
          '/v1/water-intake/sync',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(payload),
          }
        );
      },
      token
    );
  },

  /**
   * Add water intake incrementally
   */
  async addIntake(
    token: string,
    intakeData: WaterIntakeAddRequest
  ): Promise<WaterIntakeAddResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        // Convert ML to L if needed (server expects amount in liters for validation)
        let amountInLiters = intakeData.amount;
        if (intakeData.unit === 'ML') {
          amountInLiters = intakeData.amount / 1000;
        }
        
        // Ensure amount is within validation range (0.001 to 10)
        const validatedAmount = Math.min(Math.max(amountInLiters, 0.001), 10);
        
        const payload = {
          amount: validatedAmount,
          unit: 'L' as const, // Always send as 'L' to avoid validation issues
        };
        
        console.log('➕ Adding water intake:', JSON.stringify(payload));
        
        return request<WaterIntakeAddResponse>(
          '/v1/water-intake/add',
          {
            method: 'POST',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(payload),
          }
        );
      },
      token
    );
  },

  /**
   * Get water intake stats
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
        
        return response.data;
      },
      token
    );
  },

  /**
   * Get weekly summary
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
        
        return response.data;
      },
      token
    );
  },

  /**
   * Get monthly summary
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
        
        return response.data;
      },
      token
    );
  },

  /**
   * Get total water intake
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
        
        return response.data;
      },
      token
    );
  },

  /**
   * Get streak information
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
        
        return response.data;
      },
      token
    );
  },

  /**
   * Update water intake goal
   */
  async updateGoal(
    token: string,
    goalData: WaterIntakeGoalUpdateRequest
  ): Promise<WaterIntakeGoalUpdateResponse> {
    return apiCallWithRefresh(
      async (accessToken) => {
        // Ensure goalInLiters is within validation range (0.5 to 10)
        const validatedGoal = Math.min(Math.max(Number(goalData.goalInLiters), 0.5), 10);
        
        const payload = {
          goalInLiters: validatedGoal,
        };
        
        console.log('💧🎯 Updating water intake goal to:', payload.goalInLiters, 'L');
        
        return request<WaterIntakeGoalUpdateResponse>(
          '/v1/water-intake/goal',
          {
            method: 'PUT',
            headers: createJsonHeaders(accessToken),
            body: JSON.stringify(payload),
          }
        );
      },
      token
    );
  },

  /**
   * Quick add presets for common water amounts
   */
  getQuickAddPresets(): Array<{ amount: number; unit: 'L' | 'ML'; label: string }> {
    return [
      { amount: 0.15, unit: 'L', label: 'Small Glass (150ml)' },
      { amount: 0.25, unit: 'L', label: 'Glass (250ml)' },
      { amount: 0.33, unit: 'L', label: 'Can (330ml)' },
      { amount: 0.5, unit: 'L', label: 'Bottle (500ml)' },
      { amount: 0.75, unit: 'L', label: 'Large Bottle (750ml)' },
      { amount: 1, unit: 'L', label: '1 Liter' },
    ];
  },

  /**
   * Convert between L and ML
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
   */
  litersToCups(amountInLiters: number): number {
    return Math.round((amountInLiters * 1000) / 250);
  },

  /**
   * Calculate liters from cups
   */
  cupsToLiters(cups: number): number {
    return (cups * 250) / 1000;
  },
};