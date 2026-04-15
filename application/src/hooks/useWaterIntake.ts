import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { waterIntakeService } from '../services/waterIntakeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const DEFAULT_GOAL_LITERS = 2.0;
const SYNC_THROTTLE_MS = 3000;          // 3 seconds between syncs
const CACHE_KEY = '@water_intake_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const NETWORK_POLL_INTERVAL_MS = 3000;  // poll every 3 seconds
const NETWORK_CHECK_TIMEOUT_MS = 5000;  // 5 second timeout for network checks
const MAX_SYNC_RETRIES = 3;             // Maximum retries for failed syncs
const BATCH_SIZE = 5;                   // Process queue in batches of 5

export interface WaterIntakeData {
  amountInLiters: number;
  amountInML: number;
  goalInLiters: number;
  goalInML: number;
  remainingLiters: number;
  remainingML: number;
  progress: number;
  isCompleted: boolean;
  streakDays: number;
  cupsAmount: number;
  cupsGoal: number;
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

interface CachedWaterData {
  data: {
    amountInLiters: number;
    goalInLiters: number;
    isCompleted: boolean;
    streakDays: number;
  };
  timestamp: number;
}

// ✅ Pure JS connectivity check with timeout and abort controller
const checkIsOnline = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_CHECK_TIMEOUT_MS);
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.status === 204;
  } catch (error) {
    // Timeout or network error means offline
    return false;
  }
};

