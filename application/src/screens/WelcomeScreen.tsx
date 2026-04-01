import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Each orbit icon: angle in degrees (0=top, clockwise), orbit radius, bob phase offset, color
const ORBIT_ICONS = [
  {
    icon: 'heart-pulse' as const,
    type: 'mci',
    angleDeg: 45,
    color: { light: '#E45A5A', dark: '#FF6B6B' },
  },
  {
    icon: 'lightning-bolt' as const,
    type: 'mci',
    angleDeg: 135,
    color: { light: '#C5981B', dark: '#FFD700' },
  },
  {
    icon: 'trophy' as const,
    type: 'mci',
    angleDeg: 225,
    color: { light: '#E8A317', dark: '#FFD700' },
  },
  {
    icon: 'nutrition' as const,
    type: 'ion',
    angleDeg: 315,
    color: { light: '#4CAF50', dark: '#66BB6A' },
  },
];

const HERO_SIZE = SCREEN_WIDTH * 0.30;
const ORBIT_RADIUS = HERO_SIZE * 0.88;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { theme, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();

  // ── Animations ──────────────────────────────────────────────────────────────

  // 1. Orbit rotation (full 360° over ~9s)
  const orbitRotation = useRef(new Animated.Value(0)).current;

  // 2. Sun pulse: scale + opacity breathing for the glow rings
  const sunPulse = useRef(new Animated.Value(0)).current;

  // 3. Per-icon radial pulse — each icon independently breathes closer/farther along its spoke
  const radialPulses = useRef(ORBIT_ICONS.map(() => new Animated.Value(0))).current;

  // 4. Hero icon entrance scale
  const heroEntrance = useRef(new Animated.Value(0.72)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(heroEntrance, {
        toValue: 1,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous orbit spin
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Sun pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(sunPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sunPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Per-icon radial pulse loops — staggered start delays so they move independently
    const PULSE_DURATION = 2200;
    radialPulses.forEach((anim, i) => {
      const delay = i * 550; // stagger each icon by 550ms
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: PULSE_DURATION,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: PULSE_DURATION,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);
    });
  }, []);

  const orbitDeg = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Sun glow inner ring
  const sunScale1 = sunPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });
  const sunOpacity1 = sunPulse.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.55, 0.85, 0.3],
  });

  // Sun glow outer ring
  const sunScale2 = sunPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });
  const sunOpacity2 = sunPulse.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.3, 0.5, 0.08],
  });

  // Hero icon micro-breathe
  const heroBreath = sunPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 44) }]}>
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

      {/* ── Hero Section ── */}
      <View style={styles.heroSection}>

        {/* ── Sun glow rings (behind everything) ── */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sunGlow,
            styles.sunGlowOuter,
            {
              backgroundColor: isLight ? colors.primary + '18' : colors.primary + '22',
              transform: [{ scale: sunScale2 }],
              opacity: sunOpacity2,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sunGlow,
            styles.sunGlowInner,
            {
              backgroundColor: isLight ? colors.primary + '28' : colors.primary + '35',
              transform: [{ scale: sunScale1 }],
              opacity: sunOpacity1,
            },
          ]}
        />

        {/* ── Orbit track rings (static) ── */}
        <View
          style={[
            styles.ring,
            styles.ringOuter,
            { borderColor: isLight ? colors.divider : colors.primary + '18' },
          ]}
        />
        <View
          style={[
            styles.ring,
            styles.ringInner,
            { borderColor: isLight ? colors.primary + '14' : colors.primary + '28' },
          ]}
        />

        {/* ── Spinning orbit container ── */}
        <Animated.View
          style={[
            styles.orbitContainer,
            { transform: [{ rotate: orbitDeg }] },
          ]}
        >
        {ORBIT_ICONS.map((item, idx) => {
            const angleRad = (item.angleDeg * Math.PI) / 180;
            const cx = Math.sin(angleRad) * ORBIT_RADIUS;
            const cy = -Math.cos(angleRad) * ORBIT_RADIUS;

            // Radial pulse: 0 = pulled 10px toward center, 1 = pushed 10px away from center
            // This keeps icons in a comfortable middle band — never too close, never too far
            const RADIAL_RANGE = 10;
            const radialX = radialPulses[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [
                -Math.sin(angleRad) * RADIAL_RANGE,  // toward center
                Math.sin(angleRad) * RADIAL_RANGE,   // away from center
              ],
            });
            const radialY = radialPulses[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [
                Math.cos(angleRad) * RADIAL_RANGE,   // toward center
                -Math.cos(angleRad) * RADIAL_RANGE,  // away from center
              ],
            });

            return (
              <Animated.View
                key={item.icon}
                style={[
                  styles.orbitIcon,
                  {
                    backgroundColor: isLight ? colors.surface : colors.surfaceElevated,
                    shadowColor: colors.shadow,
                    left: ORBIT_RADIUS + cx - 22,
                    top: ORBIT_RADIUS + cy - 22,
                    transform: [
                      { rotate: orbitRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) },
                      { translateX: radialX },
                      { translateY: radialY },
                    ],
                  },
                ]}
              >
                {item.type === 'mci' ? (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={isLight ? item.color.light : item.color.dark}
                  />
                ) : (
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isLight ? item.color.light : item.color.dark}
                  />
                )}
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* ── Center hero icon ── */}
        <Animated.View
          style={[
            styles.heroCircle,
            {
              backgroundColor: isLight ? colors.statBg : colors.surface,
              opacity: heroOpacity,
              transform: [
                { scale: Animated.multiply(heroEntrance, heroBreath) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={isLight ? ['#C5981B', '#D4A527'] : ['#FFD700', '#C5981B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconCircle}
          >
            <MaterialCommunityIcons name="arm-flex" size={52} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

      </View>

      {/* ── Bottom Sheet ── */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: isLight ? colors.surface : colors.background,
            borderColor: isLight ? colors.cardBorder : colors.border + '30',
            shadowColor: colors.shadow,
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

        <Text style={[styles.termsText, { color: colors.subtleText }]}>
          By continuing, you agree to our Terms &amp; Privacy Policy
        </Text>
      </View>

      <StatusBar style={isLight ? 'dark' : 'light'} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
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

  // ── Hero ──
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sun glow layers (centered absolutely via negative margin)
  sunGlow: {
    position: 'absolute',
    borderRadius: 9999,
  },
  sunGlowInner: {
    width: HERO_SIZE * 1.1,
    height: HERO_SIZE * 1.1,
    marginLeft: -(HERO_SIZE * 1.1) / 2,
    marginTop: -(HERO_SIZE * 1.1) / 2,
    left: '50%',
    top: '50%',
  },
  sunGlowOuter: {
    width: HERO_SIZE * 1.65,
    height: HERO_SIZE * 1.65,
    marginLeft: -(HERO_SIZE * 1.65) / 2,
    marginTop: -(HERO_SIZE * 1.65) / 2,
    left: '50%',
    top: '50%',
  },

  // Static decorative rings
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  ringOuter: {
    width: ORBIT_RADIUS * 2 + 44,
    height: ORBIT_RADIUS * 2 + 44,
  },
  ringInner: {
    width: ORBIT_RADIUS * 2 - 10,
    height: ORBIT_RADIUS * 2 - 10,
  },

  // Orbit container — sized exactly to orbit diameter so icons can be
  // positioned absolutely within it, then the whole View spins.
  orbitContainer: {
    position: 'absolute',
    width: ORBIT_RADIUS * 2,
    height: ORBIT_RADIUS * 2,
  },

  // Individual orbit icons
  orbitIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },

  // Center hero
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