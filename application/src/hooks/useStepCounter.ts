import { useState, useEffect, useRef, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import { AppState } from 'react-native';
import { dailyActiveService } from '../services/dailyActiveService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_GOAL = 10000;
const SYNC_THROTTLE_MS = 5000;          // 5 seconds between syncs
const SYNC_STEP_INTERVAL = 50;          // sync every 50 steps
const CACHE_KEY = '@step_counter_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const NETWORK_POLL_INTERVAL_MS = 3000;  // poll every 3 seconds
const NETWORK_CHECK_TIMEOUT_MS = 5000;  // 5 second timeout for network checks

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
    // Timeout or network error means offline
    return false;
  }
};

export function useStepCounter(): StepData & {
  updateGoal: (newGoal: number) => Promise<void>;
  refreshSteps: () => Promise<void>;
  syncSteps: (steps: number) => Promise<void>;
} {
  const { token, refreshAccessToken } = useAuth();

  // Keep a stable reference to token to avoid re-fetches when token refreshes automatically
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
  const baseStepsRef = useRef<number | null>(null);
  const pastStepsRef = useRef<number>(0);
  const lastSyncedStepsRef = useRef<number>(0);
  const lastSyncTimestampRef = useRef<number>(0);
  const pendingSyncsRef = useRef<Array<{ steps: number; timestamp: Date }>>([]);
  const isOnlineRef = useRef<boolean>(true);
  const isSyncingRef = useRef(false);
  const networkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);

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

  // Core sync function with retry logic
  const syncStepsWithBackend = useCallback(
    async (currentSteps: number, force: boolean = false, retryCount: number = 0): Promise<void> => {
      const MAX_RETRIES = 3;
      
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
        const validToken = await getValidToken();
        if (!validToken) {
          console.error('No auth token available');
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        const response = await dailyActiveService.syncSteps(validToken, {
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
          }
        }
      } catch (err) {
        console.error('Sync failed:', err);
        
        // Retry logic for network errors
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying sync (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            syncStepsWithBackend(currentSteps, force, retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
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

  // Drain the offline queue once back online with batch processing
  const processSyncQueue = useCallback(async (): Promise<void> => {
    // Don't process if offline
    if (!isOnlineRef.current) return;
    
    // Prevent processing if already syncing
    if (isSyncingRef.current) {
      console.log('⏭️ Already syncing, skipping queue processing');
      return;
    }

    const queueLength = pendingSyncsRef.current.length;
    if (queueLength === 0) return;

    console.log(`📦 Processing ${queueLength} queued syncs...`);
    
    // Process in batches to avoid overwhelming the server
    const BATCH_SIZE = 5;
    const batches = Math.ceil(queueLength / BATCH_SIZE);
    
    for (let i = 0; i < batches; i++) {
      const batch = pendingSyncsRef.current.slice(0, BATCH_SIZE);
      await Promise.all(batch.map(pending => syncStepsWithBackend(pending.steps)));
      pendingSyncsRef.current = pendingSyncsRef.current.slice(BATCH_SIZE);
      
      // Small delay between batches
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('✅ Queued syncs processed');
  }, [syncStepsWithBackend]);

  // ✅ Enhanced network polling with abort controller and retry logic
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
          console.log('🌐 App is online – processing sync queue');
          isOnlineRef.current = true;
          await processSyncQueue();
        } else if (!isConnected && isOnlineRef.current) {
          console.log('📴 App is offline');
          isOnlineRef.current = false;
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Network check failed:', err);
      } finally {
        isChecking = false;
        abortController = null;
      }
    };

    // Immediate check on mount
    checkNetwork();

    // Poll every 3 seconds
    networkPollRef.current = setInterval(checkNetwork, NETWORK_POLL_INTERVAL_MS);

    return () => {
      if (networkPollRef.current) {
        clearInterval(networkPollRef.current);
        networkPollRef.current = null;
      }
      if (abortController) {
        abortController.abort();
      }
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
        console.log('⏭️ Skipping goal update – already syncing');
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

        const response = await dailyActiveService.updateGoal(validToken, {
          goal: newGoal,
        });

        if (response.success && response.data) {
          console.log('🎯 Goal updated successfully:', newGoal);

          setGoal(newGoal);
          setLastSyncTime(new Date());
          await saveCachedData({ steps, goal: newGoal });

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
    [steps, saveCachedData, getValidToken]
  );

  // Manual refresh steps with force sync option
  const refreshSteps = useCallback(async (forceSync: boolean = false): Promise<void> => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, new Date());

      setSteps(result.steps);
      pastStepsRef.current = result.steps;
      baseStepsRef.current = null;

      await saveCachedData({ steps: result.steps, goal });

      const stepDifference = Math.abs(result.steps - lastSyncedStepsRef.current);
      if (forceSync || stepDifference >= SYNC_STEP_INTERVAL) {
        await syncStepsWithBackend(result.steps, forceSync);
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
      const validToken = await getValidToken();
      if (!validToken) return;

      const goalData = await dailyActiveService.getGoal(validToken);
      if (goalData.goal) {
        setGoal(goalData.goal);
      }
    } catch (err) {
      console.error('Failed to fetch goal:', err);
    }
  }, [getValidToken]);

  // Main initialisation + pedometer subscription
  useEffect(() => {
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      setIsLoading(true);

      try {
        // Set a timeout for initialization
        initTimeout = setTimeout(() => {
          if (isMountedRef.current && isLoading) {
            console.warn('Initialization timeout - forcing complete');
            setIsLoading(false);
            setError('Initialization took too long. Please restart the app.');
          }
        }, 10000);

        await fetchGoal();

        const cached = await loadCachedData();
        if (cached && isMountedRef.current) {
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

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(startOfDay, new Date());

        pastStepsRef.current = result.steps;

        if (isMountedRef.current) {
          setSteps(result.steps);
          await syncStepsWithBackend(result.steps, true);
        }

        subscriptionRef.current = Pedometer.watchStepCount((res) => {
          if (!isMountedRef.current) return;

          if (baseStepsRef.current === null) {
            baseStepsRef.current = res.steps;
          } else {
            const newStepsSinceOpen = res.steps - baseStepsRef.current;
            const totalSteps = pastStepsRef.current + newStepsSinceOpen;

            setSteps(totalSteps);

            const shouldSync =
              totalSteps % SYNC_STEP_INTERVAL === 0 ||
              (totalSteps >= goal && lastSyncedStepsRef.current < goal);

            if (shouldSync) {
              if (syncTimeout) clearTimeout(syncTimeout);
              syncTimeout = setTimeout(() => {
                if (isMountedRef.current) {
                  syncStepsWithBackend(totalSteps);
                }
              }, 1000);
            }
          }
        });

        setIsLoading(false);
      } catch (e) {
        console.error('Initialization error:', e);
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
      if (state === 'active' && isMountedRef.current) {
        console.log('🔄 App became active – refreshing step count');
        await refreshSteps();
        await processSyncQueue();
      }
    });

    return () => {
      isMountedRef.current = false;
      if (syncTimeout) clearTimeout(syncTimeout);
      if (initTimeout) clearTimeout(initTimeout);
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      appStateSub.remove();
    };
  }, [syncStepsWithBackend, processSyncQueue, refreshSteps, loadCachedData, fetchGoal, goal, isLoading]);

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
    refreshSteps: () => refreshSteps(false),
    syncSteps,
  };
}