import React from 'react';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from 'react-native-toast-message';
import { COLORS } from '../constants/colors';

const getContainerStyle = (
  isDark: boolean,
  accentColor: string
): ViewStyle => ({
  borderLeftColor: accentColor,
  backgroundColor: isDark ? COLORS.modalBackground : COLORS.lightCard,
  borderColor: isDark ? COLORS.darkGray : COLORS.lightBorder,
  shadowOpacity: isDark ? 0.22 : 0.12,
});

const getTitleStyle = (isDark: boolean): TextStyle => ({
  color: isDark ? COLORS.white : COLORS.lightText,
});

const getSubtitleStyle = (isDark: boolean): TextStyle => ({
  color: isDark ? COLORS.textSecondary : COLORS.lightTextSecondary,
});

export const createToastConfig = (isDark: boolean): ToastConfig => ({
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, getContainerStyle(isDark, COLORS.success)]}
      contentContainerStyle={styles.content}
      text1Style={[styles.text1, getTitleStyle(isDark)]}
      text2Style={[styles.text2, getSubtitleStyle(isDark)]}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toast, getContainerStyle(isDark, COLORS.error)]}
      contentContainerStyle={styles.content}
      text1Style={[styles.text1, getTitleStyle(isDark)]}
      text2Style={[styles.text2, getSubtitleStyle(isDark)]}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, getContainerStyle(isDark, COLORS.primary)]}
      contentContainerStyle={styles.content}
      text1Style={[styles.text1, getTitleStyle(isDark)]}
      text2Style={[styles.text2, getSubtitleStyle(isDark)]}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
});

const styles = StyleSheet.create({
  toast: {
    width: '92%',
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 5,
    paddingVertical: 6,

    // Shadow
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  content: {
    paddingHorizontal: 14,
  },

  text1: {
    fontSize: 15,
    fontWeight: '700',
  },

  text2: {
    fontSize: 13,
    fontWeight: '400',
  },
});