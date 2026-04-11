import { useState, useEffect, useRef, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import { AppState } from 'react-native';
import { dailyActiveService } from '../services/dailyActiveService';
import { getToken } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_GOAL = 10000;
const SYNC_THROTTLE_MS = 5000;   // 5 seconds between syncs
const SYNC_STEP_INTERVAL = 50;   // sync every 50 steps
const CACHE_KEY = '@step_counter_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface StepData {
  steps: number;
  goal: number;
  remaining: number;
  progress: number;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

interface CachedStepData {
  data: {
    steps: number;
    goal: number;
  };
  timestamp: number;
}

export function useStepCounter(): StepData & {
  updateGoal: (newGoal: number) => Promise<void>;
  refreshSteps: () => Promise<void>;
  syncSteps: (steps: number) => Promise<void>;
} {
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const subscriptionRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const baseStepsRef = useRef<number | null>(null);
  const pastStepsRef = useRef<number>(0);
  const lastSyncedStepsRef = useRef<number>(0);
  const lastSyncTimestampRef = useRef<number>(0);
  const pendingSyncsRef = useRef<Array<{ steps: number; timestamp: Date }>>([]);
  const isOnlineRef = useRef<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const isSyncingRef = useRef(false);

  // Load cached data on mount
  const loadCachedData = useCallback(async (): Promise<CachedStepData | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedStepData;
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load cached step data:', err);
    }
    return null;
  }, []);

  // Save data to cache
  const saveCachedData = useCallback(async (data: { steps: number; goal: number }): Promise<void> => {
    try {
      const cacheData: CachedStepData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Failed to cache step data:', err);
    }
  }, []);

  // Queue a failed / offline sync for later retry
  const queueSync = useCallback((currentSteps: number) => {
    pendingSyncsRef.current.push({ steps: currentSteps, timestamp: new Date() });
    console.log(`📦 Queued sync for later (${pendingSyncsRef.current.length} pending)`);
  }, []);

  // Core sync function — stable reference (no state in deps)
  const syncStepsWithBackend = useCallback(
    async (currentSteps: number, force: boolean = false): Promise<void> => {
      if (!isOnlineRef.current) {
        console.log('📱 Offline mode – queueing sync for later');
        queueSync(currentSteps);
        return;
      }

      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < SYNC_THROTTLE_MS) {
        console.log('⏭️ Skipping sync – throttled');
        return;
      }

      if (isSyncingRef.current && !force) {
        console.log('⏭️ Skipping sync – already syncing');
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

        const today = new Date().toISOString().split('T')[0] ?? '';

        const response = await dailyActiveService.syncSteps(token, {
          steps: currentSteps,
          date: today,
        });

        if (response.success && response.data) {
          console.log('✅ Steps synced successfully:', {
            steps: currentSteps,
            pointsAdded: response.data.pointsAdded,
            goalAchieved: response.data.goalAchieved,
          });

          lastSyncedStepsRef.current = currentSteps;
          setLastSyncTime(new Date());

          await saveCachedData({ steps: currentSteps, goal });

          if (response.data.goalAchieved) {
            console.log('🎉 Goal achieved! Points earned:', response.data.pointsAdded);
            // Add toast / notification here if desired
          }
        }
      } catch (err) {
        console.error('Sync failed:', err);
        queueSync(currentSteps);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [queueSync, goal, saveCachedData]
  );

  // Drain the offline queue once back online
  const processSyncQueue = useCallback(async (): Promise<void> => {
    if (!isOnlineRef.current) return;

    while (pendingSyncsRef.current.length > 0) {
      const pending = pendingSyncsRef.current[0];
      await syncStepsWithBackend(pending.steps);
      pendingSyncsRef.current.shift();
    }
  }, [syncStepsWithBackend]);

  // Update daily step goal
  const updateGoal = useCallback(
    async (newGoal: number): Promise<void> => {
      if (newGoal < 1000 || newGoal > 50000) {
        console.error('Goal must be between 1,000 and 50,000 steps');
        return;
      }

      if (isSyncingRef.current) {
        console.log('⏭️ Skipping goal update – already syncing');
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

        const response = await dailyActiveService.updateGoal(token, {
          goal: newGoal,
        });

        if (response.success && response.data) {
          console.log('🎯 Goal updated successfully:', newGoal);
          
          setGoal(newGoal);
          setLastSyncTime(new Date());

          await saveCachedData({ steps, goal: newGoal });

          // Refresh steps to get updated completion status
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, new Date());
          
          setSteps(result.steps);
          pastStepsRef.current = result.steps;

          if (response.data.goalAchieved) {
            console.log('🎉 New goal already achieved!');
          }
        }
      } catch (err) {
        console.error('Goal update failed:', err);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [steps, saveCachedData]
  );

  // Manual refresh steps
  const refreshSteps = useCallback(async (): Promise<void> => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, new Date());

      setSteps(result.steps);
      pastStepsRef.current = result.steps;
      baseStepsRef.current = null;

      await saveCachedData({ steps: result.steps, goal });

      if (Math.abs(result.steps - lastSyncedStepsRef.current) >= SYNC_STEP_INTERVAL) {
        await syncStepsWithBackend(result.steps);
      }
    } catch (err) {
      console.error('Failed to refresh steps:', err);
    }
  }, [goal, saveCachedData, syncStepsWithBackend]);

  // Manual sync steps
  const syncSteps = useCallback(
    async (stepsToSync: number): Promise<void> => {
      await syncStepsWithBackend(stepsToSync, true);
    },
    [syncStepsWithBackend]
  );

  // Fetch goal from server on mount
  const fetchGoal = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      if (!token) return;

      const goalData = await dailyActiveService.getGoal(token);
      if (goalData.goal) {
        setGoal(goalData.goal);
      }
    } catch (err) {
      console.error('Failed to fetch goal:', err);
    }
  }, []);

  // Online / offline listeners (web only)
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 App is online – processing sync queue');
      isOnlineRef.current = true;
      processSyncQueue();
    };
    const handleOffline = () => {
      console.log('📴 App is offline');
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

  // Main initialisation + pedometer subscription
  useEffect(() => {
    let mounted = true;
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      setIsLoading(true);

      try {
        // Fetch goal from server first
        await fetchGoal();

        // Try to load cached steps
        const cached = await loadCachedData();
        if (cached && mounted) {
          setSteps(cached.data.steps);
          pastStepsRef.current = cached.data.steps;
        }

        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission denied. Please enable pedometer access in settings.');
          setIsLoading(false);
          return;
        }

        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);

        if (!available) {
          setError('Pedometer is not available on this device');
          setIsLoading(false);
          return;
        }

        // Get total steps since midnight as the authoritative source
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(startOfDay, new Date());

        pastStepsRef.current = result.steps;

        if (mounted) {
          setSteps(result.steps);
          // Force an initial sync so the backend is immediately up to date
          await syncStepsWithBackend(result.steps, true);
        }

        // Real-time step updates
        subscriptionRef.current = Pedometer.watchStepCount((res) => {
          if (!mounted) return;

          if (baseStepsRef.current === null) {
            // First reading after the subscription opened
            baseStepsRef.current = res.steps;
          } else {
            const newStepsSinceOpen = res.steps - baseStepsRef.current;
            const totalSteps = pastStepsRef.current + newStepsSinceOpen;

            setSteps(totalSteps);

            // Sync on every SYNC_STEP_INTERVAL steps, or when crossing the goal
            const shouldSync =
              totalSteps % SYNC_STEP_INTERVAL === 0 ||
              (totalSteps >= goal && lastSyncedStepsRef.current < goal);

            if (shouldSync) {
              // Debounce so rapid sensor ticks don't fire multiple syncs
              if (syncTimeout) clearTimeout(syncTimeout);
              syncTimeout = setTimeout(() => {
                syncStepsWithBackend(totalSteps);
              }, 1000);
            }
          }
        });

        setIsLoading(false);
      } catch (e) {
        console.error('Initialization error:', e);
        if (mounted) {
          setError('Failed to initialize step counter. Please restart the app.');
          setIsLoading(false);
        }
      }
    };

    init();

    // Refresh steps when the app returns to the foreground
    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        console.log('🔄 App became active – refreshing step count');
        await refreshSteps();
        await processSyncQueue();
      }
    });

    return () => {
      mounted = false;
      if (syncTimeout) clearTimeout(syncTimeout);
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      appStateSub.remove();
    };
  }, [syncStepsWithBackend, processSyncQueue, refreshSteps, loadCachedData, fetchGoal]);

  return {
    steps,
    goal,
    remaining: Math.max(goal - steps, 0),
    progress: Math.min(steps / goal, 1),
    isAvailable,
    isLoading,
    error,
    isSyncing,
    lastSyncTime,
    updateGoal,
    refreshSteps,
    syncSteps,
  };
}