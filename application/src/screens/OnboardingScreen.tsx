/**
 * OnboardingScreen — Professional multi-step onboarding
 *
 * Architecture:
 * - ALL steps are always mounted (no unmount/remount flicker)
 * - Each step lives at a fixed X position (stepIndex * SCREEN_WIDTH)
 * - Navigation = animating a single shared translateX value
 * - State lives in the parent; steps receive it via props → zero re-renders on selection
 * - Entrance animations run once per step via a `played` ref guard
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Image,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';

const { width: W } = Dimensions.get('window');
const TOTAL_STEPS = 5;

const C = {
  primary:      '#C5981B',
  primaryLight: 'rgba(197,152,27,0.15)',
  success:      '#10B981',
  warning:      '#F59E0B',
  error:        '#EF4444',
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const t = (
  val: Animated.Value,
  toValue: number,
  duration: number,
  delay = 0,
  easing = Easing.out(Easing.cubic),
) => Animated.timing(val, { toValue, duration, delay, easing, useNativeDriver: true });

/**
 * Runs entrance animations exactly once when `isActive` becomes true.
 * Each entry: { val, from, to, duration?, delay? }
 */
function useOnceEntrance(
  isActive: boolean,
  anims: { val: Animated.Value; from: number; to: number; duration?: number; delay?: number }[],
) {
  const played = useRef(false);
  useEffect(() => {
    if (!isActive || played.current) return;
    played.current = true;
    anims.forEach((a) => a.val.setValue(a.from));
    Animated.parallel(
      anims.map((a) =>
        t(a.val, a.to, a.duration ?? 380, a.delay ?? 0),
      ),
    ).start();
  }, [isActive]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress pill dots
// ─────────────────────────────────────────────────────────────────────────────
const ProgressDots = memo(({ current }: { current: number }) => {
  const widths = useRef(
    Array.from({ length: TOTAL_STEPS }, () => new Animated.Value(8)),
  ).current;

  useEffect(() => {
    widths.forEach((w, i) =>
      Animated.spring(w, {
        toValue: i === current ? 24 : 8,
        useNativeDriver: false,
        tension: 120,
        friction: 8,
      }).start(),
    );
  }, [current]);

  return (
    <View style={s.dots}>
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            {
              width: w,
              backgroundColor: i === current ? C.primary : 'rgba(197,152,27,0.25)',
            },
          ]}
        />
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DatePickerWheel
// ─────────────────────────────────────────────────────────────────────────────
const DatePickerWheel = memo(
  ({
    items,
    selectedIndex,
    onSelect,
    width = 80,
  }: {
    items: string[];
    selectedIndex: number;
    onSelect: (i: number) => void;
    width?: number;
  }) => {
    const { colors } = useTheme();
    const ref = useRef<ScrollView>(null);
    const IH = 50;

    useEffect(() => {
      ref.current?.scrollTo({ y: selectedIndex * IH, animated: false });
    }, []);

    return (
      <View style={{ width, height: IH * 3 }}>
        <View style={s.pickerHighlight} pointerEvents="none" />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={IH}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.y / IH);
            if (i >= 0 && i < items.length) onSelect(i);
          }}
          contentContainerStyle={{ paddingVertical: IH }}
        >
          {items.map((item, i) => (
            <View key={i} style={[s.pickerItem, { height: IH }]}>
              <Text
                style={[
                  s.pickerText,
                  { color: colors.subtleText },
                  i === selectedIndex && [s.pickerTextSel, { color: colors.text }],
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// HeightRuler
// ─────────────────────────────────────────────────────────────────────────────
const HeightRuler = memo(
  ({
    value,
    onChange,
    min = 120,
    max = 220,
  }: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
  }) => {
    const { colors } = useTheme();
    const ref = useRef<ScrollView>(null);
    const TH = 8;   // px per 1 cm — dense/close ticks
    const RH = 320; // visible ruler height
    const LABEL_W = 34; // fixed label column width
    const TICK_W  = 30; // longest tick width

    useEffect(() => {
      ref.current?.scrollTo({ y: (max - value) * TH - RH / 2, animated: false });
    }, []);

    const snap = (e: any) => {
      const v = max - Math.round((e.nativeEvent.contentOffset.y + RH / 2) / TH);
      const c = Math.max(min, Math.min(max, v));
      if (c !== value) onChange(c);
    };

    return (
      <View style={[s.rulerWrap, { width: LABEL_W + TICK_W + 4 }]}>
        {/* Centre indicator line */}
        <View style={s.rulerIndicator} pointerEvents="none" />

        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={snap}
          onScrollEndDrag={snap}
          onScroll={snap}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: RH / 2 }}
          decelerationRate="fast"
          nestedScrollEnabled
          style={{ height: RH }}
        >
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const tv    = max - i;
            const major = tv % 10 === 0;
            const mid   = tv % 5  === 0 && !major;

            return (
              <View key={i} style={{ height: TH, flexDirection: 'row', alignItems: 'center' }}>

                {/*
                  Label column — always present, fixed width.
                  The Text is centered vertically via absolute so it can be
                  taller than TH without clipping adjacent rows.
                */}
                <View style={{ width: LABEL_W, height: TH, position: 'relative' }}>
                  {major && (
                    <Text style={[s.vTickLabel, {
                      color: colors.text,
                      position: 'absolute',
                      right: 4,
                      // vertically center the label on the tick regardless of font height
                      top: '50%',
                      transform: [{ translateY: -7 }],
                    }]}>
                      {tv}
                    </Text>
                  )}
                </View>

                {/* Tick line */}
                <View
                  style={[
                    s.vTick,
                    { backgroundColor: colors.divider },
                    major && [s.vTickMajor, { backgroundColor: colors.text }],
                    mid   && [s.vTickMid,   { backgroundColor: colors.subtleText }],
                  ]}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// WeightGauge
// ─────────────────────────────────────────────────────────────────────────────
const WeightGauge = memo(
  ({
    value,
    onChange,
    height,
  }: {
    value: number;
    onChange: (v: number) => void;
    height: number;
  }) => {
    const { colors } = useTheme();
    const ref = useRef<ScrollView>(null);
    const TW = 8, MIN = 30, MAX = 200;

    useEffect(() => {
      ref.current?.scrollTo({ x: (value - MIN) * TW - W / 2 + 60, animated: false });
    }, []);

    const snap = (e: any) => {
      const v = Math.round((e.nativeEvent.contentOffset.x + W / 2 - 60) / TW) + MIN;
      const c = Math.max(MIN, Math.min(MAX, v));
      if (c !== value) onChange(c);
    };

    const bmi = height > 0 ? value / Math.pow(height / 100, 2) : 0;
    const bmiInfo =
      bmi < 18.5 ? { label: 'Underweight', color: C.warning } :
      bmi < 25   ? { label: 'Normal',       color: C.success } :
      bmi < 30   ? { label: 'Overweight',   color: C.warning } :
                   { label: 'Obese',         color: C.error   };

    const cats = [
      { label: 'Underweight', color: C.warning, active: bmi < 18.5 },
      { label: 'Normal',      color: C.success, active: bmi >= 18.5 && bmi < 25 },
      { label: 'Overweight',  color: C.warning, active: bmi >= 25   && bmi < 30 },
    ];

    return (
      <View style={s.weightWrap}>
        <View style={s.bmiCats}>
          {cats.map(({ label, color, active }) => (
            <View key={label} style={s.bmiCat}>
              <View style={[s.bmiDot, { backgroundColor: color }]} />
              <Text
                style={[
                  s.bmiLbl,
                  { color: colors.subtleText },
                  active && [s.bmiLblActive, { color: colors.text }],
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.weightDisplay}>
          <Text style={[s.weightVal, { color: colors.text }]}>{value.toFixed(1)}</Text>
          <Text style={[s.weightUnit, { color: colors.textSecondary }]}>kg</Text>
        </View>
        <View style={s.weightRuler}>
          <View style={s.weightIndicator} />
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={snap}
            onScrollEndDrag={snap}
            contentContainerStyle={{ paddingHorizontal: W / 2 - 60 }}
            decelerationRate="fast"
          >
            {Array.from({ length: (MAX - MIN) * 2 + 1 }, (_, i) => {
              const tv = MIN + i * 0.5;
              const major = tv % 5 === 0;
              return (
                <View key={i} style={[s.wTickWrap, { width: TW }]}>
                  <View
                    style={[
                      s.wTick,
                      { backgroundColor: colors.divider },
                      major && [s.wTickMajor, { backgroundColor: colors.text }],
                    ]}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
        <View style={[s.bmiBox, { borderColor: bmiInfo.color }]}>
          <Text style={[s.bmiBoxLbl, { color: colors.textSecondary }]}>Your BMI shows you are</Text>
          <Text style={[s.bmiBoxVal, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Gender
// ─────────────────────────────────────────────────────────────────────────────
const Step1Gender = memo(
  ({
    isActive,
    gender,
    setGender,
  }: {
    isActive: boolean;
    gender: string;
    setGender: (g: 'male' | 'female') => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(20)).current;
    const maleO  = useRef(new Animated.Value(0)).current;
    const maleY  = useRef(new Animated.Value(40)).current;
    const femO   = useRef(new Animated.Value(0)).current;
    const femY   = useRef(new Animated.Value(40)).current;

    useOnceEntrance(isActive, [
      { val: titleO, from: 0,  to: 1, duration: 350 },
      { val: titleY, from: 20, to: 0, duration: 350 },
      { val: maleO,  from: 0,  to: 1, duration: 380, delay: 120 },
      { val: maleY,  from: 40, to: 0, duration: 380, delay: 120 },
      { val: femO,   from: 0,  to: 1, duration: 380, delay: 230 },
      { val: femY,   from: 40, to: 0, duration: 380, delay: 230 },
    ]);

    const maleScale = useRef(new Animated.Value(1)).current;
    const femScale  = useRef(new Animated.Value(1)).current;
    const maleFill  = useRef(new Animated.Value(gender === 'male'   ? 1 : 0)).current;
    const femFill   = useRef(new Animated.Value(gender === 'female' ? 1 : 0)).current;

    useEffect(() => {
      Animated.timing(maleFill, { toValue: gender === 'male'   ? 1 : 0, duration: 220, useNativeDriver: false }).start();
      Animated.timing(femFill,  { toValue: gender === 'female' ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    }, [gender]);

    const handleSelect = useCallback((g: 'male' | 'female') => {
      setGender(g);
      const sc = g === 'male' ? maleScale : femScale;
      Animated.sequence([
        Animated.timing(sc, { toValue: 0.88, duration: 90, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 300, friction: 6 }),
      ]).start();
    }, []);

    // male = blue, female = pink
    const MALE_COLOR   = '#3B82F6';
    const FEMALE_COLOR = '#EC4899';

    const cards = [
      { g: 'male'   as const, label: 'Male',   icon: 'male'   as const, opacity: maleO, ty: maleY, scale: maleScale, fill: maleFill, activeColor: MALE_COLOR   },
      { g: 'female' as const, label: 'Female', icon: 'female' as const, opacity: femO,  ty: femY,  scale: femScale,  fill: femFill,  activeColor: FEMALE_COLOR },
    ];

    return (
      <View style={s.stepInner}>
        <Animated.Text
          style={[s.stepTitle, { color: colors.text, opacity: titleO, transform: [{ translateY: titleY }] }]}
        >
          What's Your Gender
        </Animated.Text>

        {/* Vertical stack */}
        <View style={s.genderColumn}>
          {cards.map(({ g, label, icon, opacity, ty, scale, fill, activeColor }) => (
            <Animated.View key={g} style={{ opacity, transform: [{ translateY: ty }, { scale }] }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => handleSelect(g)} style={s.genderOption}>
                <Animated.View
                  style={[
                    s.genderCircle,
                    {
                      backgroundColor: fill.interpolate({ inputRange: [0, 1], outputRange: ['transparent', activeColor] }),
                      borderColor:     fill.interpolate({ inputRange: [0, 1], outputRange: [colors.divider,  activeColor] }),
                    },
                  ]}
                >
                  <Animated.View
                    style={{ transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}
                  >
                    <Ionicons name={icon} size={50} color={gender === g ? '#FFF' : colors.text} />
                  </Animated.View>
                </Animated.View>
                <Text style={[s.genderLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Birthday
// ─────────────────────────────────────────────────────────────────────────────
const Step2Birthday = memo(
  ({
    isActive,
    days, months, years,
    birthDay, birthMonth, birthYear, currentYear,
    setBirthDay, setBirthMonth, setBirthYear,
  }: any) => {
    const { colors } = useTheme();

    const titleO = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(20)).current;
    const subtO  = useRef(new Animated.Value(0)).current;
    const subtY  = useRef(new Animated.Value(20)).current;
    const cardO  = useRef(new Animated.Value(0)).current;
    const cardSc = useRef(new Animated.Value(0.9)).current;

    useOnceEntrance(isActive, [
      { val: titleO, from: 0,   to: 1, duration: 320 },
      { val: titleY, from: 20,  to: 0, duration: 320 },
      { val: subtO,  from: 0,   to: 1, duration: 320, delay: 80  },
      { val: subtY,  from: 20,  to: 0, duration: 320, delay: 80  },
      { val: cardO,  from: 0,   to: 1, duration: 400, delay: 200 },
      { val: cardSc, from: 0.9, to: 1, duration: 400, delay: 200 },
    ]);

    return (
      <View style={s.stepInner}>
        <Animated.Text
          style={[s.stepTitle, { color: colors.text, opacity: titleO, transform: [{ translateY: titleY }] }]}
        >
          What's your Birthday?
        </Animated.Text>
        <Animated.Text
          style={[s.stepSubtitle, { color: colors.textSecondary, opacity: subtO, transform: [{ translateY: subtY }] }]}
        >
          Your birthday helps us customize your experience based on your age
        </Animated.Text>
        <Animated.View
          style={[
            s.datePicker,
            { backgroundColor: colors.surface, borderColor: colors.divider },
            { opacity: cardO, transform: [{ scale: cardSc }] },
          ]}
        >
          <DatePickerWheel items={days}   selectedIndex={birthDay - 1}                   onSelect={(i) => setBirthDay(i + 1)}                    width={70} />
          <DatePickerWheel items={months} selectedIndex={birthMonth}                     onSelect={setBirthMonth}                                 width={80} />
          <DatePickerWheel items={years}  selectedIndex={birthYear - (currentYear - 80)} onSelect={(i) => setBirthYear(currentYear - 80 + i)}  width={90} />
        </Animated.View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Height
// ─────────────────────────────────────────────────────────────────────────────
const Step3Height = memo(
  ({
    isActive, height, gender, onChange,
  }: {
    isActive: boolean; height: number; gender: string; onChange: (v: number) => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(20)).current;
    const imgO   = useRef(new Animated.Value(0)).current;
    const imgX   = useRef(new Animated.Value(-50)).current;
    const rulO   = useRef(new Animated.Value(0)).current;
    const rulX   = useRef(new Animated.Value(50)).current;
    const valSc  = useRef(new Animated.Value(0.7)).current;
    const valO   = useRef(new Animated.Value(0)).current;

    useOnceEntrance(isActive, [
      { val: titleO, from: 0,   to: 1, duration: 320 },
      { val: titleY, from: 20,  to: 0, duration: 320 },
      { val: imgO,   from: 0,   to: 1, duration: 450, delay: 120 },
      { val: imgX,   from: -50, to: 0, duration: 450, delay: 120 },
      { val: rulO,   from: 0,   to: 1, duration: 450, delay: 210 },
      { val: rulX,   from: 50,  to: 0, duration: 450, delay: 210 },
      { val: valSc,  from: 0.7, to: 1, duration: 380, delay: 360 },
      { val: valO,   from: 0,   to: 1, duration: 300, delay: 360 },
    ]);

    return (
      <View style={[s.stepInner, { flex: 1 }]}>
        <Animated.Text
          style={[s.stepTitle, { color: colors.text, opacity: titleO, transform: [{ translateY: titleY }] }]}
        >
          Your Height
        </Animated.Text>
        <View style={s.heightMain}>
          <Animated.View style={[s.heightImgWrap, { opacity: imgO, transform: [{ translateX: imgX }] }]}>
            <Image
              source={
                gender === 'female'
                  ? require('../../assets/height-female.png')
                  : require('../../assets/height-male.png')
              }
              style={gender === 'female' ? s.heightImgF : s.heightImgM}
              resizeMode="contain"
            />
            <View style={s.heightLine} />
          </Animated.View>
          <Animated.View style={[s.heightRulerSide, { opacity: rulO, transform: [{ translateX: rulX }] }]}>
            <HeightRuler value={height} onChange={onChange} />
          </Animated.View>
        </View>
        <Animated.View
          style={[
            s.heightValBox,
            { backgroundColor: colors.surface, opacity: valO, transform: [{ scale: valSc }] },
          ]}
        >
          <Text style={s.heightValNum}>{height}</Text>
          <Text style={[s.heightValUnit, { color: colors.textSecondary }]}>cm</Text>
        </Animated.View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Weight
// ─────────────────────────────────────────────────────────────────────────────
const Step4Weight = memo(
  ({
    isActive, weight, height, onChange,
  }: {
    isActive: boolean; weight: number; height: number; onChange: (v: number) => void;
  }) => {
    const { colors } = useTheme();

    const titleO  = useRef(new Animated.Value(0)).current;
    const titleY  = useRef(new Animated.Value(20)).current;
    const subtO   = useRef(new Animated.Value(0)).current;
    const subtY   = useRef(new Animated.Value(20)).current;
    const gaugeSc = useRef(new Animated.Value(0.85)).current;
    const gaugeO  = useRef(new Animated.Value(0)).current;

    useOnceEntrance(isActive, [
      { val: titleO,  from: 0,    to: 1, duration: 320 },
      { val: titleY,  from: 20,   to: 0, duration: 320 },
      { val: subtO,   from: 0,    to: 1, duration: 320, delay: 80  },
      { val: subtY,   from: 20,   to: 0, duration: 320, delay: 80  },
      { val: gaugeSc, from: 0.85, to: 1, duration: 450, delay: 180 },
      { val: gaugeO,  from: 0,    to: 1, duration: 380, delay: 180 },
    ]);

    return (
      <View style={s.stepInner}>
        <Animated.Text
          style={[s.stepTitle, { color: colors.text, opacity: titleO, transform: [{ translateY: titleY }] }]}
        >
          Your Current Weight
        </Animated.Text>
        <Animated.Text
          style={[s.stepSubtitle, { color: colors.textSecondary, opacity: subtO, transform: [{ translateY: subtY }] }]}
        >
          We use your weight to tailor your fitness goals and track your progress
        </Animated.Text>
        <Animated.View style={{ opacity: gaugeO, transform: [{ scale: gaugeSc }] }}>
          <WeightGauge value={weight} onChange={onChange} height={height} />
        </Animated.View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Goals
// ─────────────────────────────────────────────────────────────────────────────
const GOALS = [
  { id: 'weight_loss', label: 'Lose Weight', icon: 'trending-down' },
  { id: 'muscle_gain', label: 'Build Muscle', icon: 'fitness'      },
  { id: 'maintenance', label: 'Stay Fit',     icon: 'heart'        },
] as const;

const ACTIVITIES = [
  { id: 'sedentary',         label: 'Sedentary', desc: 'Little to no exercise' },
  { id: 'lightly_active',    label: 'Light',     desc: '1-3 days/week'         },
  { id: 'moderately_active', label: 'Moderate',  desc: '3-5 days/week'         },
  { id: 'very_active',       label: 'Active',    desc: '6-7 days/week'         },
] as const;

const Step5Goals = memo(
  ({
    isActive, fitnessGoal, activityLevel, setFitnessGoal, setActivityLevel,
  }: {
    isActive: boolean;
    fitnessGoal: string;
    activityLevel: string;
    setFitnessGoal: (v: any) => void;
    setActivityLevel: (v: any) => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(20)).current;
    const subtO  = useRef(new Animated.Value(0)).current;
    const subtY  = useRef(new Animated.Value(20)).current;
    const lblO   = useRef(new Animated.Value(0)).current;
    const lblY   = useRef(new Animated.Value(20)).current;

    // Per-card entrance + fill anims — stable refs, never recreated
    const goalA = useRef(
      GOALS.map(() => ({
        opacity:    new Animated.Value(0),
        translateY: new Animated.Value(35),
        scale:      new Animated.Value(1),
        fill:       new Animated.Value(0),
      })),
    ).current;

    const actA = useRef(
      ACTIVITIES.map(() => ({
        opacity:    new Animated.Value(0),
        translateY: new Animated.Value(35),
        fill:       new Animated.Value(0),
      })),
    ).current;

    const played = useRef(false);

    // Entrance — runs once
    useEffect(() => {
      if (!isActive || played.current) return;
      played.current = true;

      titleO.setValue(0); titleY.setValue(20);
      subtO.setValue(0);  subtY.setValue(20);
      lblO.setValue(0);   lblY.setValue(20);

      Animated.parallel([
        t(titleO, 1, 320),
        t(titleY, 0, 320),
        t(subtO,  1, 320, 80),
        t(subtY,  0, 320, 80),
      ]).start();

      goalA.forEach((a, i) => {
        a.opacity.setValue(0);
        a.translateY.setValue(35);
        Animated.parallel([
          t(a.opacity,    1, 340, 160 + i * 90),
          t(a.translateY, 0, 340, 160 + i * 90, Easing.out(Easing.back(1.4))),
        ]).start();
      });

      const afterGoals = 160 + GOALS.length * 90;
      t(lblO, 1, 300, afterGoals).start();
      t(lblY, 0, 300, afterGoals).start();

      actA.forEach((a, i) => {
        a.opacity.setValue(0);
        a.translateY.setValue(35);
        Animated.parallel([
          t(a.opacity,    1, 300, afterGoals + 60 + i * 70),
          t(a.translateY, 0, 300, afterGoals + 60 + i * 70, Easing.out(Easing.back(1.2))),
        ]).start();
      });
    }, [isActive]);

    // Fill sync — no remount, just anim value changes
    useEffect(() => {
      goalA.forEach((a, i) =>
        Animated.timing(a.fill, {
          toValue: GOALS[i].id === fitnessGoal ? 1 : 0,
          duration: 220,
          useNativeDriver: false,
        }).start(),
      );
    }, [fitnessGoal]);

    useEffect(() => {
      actA.forEach((a, i) =>
        Animated.timing(a.fill, {
          toValue: ACTIVITIES[i].id === activityLevel ? 1 : 0,
          duration: 220,
          useNativeDriver: false,
        }).start(),
      );
    }, [activityLevel]);

    const handleGoal = useCallback((id: string, i: number) => {
      setFitnessGoal(id);
      const sc = goalA[i].scale;
      Animated.sequence([
        Animated.timing(sc, { toValue: 0.88, duration: 80, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 300, friction: 5 }),
      ]).start();
    }, []);

    return (
      <View style={s.stepInner}>
        <Animated.Text
          style={[s.stepTitle, { color: colors.text, opacity: titleO, transform: [{ translateY: titleY }] }]}
        >
          Fitness Goals
        </Animated.Text>
        <Animated.Text
          style={[s.stepSubtitle, { color: colors.textSecondary, opacity: subtO, transform: [{ translateY: subtY }] }]}
        >
          What do you want to achieve?
        </Animated.Text>

        {/* Goal cards */}
        <View style={s.goalsRow}>
          {GOALS.map((goal, i) => {
            const a = goalA[i];
            return (
              <Animated.View
                key={goal.id}
                style={[
                  s.goalCardWrap,
                  { opacity: a.opacity, transform: [{ translateY: a.translateY }, { scale: a.scale }] },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleGoal(goal.id, i)}
                  style={{ borderRadius: 16, overflow: 'hidden' }}
                >
                  <Animated.View
                    style={[
                      s.goalCard,
                      {
                        borderColor:     a.fill.interpolate({ inputRange: [0, 1], outputRange: [colors.divider, C.primary] }),
                        backgroundColor: a.fill.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, C.primary] }),
                      },
                    ]}
                  >
                    <Animated.View
                      style={{ transform: [{ scale: a.fill.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }}
                    >
                      <Ionicons
                        name={goal.icon as any}
                        size={28}
                        color={fitnessGoal === goal.id ? '#FFF' : C.primary}
                      />
                    </Animated.View>
                    <Text style={[s.goalText, { color: fitnessGoal === goal.id ? '#FFF' : colors.text }]}>
                      {goal.label}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Activity label */}
        <Animated.Text
          style={[s.sectionLabel, { color: colors.text, opacity: lblO, transform: [{ translateY: lblY }] }]}
        >
          Activity Level
        </Animated.Text>

        {/* Activity cards */}
        <View style={s.activityList}>
          {ACTIVITIES.map((lvl, i) => {
            const a = actA[i];
            return (
              <Animated.View
                key={lvl.id}
                style={{ opacity: a.opacity, transform: [{ translateY: a.translateY }] }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActivityLevel(lvl.id)}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                >
                  <Animated.View
                    style={[
                      s.actCard,
                      {
                        borderColor:     a.fill.interpolate({ inputRange: [0, 1], outputRange: [colors.divider,  C.primary] }),
                        backgroundColor: a.fill.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, C.primary] }),
                      },
                    ]}
                  >
                    <Text style={[s.actLabel, { color: activityLevel === lvl.id ? '#FFF' : colors.text }]}>
                      {lvl.label}
                    </Text>
                    <Text style={[s.actDesc, { color: activityLevel === lvl.id ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                      {lvl.desc}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { user, token, updateUser } = useAuth();

  const [step,      setStep]      = useState(0);   // 0-indexed
  const [isLoading, setIsLoading] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [gender,        setGender]        = useState<'male' | 'female' | ''>('');
  const currentYear = new Date().getFullYear();
  const [birthDay,      setBirthDay]      = useState(15);
  const [birthMonth,    setBirthMonth]    = useState(6);
  const [birthYear,     setBirthYear]     = useState(1995);
  const [height,        setHeight]        = useState(170);
  const [weight,        setWeight]        = useState(70);
  const [fitnessGoal,   setFitnessGoal]   = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  const days   = useRef(Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))).current;
  const months = useRef(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']).current;
  const years  = useRef(Array.from({ length: 80 }, (_, i) => String(currentYear - 80 + i))).current;

  // ── Slide rail ──────────────────────────────────────────────────────────────
  // All steps live side-by-side in a row of width = TOTAL_STEPS * W.
  // Navigation = animating railX to -step * W.
  const railX = useRef(new Animated.Value(0)).current;

  const goTo = useCallback((nextStep: number) => {
    Animated.spring(railX, {
      toValue: -nextStep * W,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
    setStep(nextStep);
  }, []);

  // ── Button press scale ──────────────────────────────────────────────────────
  const btnScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 300 }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1.00, useNativeDriver: true, tension: 300 }).start();

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token) { Alert.alert('Error', 'Authentication token not found'); return; }
    setIsLoading(true);
    try {
      const dateOfBirth = `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
      const body: any = {
        gender:        gender        || undefined,
        dateOfBirth,
        height,
        weight,
        fitnessGoal:   fitnessGoal   || undefined,
        activityLevel: activityLevel || undefined,
      };
      Object.keys(body).forEach((k) => { if (body[k] === undefined) delete body[k]; });
      if (Object.keys(body).length > 0) {
        const res = await userService.updateBodyInformation(body, token);
        if (res.data && user) updateUser({ ...user, ...res.data });
        Alert.alert('Success', 'Profile completed!', [{ text: 'OK', onPress: () => navigation.replace('Home') }]);
      } else {
        navigation.replace('Home');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={s.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.primary} />
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.headerSide} />
        )}
        <TouchableOpacity onPress={() => navigation.replace('Home')} style={s.headerSide}>
          <Text style={[s.skipTxt, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <ProgressDots current={step} />

      {/* ── Slide rail — overflow hidden clips off-screen steps ── */}
      <View style={s.railClip}>
        <Animated.View style={[s.rail, { transform: [{ translateX: railX }] }]}>

          <View style={s.slide}>
            <ScrollView contentContainerStyle={s.slideScroll} showsVerticalScrollIndicator={false}>
              <Step1Gender isActive={step === 0} gender={gender} setGender={setGender} />
            </ScrollView>
          </View>

          <View style={s.slide}>
            <ScrollView contentContainerStyle={s.slideScroll} showsVerticalScrollIndicator={false}>
              <Step2Birthday
                isActive={step === 1}
                days={days} months={months} years={years}
                birthDay={birthDay} birthMonth={birthMonth} birthYear={birthYear}
                currentYear={currentYear}
                setBirthDay={setBirthDay} setBirthMonth={setBirthMonth} setBirthYear={setBirthYear}
              />
            </ScrollView>
          </View>

          <View style={s.slide}>
            <ScrollView contentContainerStyle={s.slideScroll} showsVerticalScrollIndicator={false}>
              <Step3Height isActive={step === 2} height={height} gender={gender} onChange={setHeight} />
            </ScrollView>
          </View>

          <View style={s.slide}>
            <ScrollView contentContainerStyle={s.slideScroll} showsVerticalScrollIndicator={false}>
              <Step4Weight isActive={step === 3} weight={weight} height={height} onChange={setWeight} />
            </ScrollView>
          </View>

          <View style={s.slide}>
            <ScrollView contentContainerStyle={s.slideScroll} showsVerticalScrollIndicator={false}>
              <Step5Goals
                isActive={step === 4}
                fitnessGoal={fitnessGoal}
                activityLevel={activityLevel}
                setFitnessGoal={setFitnessGoal}
                setActivityLevel={setActivityLevel}
              />
            </ScrollView>
          </View>

        </Animated.View>
      </View>

      {/* Continue button */}
      <View style={s.btnWrap}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.primary }]}
            onPress={handleNext}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={isLoading}
            activeOpacity={1}
          >
            {isLoading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.btnTxt}>{step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}</Text>
            }
          </TouchableOpacity>
        </Animated.View>
      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 8,
  },
  headerSide: { width: 70 },
  backBtn:    { flexDirection: 'row', alignItems: 'center' },
  backTxt:    { fontSize: 16, color: C.primary, fontWeight: '500' },
  skipTxt:    { fontSize: 16, fontWeight: '500', textAlign: 'right' },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot:  { height: 8, borderRadius: 4 },

  // Rail
  railClip:    { flex: 1, overflow: 'hidden' },
  rail:        { flex: 1, flexDirection: 'row', width: W * TOTAL_STEPS },
  slide:       { width: W, flex: 1 },
  slideScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  stepInner:   { flex: 1, paddingTop: 8 },

  stepTitle:    { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  stepSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 36, lineHeight: 24, paddingHorizontal: 16 },

  // Gender — vertical column
  genderColumn: { alignItems: 'center', marginTop: 40, gap: 30 },
  genderOption: { alignItems: 'center' },
  genderCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  genderLabel: { fontSize: 20, fontWeight: '600' },

  // Date picker
  datePicker: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderRadius: 20, paddingVertical: 20, marginHorizontal: 12, borderWidth: 1,
  },
  pickerHighlight: {
    position: 'absolute', top: '50%', left: 10, right: 10,
    height: 50, marginTop: -25, backgroundColor: C.primaryLight, borderRadius: 10, zIndex: -1,
  },
  pickerItem:    { justifyContent: 'center', alignItems: 'center' },
  pickerText:    { fontSize: 20 },
  pickerTextSel: { fontSize: 24, fontWeight: '700' },

  // Height
  heightMain:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  heightImgWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heightImgM:      { width: 260, height: 380 },
  heightImgF:      { width: 240, height: 380 },
  heightLine:      { position: 'absolute', top: 0, left: 20, right: -10, height: 2, backgroundColor: C.primary },
  heightRulerSide: { height: 320, width: 80, justifyContent: 'center', alignItems: 'flex-end' },
  heightValBox:    {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, marginHorizontal: 20, marginBottom: 8,
  },
  heightValNum:  { fontSize: 60, fontWeight: '700', color: C.primary },
  heightValUnit: { fontSize: 22, fontWeight: '600', marginLeft: 8 },

  // Ruler
  rulerWrap:      { height: 320, position: 'relative' },
  rulerIndicator: { position: 'absolute', top: '50%', left: 0, right: 0, height: 3, backgroundColor: C.primary, zIndex: 10, marginTop: -1.5 },
  vTickWrap:      { justifyContent: 'center' },
  vTickRow:       { flexDirection: 'row', alignItems: 'center' },
  vTick:          { width: 16, height: 1 },
  vTickMajor:     { width: 30, height: 2 },
  vTickMid:       { width: 22, height: 1.5 },
  vTickLabel:     { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  vTickSpacer:    { width: 34 },

  // Weight
  weightWrap:      { alignItems: 'center' },
  bmiCats:         { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 28 },
  bmiCat:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bmiDot:          { width: 8, height: 8, borderRadius: 4 },
  bmiLbl:          { fontSize: 14 },
  bmiLblActive:    { fontWeight: '600' },
  weightDisplay:   { flexDirection: 'row', alignItems: 'baseline', marginBottom: 36 },
  weightVal:       { fontSize: 72, fontWeight: '700' },
  weightUnit:      { fontSize: 24, fontWeight: '500', marginLeft: 8 },
  weightRuler:     { height: 60, width: '100%' },
  weightIndicator: { position: 'absolute', top: 0, left: '50%', marginLeft: -1, width: 2, height: 40, backgroundColor: C.primary, zIndex: 10 },
  wTickWrap:       { alignItems: 'center' },
  wTick:           { width: 1, height: 20 },
  wTickMajor:      { height: 35, width: 2 },
  bmiBox:          { marginTop: 28, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  bmiBoxLbl:       { fontSize: 14 },
  bmiBoxVal:       { fontSize: 18, fontWeight: '700', marginTop: 4 },

  // Goals
  goalsRow:     { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  goalCardWrap: { flex: 1 },
  goalCard:     { borderRadius: 16, paddingVertical: 20, alignItems: 'center', borderWidth: 1 },
  goalText:     { fontSize: 13, fontWeight: '600', marginTop: 8 },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 14 },
  activityList: { gap: 10 },
  actCard:      { borderRadius: 12, padding: 16, borderWidth: 1 },
  actLabel:     { fontSize: 16, fontWeight: '600' },
  actDesc:      { fontSize: 13, marginTop: 2 },

  // Button
  btnWrap: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 16 },
  btn:     { borderRadius: 30, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  btnTxt:  { fontSize: 18, fontWeight: '600', color: '#FFF' },
});