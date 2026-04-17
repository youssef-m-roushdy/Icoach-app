import { useState, useEffect, useRef, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import { AppState, Platform } from 'react-native';
import { dailyActiveService } from '../services/dailyActiveService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_GOAL = 10000;
const SYNC_THROTTLE_MS = 5000;          // 5 seconds between syncs
const SYNC_STEP_INTERVAL = 50;          // sync every 50 steps
const CACHE_KEY = '@step_counter_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const NETWORK_POLL_INTERVAL_MS = 30000; // poll every 30 seconds
const NETWORK_CHECK_TIMEOUT_MS = 5000;  // 5 second timeout for network checks
const STEP_PERSIST_INTERVAL_MS = 5000;  // ✅ Save steps to cache every 5 seconds

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
    date: string; // ✅ Store date to reset on new day
  };
  timestamp: number;
}

// ✅ Enhanced pure JS connectivity check with timeout and abort controller
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
    return false;
  }
};

// ✅ Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export function useStepCounter(): StepData & {
  updateGoal: (newGoal: number) => Promise<void>;
  refreshSteps: () => Promise<void>;
  syncSteps: (steps: number) => Promise<void>;
} {
  const { token, refreshAccessToken } = useAuth();

  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const subscriptionRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const todayStepsRef = useRef<number>(0);
  const lastSyncedStepsRef = useRef<number>(0);
  const lastSyncTimestampRef = useRef<number>(0);
  const pendingSyncsRef = useRef<Array<{ steps: number; timestamp: Date }>>([]);
  const isOnlineRef = useRef<boolean>(true);
  const isSyncingRef = useRef(false);
  const networkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const initialLoadCompletedRef = useRef<boolean>(false);
  const currentDateRef = useRef<string>(getTodayString());

  // Helper function to get valid token (with refresh if needed)
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) {
      return tokenRef.current;
    }
    const newToken = await refreshAccessToken();
    return newToken;
  }, [refreshAccessToken]);

  // Load cached data on mount
  const loadCachedData = useCallback(async (): Promise<CachedStepData | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedStepData;
        const today = getTodayString();
        
        // ✅ Check if cache is from today and not expired
        if (parsed.data.date === today && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
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
        data: {
          steps: data.steps,
          goal: data.goal,
          date: getTodayString(),
        },
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Failed to cache step data:', err);
    }
  }, []);

  // ✅ Persist steps periodically (for Android app kills)
  const startStepPersistence = useCallback(() => {
    if (persistIntervalRef.current) {
      clearInterval(persistIntervalRef.current);
    }
    
    persistIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && todayStepsRef.current > 0) {
        console.log('👟💾 Persisting steps to cache:', todayStepsRef.current);
        saveCachedData({ steps: todayStepsRef.current, goal });
      }
    }, STEP_PERSIST_INTERVAL_MS);
  }, [goal, saveCachedData]);

  // Queue a failed / offline sync for later retry
  const queueSync = useCallback((currentSteps: number) => {
    pendingSyncsRef.current.push({ steps: currentSteps, timestamp: new Date() });
    console.log(`👟📦 Queued sync for later (${pendingSyncsRef.current.length} pending)`);
  }, []);

  // Core sync function with retry logic
  const syncStepsWithBackend = useCallback(
    async (currentSteps: number, force: boolean = false, retryCount: number = 0): Promise<void> => {
      const MAX_RETRIES = 3;
      
      if (!isOnlineRef.current) {
        console.log('👟📱 Offline mode – queueing sync for later');
        queueSync(currentSteps);
        return;
      }

      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < SYNC_THROTTLE_MS) {
        return;
      }

      if (isSyncingRef.current && !force) {
        return;
      }

      lastSyncTimestampRef.current = now;
      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const validToken = await getValidToken();
        if (!validToken) {
          return;
        }

        const today = getTodayString();

        const response = await dailyActiveService.syncSteps(validToken, {
          steps: currentSteps,
          date: today,
        });

        if (response.success && response.data) {
          console.log('👟✅ Steps synced successfully:', currentSteps);

          lastSyncedStepsRef.current = currentSteps;
          setLastSyncTime(new Date());
          await saveCachedData({ steps: currentSteps, goal });
        }
      } catch (err) {
        console.error('👟❌ Sync failed:', err);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`👟🔄 Retrying sync (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            syncStepsWithBackend(currentSteps, force, retryCount + 1);
          }, 1000 * (retryCount + 1));
        } else {
          queueSync(currentSteps);
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [queueSync, goal, saveCachedData, getValidToken]
  );

  // Drain the offline queue once back online
  const processSyncQueue = useCallback(async (): Promise<void> => {
    if (!isOnlineRef.current) return;
    if (isSyncingRef.current) return;

    const queueLength = pendingSyncsRef.current.length;
    if (queueLength === 0) return;

    console.log(`👟📦 Processing ${queueLength} queued syncs...`);
    
    const BATCH_SIZE = 5;
    const batches = Math.ceil(queueLength / BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const batch = pendingSyncsRef.current.slice(0, BATCH_SIZE);
      await Promise.all(batch.map(pending => syncStepsWithBackend(pending.steps)));
      pendingSyncsRef.current = pendingSyncsRef.current.slice(BATCH_SIZE);
      
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('👟✅ Queued syncs processed');
  }, [syncStepsWithBackend]);

  // ✅ FIXED: Network polling
  useEffect(() => {
    let isChecking = false;
    let abortController: AbortController | null = null;
    
    const checkNetwork = async () => {
      if (isChecking) return;
      
      try {
        isChecking = true;
        abortController = new AbortController();
        
        const isConnected = await checkIsOnline();
        
        if (!isMountedRef.current) return;
        
        if (isConnected && !isOnlineRef.current) {
          console.log('👟🌐 App is online – processing sync queue');
          isOnlineRef.current = true;
          await processSyncQueue();
        } else if (!isConnected && isOnlineRef.current) {
          console.log('👟📴 App is offline');
          isOnlineRef.current = false;
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('👟 Network check failed:', err);
        }
      } finally {
        isChecking = false;
        abortController = null;
      }
    };

    checkNetwork();
    networkPollRef.current = setInterval(checkNetwork, NETWORK_POLL_INTERVAL_MS);

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

  // Update daily step goal with validation
  const updateGoal = useCallback(
    async (newGoal: number): Promise<void> => {
      if (newGoal < 1000 || newGoal > 50000) {
        console.error('Goal must be between 1,000 and 50,000 steps');
        return;
      }

      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const validToken = await getValidToken();
        if (!validToken) {
          return;
        }

        const response = await dailyActiveService.updateGoal(validToken, {
          goal: newGoal,
        });

        if (response.success && response.data) {
          console.log('👟🎯 Goal updated successfully:', newGoal);

          setGoal(newGoal);
          setLastSyncTime(new Date());
          await saveCachedData({ steps: todayStepsRef.current, goal: newGoal });
        }
      } catch (err) {
        console.error('👟❌ Goal update failed:', err);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [saveCachedData, getValidToken]
  );

  // Manual refresh steps
  const refreshSteps = useCallback(async (forceSync: boolean = false): Promise<void> => {
    // Check if date changed
    const today = getTodayString();
    if (today !== currentDateRef.current) {
      console.log('👟📅 New day detected, resetting steps');
      currentDateRef.current = today;
      todayStepsRef.current = 0;
      setSteps(0);
      lastSyncedStepsRef.current = 0;
    }

    // Android doesn't support getStepCountAsync with date range
    if (Platform.OS === 'android') {
      console.log('👟 Android: Using tracked steps for refresh:', todayStepsRef.current);
      const stepDifference = Math.abs(todayStepsRef.current - lastSyncedStepsRef.current);
      if (forceSync || stepDifference >= SYNC_STEP_INTERVAL) {
        await syncStepsWithBackend(todayStepsRef.current, forceSync);
      }
      return;
    }

    // iOS only - get step count for today
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, new Date());

      setSteps(result.steps);
      todayStepsRef.current = result.steps;

      await saveCachedData({ steps: result.steps, goal });

      const stepDifference = Math.abs(result.steps - lastSyncedStepsRef.current);
      if (forceSync || stepDifference >= SYNC_STEP_INTERVAL) {
        await syncStepsWithBackend(result.steps, forceSync);
      }
    } catch (err) {
      console.error('👟❌ Failed to refresh steps:', err);
    }
  }, [goal, saveCachedData, syncStepsWithBackend]);

  // Manual sync steps
  const syncSteps = useCallback(
    async (stepsToSync: number): Promise<void> => {
      await syncStepsWithBackend(stepsToSync, true);
    },
    [syncStepsWithBackend]
  );

  // Fetch goal from server
  const fetchGoal = useCallback(async (): Promise<void> => {
    try {
      const validToken = await getValidToken();
      if (!validToken) return;

      const goalData = await dailyActiveService.getGoal(validToken);
      if (goalData.goal) {
        setGoal(goalData.goal);
      }
    } catch (err) {
      console.error('👟❌ Failed to fetch goal:', err);
    }
  }, [getValidToken]);

  // ✅ FIXED: Main initialization with Android compatibility and step persistence
  useEffect(() => {
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      if (initialLoadCompletedRef.current) return;
      
      setIsLoading(true);

      try {
        initTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.warn('👟 Initialization timeout - forcing complete');
            setIsLoading(false);
            initialLoadCompletedRef.current = true;
          }
        }, 10000);

        await fetchGoal();

        // ✅ Load cached steps from today
        const cached = await loadCachedData();
        if (cached && isMountedRef.current) {
          const today = getTodayString();
          
          // Only use cache if it's from today
          if (cached.data.date === today) {
            console.log('👟📂 Loaded cached steps:', cached.data.steps);
            setSteps(cached.data.steps);
            todayStepsRef.current = cached.data.steps;
            lastSyncedStepsRef.current = cached.data.steps;
          } else {
            console.log('👟📅 New day, resetting steps');
            todayStepsRef.current = 0;
            setSteps(0);
          }
        }

        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission denied. Please enable pedometer access in settings.');
          setIsLoading(false);
          initialLoadCompletedRef.current = true;
          return;
        }

        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);

        if (!available) {
          setError('Pedometer is not available on this device');
          setIsLoading(false);
          initialLoadCompletedRef.current = true;
          return;
        }

        // ✅ iOS: Get accurate step count for today
        if (Platform.OS === 'ios') {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(startOfDay, new Date());
          
          todayStepsRef.current = result.steps;
          
          if (isMountedRef.current) {
            setSteps(result.steps);
            await syncStepsWithBackend(result.steps, true);
          }
        } else {
          // Android: Sync cached steps with server
          console.log('👟 Android: Starting with', todayStepsRef.current, 'steps');
          if (todayStepsRef.current > 0) {
            await syncStepsWithBackend(todayStepsRef.current, true);
          }
        }

        // ✅ Start step persistence (saves to cache every 5 seconds)
        startStepPersistence();

        // Watch for step updates (works on both iOS and Android)
        subscriptionRef.current = Pedometer.watchStepCount((res) => {
          if (!isMountedRef.current) return;

          // Increment step count
          todayStepsRef.current = todayStepsRef.current + 1;
          
          setSteps(todayStepsRef.current);

          const shouldSync =
            todayStepsRef.current % SYNC_STEP_INTERVAL === 0 ||
            (todayStepsRef.current >= goal && lastSyncedStepsRef.current < goal);

          if (shouldSync) {
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
              if (isMountedRef.current) {
                syncStepsWithBackend(todayStepsRef.current);
              }
            }, 1000);
          }
        });

        initialLoadCompletedRef.current = true;
        setIsLoading(false);
      } catch (e) {
        console.error('👟 Initialization error:', e);
        if (isMountedRef.current) {
          setError('Failed to initialize step counter. Please restart the app.');
          setIsLoading(false);
        }
      } finally {
        if (initTimeout) clearTimeout(initTimeout);
      }
    };

    init();

    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && isMountedRef.current && initialLoadCompletedRef.current) {
        console.log('👟🔄 App became active – refreshing');
        
        // Check if date changed while app was in background
        const today = getTodayString();
        if (today !== currentDateRef.current) {
          console.log('👟📅 New day detected on app resume');
          currentDateRef.current = today;
          todayStepsRef.current = 0;
          setSteps(0);
          lastSyncedStepsRef.current = 0;
        }
        
        await refreshSteps();
        await processSyncQueue();
      }
    });

    return () => {
      isMountedRef.current = false;
      if (syncTimeout) clearTimeout(syncTimeout);
      if (initTimeout) clearTimeout(initTimeout);
      if (persistIntervalRef.current) {
        clearInterval(persistIntervalRef.current);
        persistIntervalRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      appStateSub.remove();
    };
  }, []); // ✅ EMPTY dependency array

  return {
    steps,
    goal,
    remaining: Math.max(goal - steps, 0),
    progress: goal > 0 ? Math.min(steps / goal, 1) : 0,
    isAvailable,
    isLoading,
    error,
    isSyncing,
    lastSyncTime,
    updateGoal,
    refreshSteps: () => refreshSteps(false),
    syncSteps,
  };
}