import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing as REasing,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';
import * as Haptics from 'expo-haptics';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../utils/toast';

const { width: W } = Dimensions.get('window');
const TOTAL_STEPS = 5;
const SWIPE_THRESHOLD = W * 0.2;
const SWIPE_VELOCITY = 400;

const C = {
  primary: '#C5981B',
  primaryLight: 'rgba(197,152,27,0.12)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// ─── Timing configs ──────────────────────────────────────────────────────────
const EASE_OUT = REasing.bezier(0.25, 0.1, 0.25, 1);
const FAST_TIMING = { duration: 250, easing: EASE_OUT };
const SMOOTH_TIMING = { duration: 400, easing: EASE_OUT };

// ─── useEntrance ─────────────────────────────────────────────────────────────
function useEntrance(
  isActive: boolean,
  anims: {
    val: SharedValue<number>;
    from: number;
    to: number;
    duration?: number;
    delay?: number;
    useSpring?: boolean;
  }[],
) {
  useEffect(() => {
    if (!isActive) {
      anims.forEach((a) => {
        a.val.value = a.from;
      });
      return;
    }

    anims.forEach((a) => {
      a.val.value = a.from;
      const animation = a.useSpring
        ? withSpring(a.to, { damping: 16, stiffness: 120, mass: 0.8 })
        : withTiming(a.to, {
            duration: a.duration ?? 500,
            easing: EASE_OUT,
          });

      a.val.value = a.delay ? withDelay(a.delay, animation) : animation;
    });
  }, [isActive]);
}

// ─── Progress Dots ───────────────────────────────────────────────────────────
const DotItem = memo(({ index, current }: { index: number; current: number }) => {
  const width = useSharedValue(8);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const isActive = index === current;
    width.value = withSpring(isActive ? 32 : 8, {
      damping: 18,
      stiffness: 200,
      mass: 0.6,
    });
    opacity.value = withTiming(isActive ? 1 : 0.3, { duration: 300 });
  }, [current]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
    backgroundColor: C.primary,
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
});

const ProgressDots = memo(({ current }: { current: number }) => (
  <View style={styles.dots}>
    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
      <DotItem key={i} index={i} current={current} />
    ))}
  </View>
));

