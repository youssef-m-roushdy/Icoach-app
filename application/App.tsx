import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, ThemeProvider, useAuth } from './src/context';
import { useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import i18n from './i18n/i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import toastConfig, { isDarkRef } from './src/constants/toastConfig';

import './i18n/i18n';
import { StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { SystemNavigationProvider } from './src/context/SystemNavigationContext';

const AppContent = () => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Write to the ref synchronously on every render — no stale closures
  isDarkRef.current = theme === 'dark';

  const isThreeButtonNav = Platform.OS === 'android' && insets.bottom > 35;
  const edges: Edge[] = isThreeButtonNav
    ? ['top', 'right', 'left', 'bottom']
    : ['top', 'right', 'left'];

  useEffect(() => {
    if (Platform.OS === 'android') {
      const configureNavBar = async () => {
        try {
          await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
        } catch (error) {
          console.warn('Navigation bar configuration error:', error);
        }
      };
      configureNavBar();
    }
  }, [theme]);

  return (
    <SystemNavigationProvider isThreeButtonNav={isThreeButtonNav} systemBottomInset={insets.bottom}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" style={theme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
        {/* Static config — isDarkRef.current is read fresh each time a toast appears */}
        <Toast config={toastConfig} />
      </View>
    </SystemNavigationProvider>
  );
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
          offlineAccess: true,
          forceCodeForRefreshToken: true,
        });

        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang) {
          await i18n.changeLanguage(savedLang);
        }

        setAppReady(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!appReady) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});