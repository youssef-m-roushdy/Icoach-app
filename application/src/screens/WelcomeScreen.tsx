import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { LanguageSelector } from '../components/common';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

const FEATURES = [
  { icon: 'robot-outline' as const, label: 'AI Coach' },
  { icon: 'food-apple-outline' as const, label: 'Nutrition' },
  { icon: 'dumbbell' as const, label: 'Workouts' },
  { icon: 'chart-line' as const, label: 'Progress' },
];

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { theme, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isLight = theme === 'light';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
        />
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isLight ? 'moon' : 'sunny'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
          <LanguageSelector />
        </View>
      </View>

      {/* Hero illustration - icon composition */}
      <View style={styles.heroSection}>
        {/* Main circle */}
        <View style={[styles.heroCircle, { backgroundColor: isLight ? colors.statBg : colors.surface }]}>
          <LinearGradient
            colors={isLight ? ['#C5981B', '#D4A527'] : ['#FFD700', '#C5981B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconCircle}
          >
            <MaterialCommunityIcons name="arm-flex" size={52} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Floating orbiting icons */}
        <View style={[styles.orbitIcon, styles.orbitIcon1, { backgroundColor: isLight ? colors.surface : colors.surfaceElevated, shadowColor: colors.shadow }]}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color={isLight ? '#E45A5A' : '#FF6B6B'} />
        </View>
        <View style={[styles.orbitIcon, styles.orbitIcon2, { backgroundColor: isLight ? colors.surface : colors.surfaceElevated, shadowColor: colors.shadow }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
        </View>
        <View style={[styles.orbitIcon, styles.orbitIcon3, { backgroundColor: isLight ? colors.surface : colors.surfaceElevated, shadowColor: colors.shadow }]}>
          <MaterialCommunityIcons name="trophy" size={20} color={isLight ? '#E8A317' : '#FFD700'} />
        </View>
        <View style={[styles.orbitIcon, styles.orbitIcon4, { backgroundColor: isLight ? colors.surface : colors.surfaceElevated, shadowColor: colors.shadow }]}>
          <Ionicons name="nutrition" size={20} color={isLight ? '#4CAF50' : '#66BB6A'} />
        </View>

        {/* Decorative rings */}
        <View style={[styles.ring, styles.ringOuter, { borderColor: isLight ? colors.divider : colors.primary + '15' }]} />
        <View style={[styles.ring, styles.ringInner, { borderColor: isLight ? colors.primary + '12' : colors.primary + '20' }]} />
      </View>

      {/* Bottom content */}
      <View style={[
        styles.bottomSheet,
        {
          backgroundColor: isLight ? colors.surface : colors.background,
          borderColor: isLight ? colors.cardBorder : colors.border + '30',
          shadowColor: colors.shadow,
        }
      ]}>
        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={[styles.welcomeLabel, { color: colors.textSecondary }]}>
            {t('welcome')} {t('to')}
          </Text>
          <Text style={[styles.appName, { color: colors.primary }]}>
            {t('appName')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtleText }]}>
            {t('subtitle')}
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.featuresRow}>
          {FEATURES.map((f) => (
            <View
              key={f.label}
              style={[
                styles.featurePill,
                {
                  backgroundColor: isLight ? colors.statBg : colors.surface,
                  borderColor: isLight ? colors.divider : colors.border + '30',
                },
              ]}
            >
              <MaterialCommunityIcons name={f.icon} size={16} color={colors.primary} />
              <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isLight ? ['#D4A527', '#C5981B', '#B08A18'] : ['#FFD700', '#E8B800', '#C5981B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>{t('getStarted')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms note */}
        <Text style={[styles.termsText, { color: colors.subtleText }]}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>

      <StatusBar style={isLight ? 'dark' : 'light'} />
    </View>
  );
}

const HERO_SIZE = SCREEN_WIDTH * 0.38;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 8,
  },
  logo: {
    width: 56,
    height: 40,
    resizeMode: 'contain',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // ── Hero ──
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: HERO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCircle: {
    width: HERO_SIZE * 0.65,
    height: HERO_SIZE * 0.65,
    borderRadius: HERO_SIZE * 0.325,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  orbitIcon1: {
    top: '18%',
    right: '14%',
  },
  orbitIcon2: {
    top: '28%',
    left: '12%',
  },
  orbitIcon3: {
    bottom: '28%',
    right: '16%',
  },
  orbitIcon4: {
    bottom: '20%',
    left: '16%',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ringOuter: {
    width: HERO_SIZE * 1.7,
    height: HERO_SIZE * 1.7,
    borderRadius: HERO_SIZE * 0.85,
  },
  ringInner: {
    width: HERO_SIZE * 1.3,
    height: HERO_SIZE * 1.3,
    borderRadius: HERO_SIZE * 0.65,
  },

  // ── Bottom sheet ──
  bottomSheet: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeLabel: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // ── Feature pills ──
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── CTA button ──
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Terms ──
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
