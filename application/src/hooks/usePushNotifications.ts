// hooks/usePushNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuth } from '../context';
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_TOKEN_KEY = '@icoach_expo_push_token';
const FCM_TOKEN_KEY = '@icoach_fcm_push_token';

export function usePushNotifications() {
  const { token: authToken, user } = useAuth();
  const previousUserId = useRef<string | number | null>(null);
  const isRegistering = useRef(false);

  useEffect(() => {
    const userId = user?.id || null;

    // Skip if no user, no authToken, or same user already registered
    if (!userId || !authToken || userId === previousUserId.current) return;

    // Prevent concurrent registrations
    if (isRegistering.current) return;

    previousUserId.current = userId;
    isRegistering.current = true;

    let isMounted = true;

    async function registerForPushNotifications() {
      try {
        console.log('🔄 Setting up push notifications for user:', userId);

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          console.log('📱 Requesting notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('❌ Notification permissions denied');
          isRegistering.current = false;
          return;
        }

        console.log('✅ Notification permissions granted');

        // Read project ID from app config (EAS builds prefer easConfig)
        const projectId =
          (Constants.easConfig?.projectId as string | undefined) ||
          (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

        if (!projectId) {
          console.error(
            '❌ Project ID not found. Check app.json under extra.eas.projectId'
          );
          isRegistering.current = false;
          return;
        }

        console.log('📋 Using project ID:', projectId);

        // Android notification channel (required for high importance notifications)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
          });
        }

        // Get Expo push token
        const { data: expoToken } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        if (!isMounted || !expoToken) {
          isRegistering.current = false;
          return;
        }

        console.log('📲 Expo push token:', expoToken);

        // Filter out unsupported platforms
        const deviceType = (['ios', 'android', 'web'] as const).includes(
          Platform.OS as any
        )
          ? (Platform.OS as 'ios' | 'android' | 'web')
          : undefined;

        // ✅ Use non-null assertion (!) since we checked authToken at the top
        const response = await notificationService.registerExpoToken(
          { token: expoToken, deviceType, provider: 'expo' },
          authToken!
        );

        if (response.success) {
          console.log('✅ Expo push token registered with backend');
          // Save token so logout can remove it
          await AsyncStorage.setItem(EXPO_TOKEN_KEY, expoToken);
        } else {
          console.error('❌ Backend registration failed:', response.message);
        }

        // Register native FCM token on Android for direct Firebase delivery
        if (Platform.OS === 'android') {
          const devicePushToken = await Notifications.getDevicePushTokenAsync();
          if (devicePushToken?.type === 'fcm' && devicePushToken.data) {
            const fcmResponse = await notificationService.registerExpoToken(
              {
                token: devicePushToken.data,
                deviceType: 'android',
                provider: 'fcm',
              },
              authToken!
            );

            if (fcmResponse.success) {
              console.log('✅ FCM token registered with backend');
              await AsyncStorage.setItem(FCM_TOKEN_KEY, devicePushToken.data);
            } else {
              console.error('❌ FCM registration failed:', fcmResponse.message);
            }
          } else {
            console.warn('⚠️ FCM token not available on this device');
          }
        }
      } catch (error) {
        console.error('❌ Push notification setup failed:', error);
      } finally {
        isRegistering.current = false;
      }
    }

    registerForPushNotifications();

    return () => {
      isMounted = false;
      // Token removal happens in AuthContext.logout()
    };
  }, [user?.id, authToken]);
}