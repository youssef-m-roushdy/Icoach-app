import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Svg, {
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { progressService } from '../services/progressService';
import { ApiError } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ar from '../../i18n/locales/ar.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
type MetricKey = 'strength' | 'endurance' | 'consistency' | 'volume' | 'progress' | 'habits';
type Metrics = Record<MetricKey, number>;
type TextAnchor = 'start' | 'middle' | 'end';
type TabName = 'fitness' | 'training';

interface PersonalBest {
  exercise: string;
  value: string;
}

interface TrainingData {
  totalWorkouts: number;
  weeklyAvg: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  personalBests: PersonalBest[];
}

interface UserData {
  name: string;
  joinedDate: string;
  avatarUrl: string | null;
  currentPoints: number;
  maxPoints: number;
  badgeLevel: number;
  metrics: Metrics;
  trainingData: TrainingData;
}

// ─────────────────────────────────────────────
//  CALCULATIONS
// ─────────────────────────────────────────────
const metricKeys: MetricKey[] = [
  'strength', 'endurance', 'consistency', 'volume', 'progress', 'habits',
];

const calculateFitnessScore = (metrics: Metrics): number => {
  const weights: Metrics = {
    strength: 0.25,
    endurance: 0.20,
    consistency: 0.20,
    volume: 0.15,
    progress: 0.12,
    habits: 0.08,
  };
  const maxScore = 5000;
  const total = (Object.keys(weights) as MetricKey[]).reduce(
    (sum, key) => sum + (metrics[key] / 10) * weights[key],
    0
  );
  return Math.round(total * maxScore);
};

const calculatePointsPercentage = (current: number, max: number): number =>
  (current / max) * 100;

const getMetricLabel = (key: MetricKey): string => {
  const labels: Record<MetricKey, string> = {
    strength: ar.strength,
    endurance: ar.endurance,
    consistency: ar.consistency,
    volume: ar.volume,
    progress: ar.progress,
    habits: ar.habits,
  };
  return labels[key];
};

// ─────────────────────────────────────────────
//  SPIDER RADAR CHART
// ─────────────────────────────────────────────
interface HexRadarChartProps {
  metrics: Metrics;
  size?: number;
  primaryColor: string;
  gridColor: string;
  labelColor: string;
}

const HexRadarChart: React.FC<HexRadarChartProps> = ({
  metrics,
  size = 220,
  primaryColor,
  gridColor,
  labelColor,
}) => {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [animValue, setAnimValue] = useState(0);

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    const id = animProgress.addListener(({ value }) => setAnimValue(value));
    return () => animProgress.removeListener(id);
  }, [metrics]);

  const padding = 60;
  const canvasSize = size + padding * 2;
  const center = canvasSize / 2;
  const maxRadius = size * 0.38;
  const numAxes = metricKeys.length;

  const getPoint = (index: number, radius: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (radiusFn: (key: MetricKey, i: number) => number): string =>
    metricKeys
      .map((key, i) => {
        const r = radiusFn(key, i);
        const pt = getPoint(i, r);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const animatedDataPoints = buildPolygonPoints(
    (key) => (metrics[key] / 10) * maxRadius * animValue
  );

  const animatedDotPositions = metricKeys.map((key, i) => {
    const r = (metrics[key] / 10) * maxRadius * animValue;
    return { key, i, ...getPoint(i, r) };
  });

  const labelOffset = maxRadius + 28;
  const labelPositions = metricKeys.map((key, i) => {
    const pt = getPoint(i, labelOffset);
    return { key, ...pt };
  });

  const gradientRadius = Math.max(50, canvasSize * 0.5);

  return (
    <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
      <Defs>
        <RadialGradient 
          id="hexFill" 
          cx={center} 
          cy={center} 
          r={gradientRadius}
          fx={center} 
          fy={center}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.50" />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.10" />
        </RadialGradient>
      </Defs>

      {/* Spider-web rings */}
      {gridLevels.map((level, li) => (
        <Polygon
          key={`ring-${li}`}
          points={buildPolygonPoints(() => level * maxRadius)}
          fill="none"
          stroke={gridColor}
          strokeWidth={li === gridLevels.length - 1 ? 1.5 : 0.8}
          opacity={li === gridLevels.length - 1 ? 0.8 : 0.4}
        />
      ))}

      {/* Spoke lines */}
      {metricKeys.map((_, i) => {
        const outer = getPoint(i, maxRadius);
        return (
          <Line
            key={`spoke-${i}`}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke={gridColor}
            strokeWidth="0.8"
            opacity="0.5"
          />
        );
      })}

      {/* Animated data fill */}
      <Polygon
        points={animatedDataPoints}
        fill={`url(#hexFill)`}
        stroke={primaryColor}
        strokeWidth="2"
        opacity="0.95"
      />

      {/* Animated dots */}
      {animatedDotPositions.map(({ key, x, y }) => (
        <React.Fragment key={`dot-${key}`}>
          <Circle cx={x} cy={y} r="7" fill={primaryColor} opacity={0.2 * animValue} />
          <Circle
            cx={x}
            cy={y}
            r="4"
            fill={primaryColor}
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity={animValue}
          />
        </React.Fragment>
      ))}

      {/* Labels */}
      {labelPositions.map(({ key, x, y }) => {
        let anchor: TextAnchor = 'middle';
        if (x < center - 10) anchor = 'end';
        if (x > center + 10) anchor = 'start';
        
        const metricValue = metrics[key] || 0;
        const val = metricValue.toFixed(1);
        
        return (
          <React.Fragment key={`label-${key}`}>
            <SvgText
              x={x}
              y={y - 5}
              fontSize="9"
              fill={labelColor}
              textAnchor={anchor}
              fontWeight="500"
            >
              {getMetricLabel(key)}
            </SvgText>
            <SvgText
              x={x}
              y={y + 7}
              fontSize="9"
              fill={primaryColor}
              textAnchor={anchor}
              fontWeight="700"
            >
              {val}/10
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

// ─────────────────────────────────────────────
//  ANIMATED SCORE
// ─────────────────────────────────────────────
interface AnimatedScoreProps {
  score: number;
  color: string;
}

const AnimatedScore: React.FC<AnimatedScoreProps> = ({ score, color }) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1800,
      useNativeDriver: false,
    }).start();
    const id = animVal.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [score]);

  return (
    <Text style={[styles.fitnessScoreNumber, { color }]}>
      {displayScore.toLocaleString()}
    </Text>
  );
};

// ─────────────────────────────────────────────
//  TRAINING TAB
// ─────────────────────────────────────────────
interface TrainingTabProps {
  data: TrainingData;
}

const TrainingTab: React.FC<TrainingTabProps> = ({ data }) => {
  const { colors } = useTheme();

  const stats: Array<{ label: string; value: string | number }> = [
    { label: ar.totalWorkouts, value: data.totalWorkouts },
    { label: ar.weeklyAvg, value: data.weeklyAvg.toFixed(1) },
    { label: ar.currentStreak, value: `${data.currentStreak}d` },
    { label: ar.bestStreak, value: `${data.longestStreak}d` },
  ];

  return (
    <View>
      <View style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <View
            key={i}
            style={[styles.statCard, { backgroundColor: colors.authInputBg ?? colors.statBg, borderColor: colors.authInputBorder ?? colors.statBorder, borderWidth: 1 }]}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.subtleText }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.pbSection, { backgroundColor: colors.authInputBg ?? colors.statBg, borderColor: colors.authInputBorder ?? colors.cardBorder, borderWidth: 1 }]}>
        <Text style={[styles.sectionLabel, { color: colors.subtleText }]}>{ar.personalBests}</Text>
        {data.personalBests.length > 0 ? (
          data.personalBests.map((pb: PersonalBest, i: number) => (
            <View key={i} style={styles.pbRow}>
              <View style={[styles.pbDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.pbExercise, { color: colors.text }]}>{pb.exercise}</Text>
              <Text style={[styles.pbValue, { color: colors.primary }]}>{pb.value}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.subtleText }]}>
            {ar.noPersonalBestsYet}
          </Text>
        )}
      </View>

      <View style={[styles.volumeBar, { backgroundColor: colors.authInputBg ?? colors.statBg, borderColor: colors.authInputBorder ?? colors.cardBorder, borderWidth: 1 }]}>
        <Text style={[styles.volumeLabel, { color: colors.subtleText }]}>{ar.totalVolumeLifted}</Text>
        <Text style={[styles.volumeValue, { color: colors.primary }]}>
          {(data.totalVolume / 1000).toFixed(1)}k kg
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
//  LOADING COMPONENT
// ─────────────────────────────────────────────
const LoadingScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>{ar.loadingYourProgress}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
//  ERROR COMPONENT
// ─────────────────────────────────────────────
const ErrorScreen = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.error }]}>⚠️</Text>
      <Text style={[styles.errorMessage, { color: colors.text }]}>{message}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={onRetry}
      >
        <Text style={styles.retryButtonText}>{ar.tryAgain}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────
