import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { waterIntakeService } from '../services/waterIntakeService';
import { getToken } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_GOAL_LITERS = 2.0;
const SYNC_THROTTLE_MS = 3000;   // 3 seconds between syncs
const CACHE_KEY = '@water_intake_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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

export function useWaterIntake(): WaterIntakeData & {
  addWater: (amount: number, unit: 'L' | 'ML') => Promise<void>;
  syncIntake: (amount: number, unit: 'L' | 'ML', date?: string) => Promise<void>;
  updateGoal: (goalInLiters: number) => Promise<void>;
  refreshIntake: () => Promise<void>;
  quickAddPresets: Array<{ amount: number; unit: 'L' | 'ML'; label: string }>;
} {
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
  const isOnlineRef = useRef<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const isSyncingRef = useRef(false);

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

  // Core sync function — stable reference (no state in deps)
  const syncIntake = useCallback(
    async (amount: number, unit: 'L' | 'ML', date?: string): Promise<void> => {
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
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const today = date || new Date().toISOString().split('T')[0] ?? '';

        const response = await waterIntakeService.syncIntake(token, {
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
            // Add toast / notification here if desired
          }
        }
      } catch (err) {
        console.error('💧❌ Sync failed:', err);
        queueSync(amount, unit);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [goalInLiters, saveCachedData, queueSync]
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
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const response = await waterIntakeService.addIntake(token, {
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
    [saveCachedData, queueSync]
  );

  // Update daily goal
  const updateGoal = useCallback(
    async (newGoalInLiters: number): Promise<void> => {
      if (isSyncingRef.current) {
        console.log('💧⏭️ Skipping goal update – already syncing');
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const response = await waterIntakeService.updateGoal(token, {
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
    [streakDays, saveCachedData]
  );

  // Refresh intake data from server
  const refreshIntake = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const todayData = await waterIntakeService.getToday(token);
      
      if (todayData) {
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
  }, [saveCachedData]);

  // Drain the offline queue once back online
  const processSyncQueue = useCallback(async (): Promise<void> => {
    if (!isOnlineRef.current || pendingSyncsRef.current.length === 0) return;

    console.log('💧🔄 Processing queued water syncs...');
    
    while (pendingSyncsRef.current.length > 0) {
      const pending = pendingSyncsRef.current[0];
      await syncIntake(pending.amount, pending.unit);
      pendingSyncsRef.current.shift();
    }
    
    console.log('💧✅ Queued water syncs processed');
  }, [syncIntake]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('💧🌐 App is online – processing sync queue');
      isOnlineRef.current = true;
      processSyncQueue();
    };
    const handleOffline = () => {
      console.log('💧📴 App is offline');
      isOnlineRef.current = false;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [processSyncQueue]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIsLoading(true);

      try {
        // Try to load cached data first
        const cached = await loadCachedData();
        if (cached && mounted) {
          setAmountInLiters(cached.data.amountInLiters);
          setGoalInLiters(cached.data.goalInLiters);
          setIsCompleted(cached.data.isCompleted);
          setStreakDays(cached.data.streakDays);
        }

        // Fetch fresh data from server
        await refreshIntake();
      } catch (err) {
        console.error('💧 Initialization error:', err);
        if (mounted) {
          setError('Failed to load water intake data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();
  }, [loadCachedData, refreshIntake]);

  // Refresh when app returns to foreground
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        console.log('💧🔄 App became active – refreshing water intake');
        await refreshIntake();
        await processSyncQueue();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [refreshIntake, processSyncQueue]);

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