export function useWaterIntake(): WaterIntakeData & {
  addWater: (amount: number, unit: 'L' | 'ML') => Promise<void>;
  syncIntake: (amount: number, unit: 'L' | 'ML', date?: string) => Promise<void>;
  updateGoal: (goalInLiters: number) => Promise<void>;
  refreshIntake: () => Promise<void>;
  quickAddPresets: Array<{ amount: number; unit: 'L' | 'ML'; label: string }>;
} {
  const { token, refreshAccessToken } = useAuth();
  
  // Keep a stable reference to token to avoid re-fetches when token refreshes automatically
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [amountInLiters, setAmountInLiters] = useState(0);
  const [goalInLiters, setGoalInLiters] = useState(DEFAULT_GOAL_LITERS);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const lastSyncTimestampRef = useRef<number>(0);
  const pendingSyncsRef = useRef<Array<{ amount: number; unit: 'L' | 'ML'; timestamp: Date }>>([]);
  const isOnlineRef = useRef<boolean>(true);
  const isSyncingRef = useRef(false);
  const networkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Helper function to get valid token (with refresh if needed)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) {
      return tokenRef.current;
    }
    // Try to refresh if token is missing
    const newToken = await refreshAccessToken();
    return newToken;
  }, [refreshAccessToken]);

  // Load cached data on mount
  const loadCachedData = useCallback(async (): Promise<CachedWaterData | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedWaterData;
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load cached water data:', err);
    }
    return null;
  }, []);

  // Save data to cache
  const saveCachedData = useCallback(async (data: {
    amountInLiters: number;
    goalInLiters: number;
    isCompleted: boolean;
    streakDays: number;
  }): Promise<void> => {
    try {
      const cacheData: CachedWaterData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Failed to cache water data:', err);
    }
  }, []);

  // Queue a failed / offline sync for later retry
  const queueSync = useCallback((amount: number, unit: 'L' | 'ML') => {
    pendingSyncsRef.current.push({ amount, unit, timestamp: new Date() });
    console.log(`💧📦 Queued water sync for later (${pendingSyncsRef.current.length} pending)`);
  }, []);

  // Core sync function with retry logic
  const syncIntake = useCallback(
    async (amount: number, unit: 'L' | 'ML', date?: string, retryCount: number = 0): Promise<void> => {
      if (!isOnlineRef.current) {
        console.log('💧📱 Offline mode – queueing sync for later');
        queueSync(amount, unit);
        return;
      }

      const now = Date.now();
      if (now - lastSyncTimestampRef.current < SYNC_THROTTLE_MS) {
        console.log('💧⏭️ Skipping sync – throttled');
        return;
      }

      if (isSyncingRef.current) {
        console.log('💧⏭️ Skipping sync – already syncing');
        return;
      }

      lastSyncTimestampRef.current = now;
      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const validToken = await getValidToken();
        if (!validToken) {
          console.error('No auth token available');
          return;
        }

        const today = date ?? new Date().toISOString().split('T')[0];

        const response = await waterIntakeService.syncIntake(validToken, {
          amount,
          unit,
          date: today,
          goalInLiters,
        });

        if (response.success && response.data) {
          console.log('💧✅ Water intake synced successfully:', {
            amount: response.data.amountAdded,
            unit,
            goalAchieved: response.data.goalAchieved,
          });

          const newAmount = response.data.waterIntake.amountInLiters;
          const newGoal = response.data.waterIntake.goalInLiters;
          const completed = response.data.waterIntake.isCompleted;
          const streak = response.data.waterIntake.streakDays;

          setAmountInLiters(newAmount);
          setGoalInLiters(newGoal);
          setIsCompleted(completed);
          setStreakDays(streak);
          setLastSyncTime(new Date());

          await saveCachedData({
            amountInLiters: newAmount,
            goalInLiters: newGoal,
            isCompleted: completed,
            streakDays: streak,
          });

          if (response.data.goalAchieved) {
            console.log('💧🎉 Hydration goal achieved! Streak:', streak);
          }
        }
      } catch (err) {
        console.error('💧❌ Sync failed:', err);
        
        // Retry logic for network errors
        if (retryCount < MAX_SYNC_RETRIES) {
          console.log(`💧🔄 Retrying sync (${retryCount + 1}/${MAX_SYNC_RETRIES})...`);
          setTimeout(() => {
            if (isMountedRef.current) {
              syncIntake(amount, unit, date, retryCount + 1);
            }
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          queueSync(amount, unit);
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [goalInLiters, saveCachedData, queueSync, getValidToken]
  );

  // Add water incrementally
  const addWater = useCallback(
    async (amount: number, unit: 'L' | 'ML'): Promise<void> => {
      if (!isOnlineRef.current) {
        console.log('💧📱 Offline mode – queueing add for later');
        queueSync(amount, unit);
        return;
      }

      if (isSyncingRef.current) {
        console.log('💧⏭️ Skipping add – already syncing');
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const validToken = await getValidToken();
        if (!validToken) {
          console.error('No auth token available');
          return;
        }

        const response = await waterIntakeService.addIntake(validToken, {
          amount,
          unit,
        });

        if (response.success && response.data) {
          console.log('💧➕ Water added successfully:', {
            added: response.data.addedAmount,
            unit,
            current: response.data.currentAmount,
          });

          const newAmount = response.data.waterIntake.amountInLiters;
          const newGoal = response.data.waterIntake.goalInLiters;
          const completed = response.data.waterIntake.isCompleted;
          const streak = response.data.waterIntake.streakDays;

          setAmountInLiters(newAmount);
          setGoalInLiters(newGoal);
          setIsCompleted(completed);
          setStreakDays(streak);
          setLastSyncTime(new Date());

          await saveCachedData({
            amountInLiters: newAmount,
            goalInLiters: newGoal,
            isCompleted: completed,
            streakDays: streak,
          });

          if (response.data.goalAchieved) {
            console.log('💧🎉 Hydration goal achieved! Streak:', streak);
          }
        }
      } catch (err) {
        console.error('💧❌ Add water failed:', err);
        queueSync(amount, unit);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [saveCachedData, queueSync, getValidToken]
  );

  // Update daily goal
  const updateGoal = useCallback(
    async (newGoalInLiters: number): Promise<void> => {
      // Validate goal
      if (newGoalInLiters < 0.5 || newGoalInLiters > 10) {
        console.error('Goal must be between 0.5 and 10 liters');
        return;
      }

      if (isSyncingRef.current) {
        console.log('💧⏭️ Skipping goal update – already syncing');
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const validToken = await getValidToken();
        if (!validToken) {
          console.error('No auth token available');
          return;
        }

        const response = await waterIntakeService.updateGoal(validToken, {
          goalInLiters: newGoalInLiters,
        });

        if (response.success && response.data) {
          console.log('💧🎯 Goal updated successfully:', newGoalInLiters, 'L');

          const newAmount = response.data.waterIntake.amountInLiters;
          const completed = response.data.waterIntake.isCompleted;

          setGoalInLiters(newGoalInLiters);
          setAmountInLiters(newAmount);
          setIsCompleted(completed);
          setLastSyncTime(new Date());

          await saveCachedData({
            amountInLiters: newAmount,
            goalInLiters: newGoalInLiters,
            isCompleted: completed,
            streakDays,
          });
        }
      } catch (err) {
        console.error('💧❌ Goal update failed:', err);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [streakDays, saveCachedData, getValidToken]
  );

  // Refresh intake data from server
  const refreshIntake = useCallback(async (): Promise<void> => {
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        console.error('No auth token available');
        return;
      }

      const todayData = await waterIntakeService.getToday(validToken);
      
      if (todayData && isMountedRef.current) {
        setAmountInLiters(todayData.amountInLiters);
        setGoalInLiters(todayData.goalInLiters);
        setIsCompleted(todayData.isCompleted);
        setStreakDays(todayData.streakDays);

        await saveCachedData({
          amountInLiters: todayData.amountInLiters,
          goalInLiters: todayData.goalInLiters,
          isCompleted: todayData.isCompleted,
          streakDays: todayData.streakDays,
        });
      }
    } catch (err) {
      console.error('💧❌ Refresh intake failed:', err);
    }
  }, [saveCachedData, getValidToken]);

  // Drain the offline queue once back online with batch processing
  const processSyncQueue = useCallback(async (): Promise<void> => {
    // Don't process if offline
    if (!isOnlineRef.current) return;
    
    // Prevent processing if already syncing
    if (isSyncingRef.current) {
      console.log('💧⏭️ Already syncing, skipping queue processing');
      return;
    }

    const queueLength = pendingSyncsRef.current.length;
    if (queueLength === 0) return;

    console.log(`💧📦 Processing ${queueLength} queued water syncs...`);
    
    // Process in batches to avoid overwhelming the server
    const batches = Math.ceil(queueLength / BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const batch = pendingSyncsRef.current.slice(0, BATCH_SIZE);
      await Promise.all(batch.map(pending => syncIntake(pending.amount, pending.unit)));
      pendingSyncsRef.current = pendingSyncsRef.current.slice(BATCH_SIZE);
      
      // Small delay between batches
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('💧✅ Queued water syncs processed');
  }, [syncIntake]);

  // ✅ Pure JS network polling — no native modules required
  useEffect(() => {
    let isChecking = false;
    let abortController: AbortController | null = null;
    
    const checkNetwork = async () => {
      // Skip if already checking
      if (isChecking) return;
      
      try {
        isChecking = true;
        
        // Create new abort controller for this check
        abortController = new AbortController();
        
        const isConnected = await checkIsOnline();
        
        if (!isMountedRef.current) return;
        
        if (isConnected && !isOnlineRef.current) {
          console.log('💧🌐 App is online – processing sync queue');
          isOnlineRef.current = true;
          await processSyncQueue();
        } else if (!isConnected && isOnlineRef.current) {
          console.log('💧📴 App is offline');
          isOnlineRef.current = false;
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('💧 Network check failed:', err);
      } finally {
        isChecking = false;
        abortController = null;
      }
    };

    // Initial check on mount
    checkNetwork();

    // Poll network status periodically
    networkPollRef.current = setInterval(checkNetwork, NETWORK_POLL_INTERVAL_MS);

    // Also check when app comes to foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isMountedRef.current) {
        checkNetwork();
      }
    });

    return () => {
      if (networkPollRef.current) {
        clearInterval(networkPollRef.current);
        networkPollRef.current = null;
      }
      if (abortController) {
        abortController.abort();
      }
      appStateSub.remove();
    };
  }, [processSyncQueue]);

  // Initial load with timeout
  useEffect(() => {
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      setIsLoading(true);

      try {
        // Set a timeout for initialization
        initTimeout = setTimeout(() => {
          if (isMountedRef.current && isLoading) {
            console.warn('💧 Initialization timeout - forcing complete');
            setIsLoading(false);
            setError('Initialization took too long. Please restart the app.');
          }
        }, 10000);

        // Try to load cached data first
        const cached = await loadCachedData();
        if (cached && isMountedRef.current) {
          setAmountInLiters(cached.data.amountInLiters);
          setGoalInLiters(cached.data.goalInLiters);
          setIsCompleted(cached.data.isCompleted);
          setStreakDays(cached.data.streakDays);
        }

        // Fetch fresh data from server
        await refreshIntake();
      } catch (err) {
        console.error('💧 Initialization error:', err);
        if (isMountedRef.current) {
          setError('Failed to load water intake data');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        if (initTimeout) clearTimeout(initTimeout);
      }
    };

    init();

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
    };
  }, [loadCachedData, refreshIntake, isLoading]);

  // Refresh when app returns to foreground
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && isMountedRef.current) {
        console.log('💧🔄 App became active – refreshing water intake');
        await refreshIntake();
        await processSyncQueue();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [refreshIntake, processSyncQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate derived values
  const amountInML = amountInLiters * 1000;
  const goalInML = goalInLiters * 1000;
  const remainingLiters = Math.max(goalInLiters - amountInLiters, 0);
  const remainingML = Math.max(goalInML - amountInML, 0);
  const progress = Math.min(amountInLiters / goalInLiters, 1);
  const cupsAmount = Math.round(amountInML / 250);
  const cupsGoal = Math.round(goalInML / 250);

  const quickAddPresets = waterIntakeService.getQuickAddPresets();

  return {
    amountInLiters,
    amountInML,
    goalInLiters,
    goalInML,
    remainingLiters,
    remainingML,
    progress,
    isCompleted,
    streakDays,
    cupsAmount,
    cupsGoal,
    isLoading,
    error,
    isSyncing,
    lastSyncTime,
    addWater,
    syncIntake,
    updateGoal,
    refreshIntake,
    quickAddPresets,
  };
}