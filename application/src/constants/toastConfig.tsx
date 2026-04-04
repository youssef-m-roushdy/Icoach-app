import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastColors {
  accent: string;
  iconBg: string;
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  subtitleColor: string;
  shadowColor: string;
  shadowOpacity: number;
}

const LIGHT_COLORS: Record<ToastVariant, ToastColors> = {
  success: {
    accent: '#C5981B',
    iconBg: 'rgba(197,152,27,0.12)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(197,152,27,0.25)',
    titleColor: '#1A1A1A',
    subtitleColor: '#6B7280',
    shadowColor: '#000',
    shadowOpacity: 0.10,
  },
  error: {
    accent: '#E53E3E',
    iconBg: 'rgba(229,62,62,0.10)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(229,62,62,0.20)',
    titleColor: '#1A1A1A',
    subtitleColor: '#6B7280',
    shadowColor: '#000',
    shadowOpacity: 0.10,
  },
  info: {
    accent: '#C5981B',
    iconBg: 'rgba(197,152,27,0.10)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(197,152,27,0.20)',
    titleColor: '#1A1A1A',
    subtitleColor: '#6B7280',
    shadowColor: '#000',
    shadowOpacity: 0.10,
  },
};

const DARK_COLORS: Record<ToastVariant, ToastColors> = {
  success: {
    accent: '#FFD700',
    iconBg: 'rgba(255,215,0,0.12)',
    cardBg: 'rgba(45,45,45,0.95)',
    cardBorder: 'rgba(255,215,0,0.35)',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
  error: {
    accent: '#FC8181',
    iconBg: 'rgba(252,129,129,0.12)',
    cardBg: 'rgba(45,45,45,0.95)',
    cardBorder: 'rgba(252,129,129,0.20)',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
  info: {
    accent: '#FFD700',
    iconBg: 'rgba(255,215,0,0.10)',
    cardBg: 'rgba(45,45,45,0.95)',
    cardBorder: 'rgba(255,215,0,0.15)',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
};

const ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
};

// Module-level ref — written by AppContent on every render
export const isDarkRef = { current: false };

const CustomToast: React.FC<{ text1?: string; text2?: string; variant: ToastVariant }> = ({
  text1,
  text2,
  variant,
}) => {
  const c = isDarkRef.current ? DARK_COLORS[variant] : LIGHT_COLORS[variant];

  return (
    <View style={[styles.card, {
      backgroundColor: c.cardBg,
      borderColor: c.cardBorder,
      shadowColor: c.shadowColor,
      shadowOpacity: c.shadowOpacity,
    }]}>
      <View style={[styles.accentBar, { backgroundColor: c.accent }]} />
      <View style={[styles.iconWrapper, { backgroundColor: c.iconBg }]}>
        <Ionicons name={ICONS[variant]} size={22} color={c.accent} />
      </View>
      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.title, { color: c.titleColor }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.subtitle, { color: c.subtitleColor }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const config: ToastConfig = {
  success: ({ text1, text2 }) => <CustomToast text1={text1} text2={text2} variant="success" />,
  error:   ({ text1, text2 }) => <CustomToast text1={text1} text2={text2} variant="error" />,
  info:    ({ text1, text2 }) => <CustomToast text1={text1} text2={text2} variant="info" />,
};

export default config;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 0,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
});