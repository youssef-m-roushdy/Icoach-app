import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/**
 * SystemNavigationBarProtector
 * 
 * Works together with Expo Navigation Bar to provide edge-to-edge rendering.
 * It detects if the user is using 3-button navigation vs gesture navigation
 * on Android. For 3-button navigation (>35px bottom inset), it provides an
 * opaque backdrop so scrolling content won't be seen behind the buttons.
 * For gesture navigation, it stays completely transparent.
 */
export const SystemNavigationBarProtector = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Android 3-button navigation bar typically adds >35px (often 48px),
  // whereas gesture navigation handles are around 15-24px.
  const isThreeButtonNav = Platform.OS === 'android' && insets.bottom > 35;

  if (!isThreeButtonNav) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: insets.bottom,
        backgroundColor: colors.background, // Match the current theme exactly
        zIndex: 99999, // Ensure it covers scrolling content cleanly
      }}
    />
  );
};
