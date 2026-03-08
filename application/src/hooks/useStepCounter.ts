import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { AppState, AppStateStatus, Platform } from 'react-native';

const DAILY_GOAL = 10000;

export interface StepData {
  steps: number;
  goal: number;
  remaining: number;
  progress: number;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStepCounter(): StepData {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const baseStepsRef = useRef<number | null>(null); // track starting point

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIsLoading(true);

      try {
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission denied');
          setIsLoading(false);
          return;
        }

        const available = await Pedometer.isAvailableAsync();
        if (!mounted) return;
        setIsAvailable(available);

        if (!available) {
          setError('Step counter not available on this device');
          setIsLoading(false);
          return;
        }

        // Try getStepCountAsync first (iOS + some Android)
        if (Platform.OS === 'ios') {
          try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const result = await Pedometer.getStepCountAsync(start, new Date());
            if (mounted) setSteps(result.steps);
          } catch {
            // fallback to watchStepCount
          }
        }

        // watchStepCount works on ALL platforms
        // It gives cumulative steps since subscription started
        subscriptionRef.current = Pedometer.watchStepCount((result) => {
          if (!mounted) return;
          
          // First update — set as baseline
          if (baseStepsRef.current === null) {
            baseStepsRef.current = result.steps;
            setSteps(0);
          } else {
            // Steps taken since app opened
            setSteps(result.steps - baseStepsRef.current);
          }
        });

        setIsLoading(false);
      } catch (e) {
        if (mounted) {
          setError('Failed to initialize step counter');
          setIsLoading(false);
        }
      }
    };

    init();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && Platform.OS === 'ios') {
        // Re-fetch full day count when returning on iOS
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        Pedometer.getStepCountAsync(start, new Date())
          .then((r) => setSteps(r.steps))
          .catch(() => {});
      }
    });

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      appStateSub.remove();
    };
  }, []);

  return {
    steps,
    goal: DAILY_GOAL,
    remaining: Math.max(DAILY_GOAL - steps, 0),
    progress: Math.min(steps / DAILY_GOAL, 1),
    isAvailable,
    isLoading,
    error,
  };
}