// ─── DatePickerWheel ─────────────────────────────────────────────────────────
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
    const ref = React.useRef<ScrollView>(null);
    const IH = 50;

    useEffect(() => {
      setTimeout(() => {
        ref.current?.scrollTo({ y: selectedIndex * IH, animated: false });
      }, 50);
    }, []);

    const handleScrollEnd = useCallback(
      (e: any) => {
        const i = Math.round(e.nativeEvent.contentOffset.y / IH);
        const clamped = Math.max(0, Math.min(items.length - 1, i));
        if (clamped !== selectedIndex) {
          onSelect(clamped);
        }
      },
      [selectedIndex, onSelect, items.length]
    );

    return (
      <View style={{ width, height: IH * 3 }}>
        <View style={styles.pickerHighlight} pointerEvents="none" />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={IH}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: IH }}
          nestedScrollEnabled
        >
          {items.map((item, i) => (
            <View key={i} style={[styles.pickerItem, { height: IH }]}>
              <Text
                style={[
                  styles.pickerText,
                  { color: colors.subtleText },
                  i === selectedIndex && [
                    styles.pickerTextSel,
                    { color: colors.text },
                  ],
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
);

// ─── HeightRuler ─────────────────────────────────────────────────────────────
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
    const ref = React.useRef<ScrollView>(null);
    const TH = 8;
    const RH = 320;
    const LABEL_W = 34;
    const TICK_W = 30;
    const lastValueRef = React.useRef(value);

    useEffect(() => {
      setTimeout(() => {
        ref.current?.scrollTo({
          y: (max - value) * TH - RH / 2,
          animated: false,
        });
      }, 50);
    }, []);

    const snap = useCallback(
      (e: any) => {
        const v = max - Math.round((e.nativeEvent.contentOffset.y + RH / 2) / TH);
        const c = Math.max(min, Math.min(max, v));
        if (c !== lastValueRef.current) {
          lastValueRef.current = c;
          onChange(c);
        }
      },
      [onChange, min, max]
    );

    const ticks = useMemo(
      () =>
        Array.from({ length: max - min + 1 }, (_, i) => {
          const tv = max - i;
          return {
            tv,
            major: tv % 10 === 0,
            mid: tv % 5 === 0 && tv % 10 !== 0,
          };
        }),
      [min, max]
    );

    return (
      <View style={[styles.rulerWrap, { width: LABEL_W + TICK_W + 4 }]}>
        <View style={styles.rulerIndicator} pointerEvents="none" />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={snap}
          onScrollEndDrag={snap}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingVertical: RH / 2 }}
          decelerationRate="fast"
          nestedScrollEnabled
          style={{ height: RH }}
        >
          {ticks.map(({ tv, major, mid }, i) => (
            <View
              key={i}
              style={{
                height: TH,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ width: LABEL_W, height: TH, position: 'relative' }}>
                {major && (
                  <Text
                    style={[
                      styles.vTickLabel,
                      {
                        color: colors.text,
                        position: 'absolute',
                        right: 4,
                        top: '50%',
                        transform: [{ translateY: -7 }],
                      },
                    ]}
                  >
                    {tv}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.vTick,
                  { backgroundColor: colors.divider },
                  major && [styles.vTickMajor, { backgroundColor: colors.text }],
                  mid && [styles.vTickMid, { backgroundColor: colors.subtleText }],
                ]}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
);

// ─── WeightGauge ─────────────────────────────────────────────────────────────
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
    const ref = React.useRef<ScrollView>(null);
    const TW = 8;
    const MIN = 30;
    const MAX = 200;
    const CENTER_OFFSET = W / 2 - 60;
    const lastValueRef = React.useRef(value);

    useEffect(() => {
      setTimeout(() => {
        ref.current?.scrollTo({
          x: (value - MIN) * TW - CENTER_OFFSET,
          animated: false,
        });
      }, 50);
    }, []);

    const snap = useCallback(
      (e: any) => {
        const v =
          Math.round((e.nativeEvent.contentOffset.x + CENTER_OFFSET) / TW) + MIN;
        const c = Math.max(MIN, Math.min(MAX, v));
        if (c !== lastValueRef.current) {
          lastValueRef.current = c;
          onChange(c);
        }
      },
      [onChange]
    );

    const bmi = height > 0 ? value / Math.pow(height / 100, 2) : 0;
    const bmiInfo =
      bmi < 18.5
        ? { label: 'Underweight', color: C.warning }
        : bmi < 25
        ? { label: 'Normal', color: C.success }
        : bmi < 30
        ? { label: 'Overweight', color: C.warning }
        : { label: 'Obese', color: C.error };

    const cats = [
      { label: 'Underweight', color: C.warning, active: bmi < 18.5 },
      { label: 'Normal', color: C.success, active: bmi >= 18.5 && bmi < 25 },
      { label: 'Overweight', color: C.warning, active: bmi >= 25 && bmi < 30 },
    ];

    const ticks = useMemo(
      () =>
        Array.from({ length: (MAX - MIN) * 2 + 1 }, (_, i) => ({
          major: (MIN + i * 0.5) % 5 === 0,
        })),
      []
    );

    return (
      <View style={styles.weightWrap}>
        <View style={styles.bmiCats}>
          {cats.map(({ label, color, active }) => (
            <View key={label} style={styles.bmiCat}>
              <View style={[styles.bmiDot, { backgroundColor: color }]} />
              <Text
                style={[
                  styles.bmiLbl,
                  { color: colors.subtleText },
                  active && [styles.bmiLblActive, { color: colors.text }],
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.weightDisplay}>
          <Text style={[styles.weightVal, { color: colors.text }]}>
            {value.toFixed(1)}
          </Text>
          <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>
            kg
          </Text>
        </View>

        <View style={styles.weightRuler}>
          <View style={styles.weightIndicator} />
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={snap}
            onScrollEndDrag={snap}
            contentContainerStyle={{ paddingHorizontal: CENTER_OFFSET }}
            decelerationRate="fast"
            nestedScrollEnabled
          >
            {ticks.map(({ major }, i) => (
              <View key={i} style={[styles.wTickWrap, { width: TW }]}>
                <View
                  style={[
                    styles.wTick,
                    { backgroundColor: colors.divider },
                    major && [styles.wTickMajor, { backgroundColor: colors.text }],
                  ]}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.bmiBox, { borderColor: bmiInfo.color }]}>
          <Text style={[styles.bmiBoxLbl, { color: colors.textSecondary }]}>
            Your BMI shows you are
          </Text>
          <Text style={[styles.bmiBoxVal, { color: bmiInfo.color }]}>
            {bmiInfo.label}
          </Text>
        </View>
      </View>
    );
  }
);

// ─── Gender Constants ────────────────────────────────────────────────────────
const MALE_COLOR = '#3B82F6';
const FEMALE_COLOR = '#EC4899';

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 — Gender
// ═════════════════════════════════════════════════════════════════════════════
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

    const titleO = useSharedValue(0);
    const titleY = useSharedValue(30);
    const maleO = useSharedValue(0);
    const maleY = useSharedValue(50);
    const femO = useSharedValue(0);
    const femY = useSharedValue(50);

    useEntrance(isActive, [
      { val: titleO, from: 0, to: 1, duration: 450 },
      { val: titleY, from: 30, to: 0, duration: 450 },
      { val: maleO, from: 0, to: 1, duration: 500, delay: 200, useSpring: true },
      { val: maleY, from: 50, to: 0, duration: 500, delay: 200, useSpring: true },
      { val: femO, from: 0, to: 1, duration: 500, delay: 350, useSpring: true },
      { val: femY, from: 50, to: 0, duration: 500, delay: 350, useSpring: true },
    ]);

    const maleScale = useSharedValue(gender === 'male' ? 1.08 : 1);
    const femScale = useSharedValue(gender === 'female' ? 1.08 : 1);

    useEffect(() => {
      if (gender === 'male') {
        maleScale.value = withSpring(1.08, { damping: 14, stiffness: 200 });
        femScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      } else if (gender === 'female') {
        maleScale.value = withSpring(1, { damping: 14, stiffness: 200 });
        femScale.value = withSpring(1.08, { damping: 14, stiffness: 200 });
      } else {
        maleScale.value = withSpring(1, { damping: 14, stiffness: 200 });
        femScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      }
    }, [gender]);

    const handleSelect = useCallback(
      (g: 'male' | 'female') => {
        void Haptics.selectionAsync().catch(() => {});
        setGender(g);
      },
      [setGender]
    );

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleO.value,
      transform: [{ translateY: titleY.value }],
    }));

    const maleWrapStyle = useAnimatedStyle(() => ({
      opacity: maleO.value,
      transform: [{ translateY: maleY.value }],
    }));

    const femWrapStyle = useAnimatedStyle(() => ({
      opacity: femO.value,
      transform: [{ translateY: femY.value }],
    }));

    const maleScaleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: maleScale.value }],
    }));

    const femScaleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: femScale.value }],
    }));

    const isMaleSelected = gender === 'male';
    const isFemaleSelected = gender === 'female';

    return (
      <View style={styles.stepInner}>
        <Animated.Text style={[styles.stepTitle, { color: colors.text }, titleStyle]}>
          What's Your Gender
        </Animated.Text>

        <View style={styles.genderColumn}>
          <Animated.View style={maleWrapStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleSelect('male')}
              style={styles.genderOption}
            >
              <Animated.View
                style={[
                  styles.genderCircle,
                  maleScaleStyle,
                  {
                    borderColor: isMaleSelected
                      ? MALE_COLOR
                      : 'rgba(180,180,180,0.4)',
                    backgroundColor: isMaleSelected ? MALE_COLOR : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="male"
                  size={48}
                  color={isMaleSelected ? '#FFF' : colors.text}
                />
              </Animated.View>

              <Text
                style={[
                  styles.genderLabel,
                  {
                    color: colors.text,
                    fontWeight: isMaleSelected ? '700' : '400',
                  },
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={femWrapStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleSelect('female')}
              style={styles.genderOption}
            >
              <Animated.View
                style={[
                  styles.genderCircle,
                  femScaleStyle,
                  {
                    borderColor: isFemaleSelected
                      ? FEMALE_COLOR
                      : 'rgba(180,180,180,0.4)',
                    backgroundColor: isFemaleSelected
                      ? FEMALE_COLOR
                      : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="female"
                  size={48}
                  color={isFemaleSelected ? '#FFF' : colors.text}
                />
              </Animated.View>

              <Text
                style={[
                  styles.genderLabel,
                  {
                    color: colors.text,
                    fontWeight: isFemaleSelected ? '700' : '400',
                  },
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 — Birthday
// ═════════════════════════════════════════════════════════════════════════════
const Step2Birthday = memo(
  ({
    isActive,
    days,
    months,
    years,
    birthDay,
    birthMonth,
    birthYear,
    currentYear,
    setBirthDay,
    setBirthMonth,
    setBirthYear,
  }: any) => {
    const { colors } = useTheme();

    const titleO = useSharedValue(0);
    const titleY = useSharedValue(30);
    const subtO = useSharedValue(0);
    const subtY = useSharedValue(30);
    const cardO = useSharedValue(0);
    const cardSc = useSharedValue(0.85);

    useEntrance(isActive, [
      { val: titleO, from: 0, to: 1, duration: 420 },
      { val: titleY, from: 30, to: 0, duration: 420 },
      { val: subtO, from: 0, to: 1, duration: 420, delay: 100 },
      { val: subtY, from: 25, to: 0, duration: 420, delay: 100 },
      { val: cardO, from: 0, to: 1, duration: 550, delay: 280 },
      { val: cardSc, from: 0.85, to: 1, duration: 550, delay: 280, useSpring: true },
    ]);

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleO.value,
      transform: [{ translateY: titleY.value }],
    }));
    const subtStyle = useAnimatedStyle(() => ({
      opacity: subtO.value,
      transform: [{ translateY: subtY.value }],
    }));
    const cardStyle = useAnimatedStyle(() => ({
      opacity: cardO.value,
      transform: [{ scale: cardSc.value }],
    }));

    return (
      <View style={styles.stepInner}>
        <Animated.Text style={[styles.stepTitle, { color: colors.text }, titleStyle]}>
          When's Your Birthday?
        </Animated.Text>
        <Animated.Text
          style={[styles.stepSubtitle, { color: colors.textSecondary }, subtStyle]}
        >
          We'll customize your experience based on your age
        </Animated.Text>
        <Animated.View
          style={[
            styles.datePicker,
            { backgroundColor: colors.surface, borderColor: colors.divider },
            cardStyle,
          ]}
        >
          <DatePickerWheel
            items={days}
            selectedIndex={birthDay - 1}
            onSelect={(i) => setBirthDay(i + 1)}
            width={70}
          />
          <DatePickerWheel
            items={months}
            selectedIndex={birthMonth}
            onSelect={setBirthMonth}
            width={80}
          />
          <DatePickerWheel
            items={years}
            selectedIndex={birthYear - (currentYear - 80)}
            onSelect={(i) => setBirthYear(currentYear - 80 + i)}
            width={90}
          />
        </Animated.View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3 — Height
// ═════════════════════════════════════════════════════════════════════════════
const Step3Height = memo(
  ({
    isActive,
    height,
    gender,
    onChange,
  }: {
    isActive: boolean;
    height: number;
    gender: string;
    onChange: (v: number) => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useSharedValue(0);
    const titleY = useSharedValue(30);
    const imgO = useSharedValue(0);
    const imgX = useSharedValue(-60);
    const rulO = useSharedValue(0);
    const rulX = useSharedValue(60);
    const valSc = useSharedValue(0.7);
    const valO = useSharedValue(0);

    useEntrance(isActive, [
      { val: titleO, from: 0, to: 1, duration: 420 },
      { val: titleY, from: 30, to: 0, duration: 420 },
      { val: imgO, from: 0, to: 1, duration: 550, delay: 180, useSpring: true },
      { val: imgX, from: -60, to: 0, duration: 550, delay: 180, useSpring: true },
      { val: rulO, from: 0, to: 1, duration: 550, delay: 300, useSpring: true },
      { val: rulX, from: 60, to: 0, duration: 550, delay: 300, useSpring: true },
      { val: valSc, from: 0.7, to: 1, duration: 500, delay: 480, useSpring: true },
      { val: valO, from: 0, to: 1, duration: 400, delay: 480 },
    ]);

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleO.value,
      transform: [{ translateY: titleY.value }],
    }));
    const imgStyle = useAnimatedStyle(() => ({
      opacity: imgO.value,
      transform: [{ translateX: imgX.value }],
    }));
    const rulStyle = useAnimatedStyle(() => ({
      opacity: rulO.value,
      transform: [{ translateX: rulX.value }],
    }));
    const valStyle = useAnimatedStyle(() => ({
      opacity: valO.value,
      transform: [{ scale: valSc.value }],
    }));

    return (
      <View style={[styles.stepInner, { flex: 1 }]}>
        <Animated.Text style={[styles.stepTitle, { color: colors.text }, titleStyle]}>
          Your Height
        </Animated.Text>

        <View style={styles.heightMain}>
          <Animated.View style={[styles.heightImgWrap, imgStyle]}>
            <Image
              source={
                gender === 'female'
                  ? require('../../assets/height-female.png')
                  : require('../../assets/height-male.png')
              }
              style={gender === 'female' ? styles.heightImgF : styles.heightImgM}
              resizeMode="contain"
            />
            <View style={styles.heightLine} />
          </Animated.View>

          <Animated.View style={[styles.heightRulerSide, rulStyle]}>
            <HeightRuler value={height} onChange={onChange} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.heightValBox,
            { backgroundColor: colors.surface },
            valStyle,
          ]}
        >
          <Text style={styles.heightValNum}>{height}</Text>
          <Text style={[styles.heightValUnit, { color: colors.textSecondary }]}>
            cm
          </Text>
        </Animated.View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4 — Weight
// ═════════════════════════════════════════════════════════════════════════════
const Step4Weight = memo(
  ({
    isActive,
    weight,
    height,
    onChange,
  }: {
    isActive: boolean;
    weight: number;
    height: number;
    onChange: (v: number) => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useSharedValue(0);
    const titleY = useSharedValue(30);
    const subtO = useSharedValue(0);
    const subtY = useSharedValue(30);
    const gaugeSc = useSharedValue(0.85);
    const gaugeO = useSharedValue(0);

    useEntrance(isActive, [
      { val: titleO, from: 0, to: 1, duration: 420 },
      { val: titleY, from: 30, to: 0, duration: 420 },
      { val: subtO, from: 0, to: 1, duration: 420, delay: 100 },
      { val: subtY, from: 25, to: 0, duration: 420, delay: 100 },
      { val: gaugeSc, from: 0.85, to: 1, duration: 550, delay: 250, useSpring: true },
      { val: gaugeO, from: 0, to: 1, duration: 500, delay: 250 },
    ]);

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleO.value,
      transform: [{ translateY: titleY.value }],
    }));
    const subtStyle = useAnimatedStyle(() => ({
      opacity: subtO.value,
      transform: [{ translateY: subtY.value }],
    }));
    const gaugeStyle = useAnimatedStyle(() => ({
      opacity: gaugeO.value,
      transform: [{ scale: gaugeSc.value }],
    }));

    return (
      <View style={styles.stepInner}>
        <Animated.Text style={[styles.stepTitle, { color: colors.text }, titleStyle]}>
          Your Current Weight
        </Animated.Text>
        <Animated.Text
          style={[styles.stepSubtitle, { color: colors.textSecondary }, subtStyle]}
        >
          We'll use this to track your progress
        </Animated.Text>

        <Animated.View style={gaugeStyle}>
          <WeightGauge value={weight} onChange={onChange} height={height} />
        </Animated.View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 5 — Goals
// ═════════════════════════════════════════════════════════════════════════════
const GOALS = [
  { id: 'weight_loss', label: 'Lose Weight', icon: 'trending-down' },
  { id: 'muscle_gain', label: 'Build Muscle', icon: 'fitness' },
  { id: 'maintenance', label: 'Stay Fit', icon: 'heart' },
] as const;

const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { id: 'lightly_active', label: 'Light', desc: '1-3 days/week' },
  { id: 'moderately_active', label: 'Moderate', desc: '3-5 days/week' },
  { id: 'very_active', label: 'Active', desc: '6-7 days/week' },
] as const;

const GoalItem = memo(
  ({
    goal,
    isSelected,
    onPress,
    animO,
    animY,
    fillSV,
  }: {
    goal: (typeof GOALS)[number];
    isSelected: boolean;
    onPress: () => void;
    animO: SharedValue<number>;
    animY: SharedValue<number>;
    fillSV: SharedValue<number>;
  }) => {
    const { colors } = useTheme();

    const wrapStyle = useAnimatedStyle(() => ({
      opacity: animO.value,
      transform: [{ translateY: animY.value }],
    }));

    const cardStyle = useAnimatedStyle(() => ({
      borderColor: fillSV.value > 0.5 ? C.primary : colors.divider,
      backgroundColor: fillSV.value > 0.5 ? C.primary : colors.surface,
    }));

    return (
      <Animated.View style={[styles.goalCardWrap, wrapStyle]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <Animated.View style={[styles.goalCard, cardStyle]}>
            <Ionicons
              name={goal.icon as any}
              size={28}
              color={isSelected ? '#FFF' : C.primary}
            />
            <Text style={[styles.goalText, { color: isSelected ? '#FFF' : colors.text }]}>
              {goal.label}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

const ActivityItem = memo(
  ({
    lvl,
    isSelected,
    onPress,
    animO,
    animY,
    fillSV,
  }: {
    lvl: (typeof ACTIVITIES)[number];
    isSelected: boolean;
    onPress: () => void;
    animO: SharedValue<number>;
    animY: SharedValue<number>;
    fillSV: SharedValue<number>;
  }) => {
    const { colors } = useTheme();

    const wrapStyle = useAnimatedStyle(() => ({
      opacity: animO.value,
      transform: [{ translateY: animY.value }],
    }));

    const cardStyle = useAnimatedStyle(() => ({
      borderColor: fillSV.value > 0.5 ? C.primary : colors.divider,
      backgroundColor: fillSV.value > 0.5 ? C.primary : colors.surface,
    }));

    return (
      <Animated.View style={wrapStyle}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <Animated.View style={[styles.actCard, cardStyle]}>
            <Text style={[styles.actLabel, { color: isSelected ? '#FFF' : colors.text }]}>
              {lvl.label}
            </Text>
            <Text
              style={[
                styles.actDesc,
                {
                  color: isSelected
                    ? 'rgba(255,255,255,0.75)'
                    : colors.textSecondary,
                },
              ]}
            >
              {lvl.desc}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

const Step5Goals = memo(
  ({
    isActive,
    fitnessGoal,
    activityLevel,
    setFitnessGoal,
    setActivityLevel,
  }: {
    isActive: boolean;
    fitnessGoal: string;
    activityLevel: string;
    setFitnessGoal: (v: any) => void;
    setActivityLevel: (v: any) => void;
  }) => {
    const { colors } = useTheme();

    const titleO = useSharedValue(0);
    const titleY = useSharedValue(30);
    const subtO = useSharedValue(0);
    const subtY = useSharedValue(30);
    const lblO = useSharedValue(0);
    const lblY = useSharedValue(30);

    const g0O = useSharedValue(0);
    const g0Y = useSharedValue(35);
    const g1O = useSharedValue(0);
    const g1Y = useSharedValue(35);
    const g2O = useSharedValue(0);
    const g2Y = useSharedValue(35);
    const goalOs = useMemo(() => [g0O, g1O, g2O], []);
    const goalYs = useMemo(() => [g0Y, g1Y, g2Y], []);

    const gf0 = useSharedValue(0);
    const gf1 = useSharedValue(0);
    const gf2 = useSharedValue(0);
    const goalFills = useMemo(() => [gf0, gf1, gf2], []);

    const a0O = useSharedValue(0);
    const a0Y = useSharedValue(35);
    const a1O = useSharedValue(0);
    const a1Y = useSharedValue(35);
    const a2O = useSharedValue(0);
    const a2Y = useSharedValue(35);
    const a3O = useSharedValue(0);
    const a3Y = useSharedValue(35);
    const actOs = useMemo(() => [a0O, a1O, a2O, a3O], []);
    const actYs = useMemo(() => [a0Y, a1Y, a2Y, a3Y], []);

    const af0 = useSharedValue(0);
    const af1 = useSharedValue(0);
    const af2 = useSharedValue(0);
    const af3 = useSharedValue(0);
    const actFills = useMemo(() => [af0, af1, af2, af3], []);

    useEffect(() => {
      if (!isActive) {
        titleO.value = 0;
        titleY.value = 30;
        subtO.value = 0;
        subtY.value = 30;
        lblO.value = 0;
        lblY.value = 30;
        goalOs.forEach((o) => (o.value = 0));
        goalYs.forEach((y) => (y.value = 35));
        actOs.forEach((o) => (o.value = 0));
        actYs.forEach((y) => (y.value = 35));
        return;
      }

      titleO.value = withTiming(1, SMOOTH_TIMING);
      titleY.value = withTiming(0, SMOOTH_TIMING);

      subtO.value = withDelay(100, withTiming(1, SMOOTH_TIMING));
      subtY.value = withDelay(100, withTiming(0, SMOOTH_TIMING));

      goalOs.forEach((o, i) => {
        o.value = withDelay(
          250 + i * 100,
          withTiming(1, { duration: 420, easing: EASE_OUT })
        );
      });

      goalYs.forEach((y, i) => {
        y.value = withDelay(
          250 + i * 100,
          withTiming(0, { duration: 420, easing: EASE_OUT })
        );
      });

      const afterGoals = 250 + GOALS.length * 100 + 80;
      lblO.value = withDelay(
        afterGoals,
        withTiming(1, { duration: 380, easing: EASE_OUT })
      );
      lblY.value = withDelay(
        afterGoals,
        withTiming(0, { duration: 380, easing: EASE_OUT })
      );

      actOs.forEach((o, i) => {
        o.value = withDelay(
          afterGoals + 60 + i * 80,
          withTiming(1, { duration: 380, easing: EASE_OUT })
        );
      });

      actYs.forEach((y, i) => {
        y.value = withDelay(
          afterGoals + 60 + i * 80,
          withTiming(0, { duration: 380, easing: EASE_OUT })
        );
      });
    }, [isActive]);

    useEffect(() => {
      goalFills.forEach((f, i) => {
        f.value = withTiming(GOALS[i].id === fitnessGoal ? 1 : 0, FAST_TIMING);
      });
    }, [fitnessGoal]);

    useEffect(() => {
      actFills.forEach((f, i) => {
        f.value = withTiming(
          ACTIVITIES[i].id === activityLevel ? 1 : 0,
          FAST_TIMING
        );
      });
    }, [activityLevel]);

    const handleGoal = useCallback(
      (id: string) => {
        void Haptics.selectionAsync().catch(() => {});
        setFitnessGoal(id);
      },
      [setFitnessGoal]
    );

    const handleActivity = useCallback(
      (id: string) => {
        void Haptics.selectionAsync().catch(() => {});
        setActivityLevel(id);
      },
      [setActivityLevel]
    );

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleO.value,
      transform: [{ translateY: titleY.value }],
    }));
    const subtStyle = useAnimatedStyle(() => ({
      opacity: subtO.value,
      transform: [{ translateY: subtY.value }],
    }));
    const lblStyle = useAnimatedStyle(() => ({
      opacity: lblO.value,
      transform: [{ translateY: lblY.value }],
    }));

    return (
      <View style={styles.stepInner}>
        <Animated.Text style={[styles.stepTitle, { color: colors.text }, titleStyle]}>
          Fitness Goals
        </Animated.Text>
        <Animated.Text
          style={[styles.stepSubtitle, { color: colors.textSecondary }, subtStyle]}
        >
          What do you want to achieve?
        </Animated.Text>

        <View style={styles.goalsRow}>
          {GOALS.map((goal, i) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              isSelected={fitnessGoal === goal.id}
              onPress={() => handleGoal(goal.id)}
              animO={goalOs[i]}
              animY={goalYs[i]}
              fillSV={goalFills[i]}
            />
          ))}
        </View>

        <Animated.Text style={[styles.sectionLabel, { color: colors.text }, lblStyle]}>
          Activity Level
        </Animated.Text>

        <View style={styles.activityList}>
          {ACTIVITIES.map((lvl, i) => (
            <ActivityItem
              key={lvl.id}
              lvl={lvl}
              isSelected={activityLevel === lvl.id}
              onPress={() => handleActivity(lvl.id)}
              animO={actOs[i]}
              animY={actYs[i]}
              fillSV={actFills[i]}
            />
          ))}
        </View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// AnimatedSlide — parallax wrapper
// ═════════════════════════════════════════════════════════════════════════════
const AnimatedSlide = memo(
  ({
    index,
    railX,
    children,
  }: {
    index: number;
    railX: SharedValue<number>;
    children: React.ReactNode;
  }) => {
    const contentStyle = useAnimatedStyle(() => {
      const slideStart = -index * W;
      const distance = (railX.value - slideStart) / W;

      return {
        transform: [
          {
            translateX: interpolate(
              distance,
              [-1, 0, 1],
              [-W * 0.2, 0, W * 0.2],
              Extrapolation.CLAMP
            ),
          },
          {
            scale: interpolate(
              Math.abs(distance),
              [0, 1],
              [1, 0.92],
              Extrapolation.CLAMP
            ),
          },
        ],
        opacity: interpolate(
          Math.abs(distance),
          [0, 0.4, 1],
          [1, 0.7, 0.2],
          Extrapolation.CLAMP
        ),
      };
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <ScrollView
            contentContainerStyle={styles.slideScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    );
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// ROOT SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const currentYear = new Date().getFullYear();
  const [birthDay, setBirthDay] = useState(15);
  const [birthMonth, setBirthMonth] = useState(6);
  const [birthYear, setBirthYear] = useState(1995);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');

  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
    []
  );
  const months = useMemo(
    () => [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    []
  );
  const years = useMemo(
    () => Array.from({ length: 80 }, (_, i) => String(currentYear - 80 + i)),
    [currentYear]
  );

  // Rail
  const railX = useSharedValue(0);
  const stepSV = useSharedValue(0);

  // Back button fade
  const backO = useSharedValue(0);
  useEffect(() => {
    backO.value = withTiming(step > 0 ? 1 : 0, { duration: 250 });
  }, [step]);

  const backStyle = useAnimatedStyle(() => ({
    opacity: backO.value,
    transform: [{ translateX: interpolate(backO.value, [0, 1], [-20, 0]) }],
  }));

  const updateStep = useCallback((nextStep: number) => {
    setStep(nextStep);
  }, []);

  const goTo = useCallback(
    (nextStep: number) => {
      'worklet';
      stepSV.value = nextStep;
      railX.value = withSpring(-nextStep * W, {
        damping: 24,
        stiffness: 200,
        mass: 0.7,
        overshootClamping: false,
      });
      runOnJS(updateStep)(nextStep);
    },
    [updateStep]
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      const base = -stepSV.value * W;
      let dx = e.translationX;

      if (
        (stepSV.value === 0 && dx > 0) ||
        (stepSV.value === TOTAL_STEPS - 1 && dx < 0)
      ) {
        dx *= 0.15;
      }

      railX.value = base + dx;
    })
    .onEnd((e) => {
      'worklet';
      const cur = stepSV.value;
      let next = cur;

      if (
        (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -SWIPE_VELOCITY) &&
        cur < TOTAL_STEPS - 1
      ) {
        next = cur + 1;
      } else if (
        (e.translationX > SWIPE_THRESHOLD || e.velocityX > SWIPE_VELOCITY) &&
        cur > 0
      ) {
        next = cur - 1;
      }

      goTo(next);
    });

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: railX.value }],
  }));

  // Button
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const onPressIn = useCallback(() => {
    btnScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, []);

  const onPressOut = useCallback(() => {
    btnScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handleSubmit = useCallback(async () => {
  if (!token) {
    showErrorToast({
      title: 'Authentication Error',
      message: 'Authentication token not found',
    });
    return;
  }

  setIsLoading(true);

  try {
    const dateOfBirth = `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(
      birthDay
    ).padStart(2, '0')}`;

    const body: any = {
      gender: gender || undefined,
      dateOfBirth,
      height,
      weight,
      fitnessGoal: fitnessGoal || undefined,
      activityLevel: activityLevel || undefined,
    };

    Object.keys(body).forEach((k) => {
      if (body[k] === undefined) delete body[k];
    });

    if (Object.keys(body).length > 0) {
      const res = await userService.updateBodyInformation(body, token);

      if (res.data && user) {
        updateUser({ ...user, ...res.data });
      }

      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      showSuccessToast({
        title: 'Profile Completed',
        message: 'Your onboarding is complete. Welcome to ICoach!',
      });

      setTimeout(() => {
        navigation.replace('Home');
      }, 900);
    } else {
      navigation.replace('Home');
    }
  } catch (error: unknown) {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    ).catch(() => {});

    showErrorToast({
      title: 'Update Failed',
      message: getErrorMessage(error) || 'Failed to update profile',
    });
  } finally {
    setIsLoading(false);
  }
}, [
  token,
  birthYear,
  birthMonth,
  birthDay,
  gender,
  height,
  weight,
  fitnessGoal,
  activityLevel,
  user,
  updateUser,
  navigation,
]);

const handleNext = useCallback(() => {
  void Haptics.selectionAsync().catch(() => {});

  if (step < TOTAL_STEPS - 1) {
    goTo(step + 1);
  } else {
    handleSubmit();
  }
}, [step, goTo, handleSubmit]);

const handleBack = useCallback(() => {
  if (step > 0) {
    void Haptics.selectionAsync().catch(() => {});
    goTo(step - 1);
  }
}, [step, goTo]);



  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 44) }]}>
        <Animated.View style={backStyle}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            disabled={step === 0}
          >
            <Ionicons name="chevron-back" size={22} color={C.primary} />
            <Text style={styles.backTxt}>Back</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => navigation.replace('Home')}
          style={styles.headerSide}
        >
          <Text style={[styles.skipTxt, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <ProgressDots current={step} />
      <View style={styles.stepCounter}>
        <Text style={[styles.stepCounterText, { color: colors.textSecondary }]}>
          {step + 1} of {TOTAL_STEPS}
        </Text>
      </View>

      {/* Slides */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.railClip}>
          <Animated.View style={[styles.rail, railStyle]}>
            <AnimatedSlide index={0} railX={railX}>
              <Step1Gender
                isActive={step === 0}
                gender={gender}
                setGender={setGender}
              />
            </AnimatedSlide>

            <AnimatedSlide index={1} railX={railX}>
              <Step2Birthday
                isActive={step === 1}
                days={days}
                months={months}
                years={years}
                birthDay={birthDay}
                birthMonth={birthMonth}
                birthYear={birthYear}
                currentYear={currentYear}
                setBirthDay={setBirthDay}
                setBirthMonth={setBirthMonth}
                setBirthYear={setBirthYear}
              />
            </AnimatedSlide>

            <AnimatedSlide index={2} railX={railX}>
              <Step3Height
                isActive={step === 2}
                height={height}
                gender={gender}
                onChange={setHeight}
              />
            </AnimatedSlide>

            <AnimatedSlide index={3} railX={railX}>
              <Step4Weight
                isActive={step === 3}
                weight={weight}
                height={height}
                onChange={setWeight}
              />
            </AnimatedSlide>

            <AnimatedSlide index={4} railX={railX}>
              <Step5Goals
                isActive={step === 4}
                fitnessGoal={fitnessGoal}
                activityLevel={activityLevel}
                setFitnessGoal={setFitnessGoal}
                setActivityLevel={setActivityLevel}
              />
            </AnimatedSlide>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Button */}
      <View style={styles.btnWrap}>
        <Animated.View style={btnAnimStyle}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.primary }]}
            onPress={handleNext}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={isLoading}
            activeOpacity={1}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnTxt}>
                  {isLastStep ? 'Get Started' : 'Continue'}
                </Text>
                {!isLastStep && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFF"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerSide: {
    width: 70,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backTxt: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '600',
  },
  skipTxt: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  stepCounter: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  stepCounterText: {
    fontSize: 13,
    fontWeight: '500',
  },

  railClip: {
    flex: 1,
    overflow: 'hidden',
  },
  rail: {
    flex: 1,
    flexDirection: 'row',
    width: W * TOTAL_STEPS,
  },
  slide: {
    width: W,
    flex: 1,
  },
  slideScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stepInner: {
    flex: 1,
    paddingTop: 8,
  },

  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 24,
    paddingHorizontal: 16,
  },

  // Gender
  genderColumn: {
    alignItems: 'center',
    marginTop: 36,
    gap: 25,
  },
  genderOption: {
    alignItems: 'center',
  },
  genderCircle: {
    width: 120,
    height: 120,
    borderRadius: 70,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  genderLabel: {
    fontSize: 20,
    fontWeight: '600',
  },

  // Birthday
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 20,
    marginHorizontal: 12,
    borderWidth: 1,
  },
  pickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 50,
    marginTop: -25,
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    zIndex: -1,
  },
  pickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 20,
  },
  pickerTextSel: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Height
  heightMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  heightImgWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heightImgM: {
    width: 260,
    height: 380,
  },
  heightImgF: {
    width: 240,
    height: 380,
  },
  heightLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: -10,
    height: 2,
    backgroundColor: C.primary,
  },
  heightRulerSide: {
    height: 320,
    width: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heightValBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  heightValNum: {
    fontSize: 60,
    fontWeight: '700',
    color: C.primary,
  },
  heightValUnit: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Ruler
  rulerWrap: {
    height: 320,
    position: 'relative',
  },
  rulerIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.primary,
    zIndex: 10,
    marginTop: -1.5,
  },
  vTick: {
    width: 16,
    height: 1,
  },
  vTickMajor: {
    width: 30,
    height: 2,
  },
  vTickMid: {
    width: 22,
    height: 1.5,
  },
  vTickLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Weight
  weightWrap: {
    alignItems: 'center',
  },
  bmiCats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 28,
  },
  bmiCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bmiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiLbl: {
    fontSize: 14,
  },
  bmiLblActive: {
    fontWeight: '600',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 36,
  },
  weightVal: {
    fontSize: 72,
    fontWeight: '700',
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '500',
    marginLeft: 8,
  },
  weightRuler: {
    height: 60,
    width: '100%',
  },
  weightIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 40,
    backgroundColor: C.primary,
    zIndex: 10,
  },
  wTickWrap: {
    alignItems: 'center',
  },
  wTick: {
    width: 1,
    height: 20,
  },
  wTickMajor: {
    height: 35,
    width: 2,
  },
  bmiBox: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bmiBoxLbl: {
    fontSize: 14,
  },
  bmiBoxVal: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },

  // Goals
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  goalCardWrap: {
    flex: 1,
  },
  goalCard: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 14,
  },
  activityList: {
    gap: 10,
  },
  actCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
  },
  actLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  actDesc: {
    fontSize: 13,
    marginTop: 2,
  },

  // Button
  btnWrap: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  btn: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});