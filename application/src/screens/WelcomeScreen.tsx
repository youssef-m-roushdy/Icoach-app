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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { LanguageSelector } from '../components/common';
import { useTheme } from '../context/ThemeContext';
import { useSystemNavigation } from '../context/SystemNavigationContext';
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

// Icons can be positioned totally independent of each other now
// Positive offsetX moves right, negative moves left
// Positive offsetY moves down, negative moves up
const ORBIT_ICONS = [
  {
    icon: 'heart-pulse' as const,
    type: 'mci',
    offsetX: 20,   // Customize this directly
    offsetY: -95, // Customize this directly
    color: { light: '#E45A5A', dark: '#FF6B6B' },
  },
  {
    icon: 'robot-outline' as const,
    type: 'mci',
    offsetX: 130,
    offsetY: -20,
    color: { light: '#9C27B0', dark: '#AB47BC' },
  },
  {
    icon: 'trophy' as const,
    type: 'mci',
    offsetX: 115,
    offsetY: 90,
    color: { light: '#E8A317', dark: '#FFD700' },
  },
  {
    icon: 'nutrition' as const,
    type: 'ion',
    offsetX: 25,
    offsetY: 135,
    color: { light: '#4CAF50', dark: '#66BB6A' },
  },
  {
    icon: 'chart-line' as const,
    type: 'mci',
    offsetX: -75,
    offsetY: 80,
    color: { light: '#2196F3', dark: '#42A5F5' },
  },
  {
    icon: 'lightning-bolt' as const,
    type: 'mci',
    offsetX: -80,
    offsetY: -30,
    color: { light: '#C5981B', dark: '#FFD700' },
  },
];

// Hero center circle
const HERO_SIZE = SCREEN_WIDTH * 0.28;

// Outer ring — tight enough so icons stay fully on screen
// Keep it well within screen width (screen - padding on each side)
const OUTER_RING_RADIUS = SCREEN_WIDTH * 0.30;
const OUTER_RING_SIZE = OUTER_RING_RADIUS * 2;

// Inner ring — sits between center and outer
const INNER_RING_RADIUS = SCREEN_WIDTH * 0.20;
const INNER_RING_SIZE = INNER_RING_RADIUS * 2;

const ICON_SIZE = 42;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { theme, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();

  const handleGetStarted = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Background Gradient */}
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: colors.authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: colors.authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: colors.authCircle3 }]} />
      </LinearGradient>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 44) }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
        />
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
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

      {/* Hero Section */}
      <View style={styles.heroSection}>

        {/* Outer ring — icons sit exactly on this */}
        <View
          style={[
            styles.outerRing,
            {
              width: OUTER_RING_SIZE,
              height: OUTER_RING_SIZE,
              borderRadius: OUTER_RING_RADIUS,
              borderColor: isLight ? colors.divider : colors.primary + '30',
            },
          ]}
        />

        {/* Inner ring */}
        <View
          style={[
            styles.innerRing,
            {
              width: INNER_RING_SIZE,
              height: INNER_RING_SIZE,
              borderRadius: INNER_RING_RADIUS,
              borderColor: isLight ? colors.primary + '20' : colors.primary + '20',
            },
          ]}
        />

        {/* Icons — positioned manually relative to center */}
        {ORBIT_ICONS.map((item) => {
          return (
            <View
              key={item.icon}
              style={[
                styles.orbitIcon,
                {
                  backgroundColor: isLight ? colors.surface : colors.surfaceElevated,
                  shadowColor: colors.shadow,
                  transform: [
                    { translateX: item.offsetX - ICON_SIZE / 2 },
                    { translateY: item.offsetY - ICON_SIZE / 2 },
                  ],
                },
              ]}
            >
              {item.type === 'mci' ? (
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={18}
                  color={isLight ? item.color.light : item.color.dark}
                />
              ) : (
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isLight ? item.color.light : item.color.dark}
                />
              )}
            </View>
          );
        })}

        {/* Center hero icon */}
        <LinearGradient
          colors={isLight ? ['#C5981B', '#D4A527'] : ['#FFD700', '#C5981B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroCircle,
            {
              width: HERO_SIZE * 0.8,
              height: HERO_SIZE * 0.8,
              borderRadius: (HERO_SIZE * 0.8) / 2,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 6,
            },
          ]}
        >
          <MaterialCommunityIcons name="arm-flex" size={HERO_SIZE * 0.45} color="#FFFFFF" />
        </LinearGradient>

      </View>

      {/* Bottom Sheet */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.authCardBg,
            borderColor: colors.authCardBorder,
            shadowColor: '#000',
            shadowOpacity: isLight ? 0.1 : 0.3,
            shadowRadius: isLight ? 8 : 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: isLight ? 4 : 8,
            paddingBottom: Math.max(Platform.OS === 'ios' ? 44 : 32, systemBottomInset + 20),
          },
        ]}
      >
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

        <View style={styles.featuresRow}>
          {FEATURES.map((f) => (
            <View
              key={f.label}
              style={[
                styles.featurePill,
                {
                  backgroundColor: colors.authInputBg,
                  borderColor: colors.authInputBorder,
                },
              ]}
            >
              <MaterialCommunityIcons name={f.icon} size={15} color={colors.primary} />
              <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGetStarted}
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

        <Text style={[styles.termsText, { color: colors.subtleText }]}>
          By continuing, you agree to our Terms &amp; Privacy Policy
        </Text>
      </View>

      <StatusBar style={isLight ? 'dark' : 'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle3: {
    position: 'absolute',
    top: '30%',
    left: '-20%',
    width: 150,
    height: 150,
    borderRadius: 75,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logo: { width: 56, height: 40, resizeMode: 'contain' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  outerRing: {
    position: 'absolute',
    borderWidth: 1,
  },

  innerRing: {
    position: 'absolute',
    borderWidth: 1,
  },

  orbitIcon: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  heroCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSheet: {
    paddingHorizontal: 28,
    paddingTop: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  titleBlock: { alignItems: 'center', marginBottom: 24 },
  welcomeLabel: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  appName: { fontSize: 36, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

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
  featureLabel: { fontSize: 13, fontWeight: '600' },

  ctaButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },

  termsText: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});