export default function GymProgressScreen() {
  const { colors } = useTheme();
  const { user, token } = useAuth() as any;
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  const [activeTab, setActiveTab] = useState<TabName>('fitness');
  const [progressData, setProgressData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  const fetchProgressData = async () => {
    try {
      setError(null);
      
      if (!token) {
        setError(ar.authenticationRequired);
        setLoading(false);
        return;
      }

      console.log('Fetching progress with token:', token ? 'Token exists' : 'No token');
      const response = await progressService.getProgressDashboard(token);
      
      // Check if response was successful and has data
      if (!response.success || !response.data) {
        throw new Error(response.message || ar.failedToLoadProgressData);
      }

      const dashboardData = response.data;
      
      // Convert string metrics to numbers with safe fallbacks
      const convertedData: UserData = {
        name: dashboardData.name || ar.user,
        joinedDate: dashboardData.joinedDate || '',
        avatarUrl: dashboardData.avatarUrl || null,
        currentPoints: dashboardData.currentPoints || 0,
        maxPoints: dashboardData.maxPoints || 10000,
        badgeLevel: dashboardData.badgeLevel || 1,
        metrics: {
          strength: Number(dashboardData.metrics?.strength) || 0,
          endurance: Number(dashboardData.metrics?.endurance) || 0,
          consistency: Number(dashboardData.metrics?.consistency) || 0,
          volume: Number(dashboardData.metrics?.volume) || 0,
          progress: Number(dashboardData.metrics?.progress) || 0,
          habits: Number(dashboardData.metrics?.habits) || 0,
        },
        trainingData: {
          totalWorkouts: dashboardData.trainingData?.totalWorkouts || 0,
          weeklyAvg: Number(dashboardData.trainingData?.weeklyAvg) || 0,
          currentStreak: dashboardData.trainingData?.currentStreak || 0,
          longestStreak: dashboardData.trainingData?.longestStreak || 0,
          totalVolume: Number(dashboardData.trainingData?.totalVolume) || 0,
          personalBests: dashboardData.trainingData?.personalBests || [],
        }
      };
      
      setProgressData(convertedData);

    } catch (err: any) {
      console.error('Error fetching progress:', err);
      
      // Handle different error types
      if (err.name === 'ApiError') {
        setError(err.message || ar.failedToLoadProgressData);
      } else {
        setError(err.message || ar.failedToLoadProgressData);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgressData();
  }, []);

  useEffect(() => {
    fetchProgressData();
  }, []);

  useEffect(() => {
    if (progressData) {
      Animated.stagger(150, [
        Animated.timing(headerFade, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [progressData]);

  // Avatar resolution logic
  const rawAvatar = user?.photoURL || user?.avatar || progressData?.avatarUrl;
  const avatarSource =
    rawAvatar && typeof rawAvatar === 'string' && rawAvatar.startsWith('http')
      ? { uri: rawAvatar }
      : {
          uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            progressData?.name || user?.firstName || user?.username || 'U'
          )}&background=FFD700&color=000&bold=true`,
        };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !progressData) {
    return <ErrorScreen message={error || ar.noDataAvailable} onRetry={fetchProgressData} />;
  }

  const computedScore = calculateFitnessScore(progressData.metrics);
  const pointsPercent = calculatePointsPercentage(progressData.currentPoints, progressData.maxPoints);

  return (
    <View style={[styles.main, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Animated Gradient Background matches SignIn */}
      <LinearGradient
        colors={colors.authBgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: colors.authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: colors.authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: colors.authCircle3 }]} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: dynamicPaddingBottom }} // Space for floating bottom nav
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Header */}
        <Animated.View style={[styles.heroSection, { opacity: headerFade }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
              <Image source={avatarSource} style={styles.avatarImage} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {progressData.name}
              </Text>
              <Text style={[styles.joinedText, { color: colors.subtleText }]}>
                {ar.joined} {progressData.joinedDate}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Points Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.authInputBg ?? colors.surface,
              borderColor: colors.authInputBorder ?? colors.cardBorder,
              borderWidth: 1,
              ...Platform.select({
                ios: {
                  shadowColor: colors.shadow,
                },
              }),
              opacity: headerFade,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <View style={styles.pointsRow}>
            <Text style={[styles.pointsText, { color: colors.text }]}>
              {progressData.currentPoints} / {progressData.maxPoints} {ar.points}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.badgeIcon, { backgroundColor: colors.iconBg }]}>
                <Text style={styles.badgeIconText}>★</Text>
              </View>
              <Text style={styles.badgeLevelText}>{progressData.badgeLevel}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.progressBg }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${pointsPercent}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.authInputBg ?? colors.surface,
              borderColor: colors.authInputBorder ?? colors.cardBorder,
              borderWidth: 1,
              ...Platform.select({
                ios: {
                  shadowColor: colors.shadow,
                },
              }),
              opacity: headerFade,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{ar.progress}</Text>
            <View style={[styles.trendBadge, { backgroundColor: colors.iconBg }]}>
              <Text style={[styles.trendArrow, { color: colors.primary }]}>↗</Text>
            </View>
          </View>

          {/* Tab switcher */}
          <View style={[styles.tabRow, { backgroundColor: colors.iconBg ?? colors.statBg }]}>
            {(['fitness', 'training'] as TabName[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabBtn,
                  activeTab === tab && {
                    backgroundColor: colors.authInputBg ?? colors.surface,
                    borderWidth: 1,
                    borderColor: colors.authInputBorder ?? colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: colors.subtleText },
                    activeTab === tab && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {tab === 'fitness' ? ar.fitnessScore : ar.training}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'fitness' ? (
            <View style={styles.fitnessTabContent}>
              <Text style={[styles.fitnessScoreLabel, { color: colors.primary }]}>
                {ar.fitnessScore}
              </Text>
              <AnimatedScore score={computedScore} color={colors.text} />

              <View style={styles.radarWrapper}>
                <HexRadarChart
                  metrics={progressData.metrics}
                  size={260}
                  primaryColor={colors.primary}
                  gridColor={colors.cardBorder}
                  labelColor={colors.subtleText}
                />
              </View>

              {/* Mini breakdown bars */}
              <View style={styles.breakdownRow}>
                {(Object.entries(progressData.metrics) as [MetricKey, number][]).map(([key, val]) => (
                  <View key={key} style={styles.breakdownItem}>
                    <View style={[styles.breakdownBarTrack, { backgroundColor: colors.statBg }]}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          { height: `${(val / 10) * 100}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownItemLabel, { color: colors.subtleText }]}>
                      {getMetricLabel(key).slice(0, 3)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <TrainingTab data={progressData.trainingData} />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  main: { flex: 1 },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: 14,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  joinedText: {
    fontSize: 13,
    fontWeight: '400',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsText: { fontSize: 14, fontWeight: '500' },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  badgeIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  badgeIconText: { color: '#FFD700', fontSize: 14, fontWeight: '800' },
  badgeLevelText: { color: '#FFD700', fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', marginRight: 8 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  trendArrow: { fontSize: 13, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 1.5,
  },
  tabText: { fontSize: 13, fontWeight: '500' },
  fitnessTabContent: { alignItems: 'center' },
  fitnessScoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fitnessScoreNumber: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    height: 48,
    alignItems: 'flex-end',
  },
  breakdownItem: { alignItems: 'center', marginHorizontal: 5 },
  breakdownBarTrack: {
    width: 22,
    height: 36,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  breakdownBarFill: { width: '100%', borderRadius: 4 },
  breakdownItemLabel: { fontSize: 9, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    margin: '1%',
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  pbSection: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  pbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pbDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  pbExercise: { flex: 1, fontSize: 14, fontWeight: '500' },
  pbValue: { fontSize: 14, fontWeight: '700' },
  volumeBar: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeLabel: { fontSize: 13, fontWeight: '500' },
  volumeValue: { fontSize: 20, fontWeight: '800' },
});