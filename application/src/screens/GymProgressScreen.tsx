// Place this file at: src/screens/GymProgressScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  SafeAreaView,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
type MetricKey = 'strength' | 'endurance' | 'consistency' | 'volume' | 'progress' | 'habits';

type Metrics = Record<MetricKey, number>;

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
  fitnessScore: number;
  metrics: Metrics;
  trainingData: TrainingData;
}

// ─────────────────────────────────────────────
//  DUMMY USER DATA — Replace with your API call
// ─────────────────────────────────────────────
const userData: UserData = {
  name: 'Monk',
  joinedDate: 'Dec 24',
  avatarUrl: null,
  currentPoints: 600,
  maxPoints: 1000,
  badgeLevel: 1,
  fitnessScore: 5000,
  metrics: {
    strength: 10.0,
    endurance: 10.0,
    consistency: 10.0,
    volume: 10.0,
    progress: 10.0,
    habits: 10.0,
  },
  trainingData: {
    totalWorkouts: 48,
    weeklyAvg: 4.2,
    currentStreak: 12,
    longestStreak: 21,
    totalVolume: 84500,
    personalBests: [
      { exercise: 'Bench Press', value: '120 kg' },
      { exercise: 'Squat', value: '150 kg' },
      { exercise: 'Deadlift', value: '180 kg' },
    ],
  },
};

// ─────────────────────────────────────────────
//  CALCULATIONS
// ─────────────────────────────────────────────
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
    strength: 'Strength',
    endurance: 'Endurance',
    consistency: 'Consistency',
    volume: 'Volume',
    progress: 'Progress',
    habits: 'Habits',
  };
  return labels[key];
};

// ─────────────────────────────────────────────
//  HEXAGONAL RADAR CHART  (spider-web + animation)
// ─────────────────────────────────────────────
interface HexRadarChartProps {
  metrics: Metrics;
  size?: number;
}

type TextAnchor = 'start' | 'middle' | 'end';

const metricKeys: MetricKey[] = [
  'strength', 'endurance', 'consistency', 'volume', 'progress', 'habits',
];

const HexRadarChart: React.FC<HexRadarChartProps> = ({ metrics, size = 220 }) => {
  // Animation: 0 → 1 drives the data polygon from center outward
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
  }, []);

  const padding = 60;
  const canvasSize = size + padding * 2;
  const center = canvasSize / 2;
  const maxRadius = size * 0.38;
  const numAxes = metricKeys.length;

  const getPoint = (index: number, radius: number): { x: number; y: number } => {
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

  // Spider-web background rings: 5 concentric hex rings
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Animated data polygon — each point lerps from center (0) to its real value (1)
  const animatedDataPoints = buildPolygonPoints(
    (key) => (metrics[key] / 10) * maxRadius * animValue
  );

  // Dot positions also driven by animation
  const animatedDotPositions = metricKeys.map((key, i) => {
    const r = (metrics[key] / 10) * maxRadius * animValue;
    return { key, i, ...getPoint(i, r) };
  });

  const labelOffset = maxRadius + 28;
  const labelPositions = metricKeys.map((key, i) => {
    const pt = getPoint(i, labelOffset);
    return { key, ...pt };
  });

  return (
    <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
      <Defs>
        <RadialGradient id="hexFill" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#7dc832" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#2d5a0a" stopOpacity="0.30" />
        </RadialGradient>
      </Defs>

      {/* ── Spider-web grid rings (hexagonal) ── */}
      {gridLevels.map((level, li) => (
        <Polygon
          key={`ring-${li}`}
          points={buildPolygonPoints(() => level * maxRadius)}
          fill="none"
          stroke="#3a5a1a"
          strokeWidth={li === gridLevels.length - 1 ? 1.5 : 0.8}
          opacity={li === gridLevels.length - 1 ? 0.9 : 0.45}
        />
      ))}

      {/* ── Spoke lines from center to each vertex (spider legs) ── */}
      {metricKeys.map((_, i) => {
        const outer = getPoint(i, maxRadius);
        return (
          <Line
            key={`spoke-${i}`}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke="#3a5a1a"
            strokeWidth="0.8"
            opacity="0.6"
          />
        );
      })}

      {/* ── Animated data fill polygon ── */}
      <Polygon
        points={animatedDataPoints}
        fill="url(#hexFill)"
        stroke="#7dc832"
        strokeWidth="2"
        opacity="0.95"
      />

      {/* ── Animated dots at each data point ── */}
      {animatedDotPositions.map(({ key, x, y }) => (
        <React.Fragment key={`dot-${key}`}>
          {/* Outer glow ring */}
          <Circle
            cx={x}
            cy={y}
            r="6"
            fill="#a3e635"
            opacity={0.25 * animValue}
          />
          {/* Main dot */}
          <Circle
            cx={x}
            cy={y}
            r="4"
            fill="#a3e635"
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity={animValue}
          />
        </React.Fragment>
      ))}

      {/* ── Labels (always fully visible, not animated) ── */}
      {labelPositions.map(({ key, x, y }) => {
        let anchor: TextAnchor = 'middle';
        if (x < center - 10) anchor = 'end';
        if (x > center + 10) anchor = 'start';
        const val = metrics[key].toFixed(1);
        return (
          <React.Fragment key={`label-${key}`}>
            <SvgText
              x={x}
              y={y - 5}
              fontSize="9"
              fill="#cccccc"
              textAnchor={anchor}
              fontWeight="500"
            >
              {getMetricLabel(key)}
            </SvgText>
            <SvgText
              x={x}
              y={y + 7}
              fontSize="9"
              fill="#7dc832"
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
//  ANIMATED SCORE NUMBER
// ─────────────────────────────────────────────
interface AnimatedScoreProps {
  score: number;
}

const AnimatedScore: React.FC<AnimatedScoreProps> = ({ score }) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1800,
      useNativeDriver: false,
    }).start();
    const listenerId = animVal.addListener(({ value }) =>
      setDisplayScore(Math.round(value))
    );
    return () => animVal.removeListener(listenerId);
  }, [score]);

  return (
    <Text style={styles.fitnessScoreNumber}>
      {displayScore.toLocaleString()}
    </Text>
  );
};

// ─────────────────────────────────────────────
//  TRAINING TAB CONTENT
// ─────────────────────────────────────────────
interface TrainingTabProps {
  data: TrainingData;
}

const TrainingTab: React.FC<TrainingTabProps> = ({ data }) => {
  const stats: Array<{ label: string; value: string | number }> = [
    { label: 'Total Workouts', value: data.totalWorkouts },
    { label: 'Weekly Avg', value: data.weeklyAvg.toFixed(1) },
    { label: 'Current Streak', value: `${data.currentStreak}d` },
    { label: 'Best Streak', value: `${data.longestStreak}d` },
  ];

  return (
    <View style={styles.trainingContainer}>
      <View style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.pbSection}>
        <Text style={styles.pbTitle}>Personal Bests</Text>
        {data.personalBests.map((pb: PersonalBest, i: number) => (
          <View key={i} style={styles.pbRow}>
            <View style={styles.pbDot} />
            <Text style={styles.pbExercise}>{pb.exercise}</Text>
            <Text style={styles.pbValue}>{pb.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.volumeBar}>
        <Text style={styles.volumeLabel}>Total Volume Lifted</Text>
        <Text style={styles.volumeValue}>
          {(data.totalVolume / 1000).toFixed(1)}k kg
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────
type TabName = 'fitness' | 'training';

export default function GymProgressScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('fitness');
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  const computedScore = calculateFitnessScore(userData.metrics);
  const pointsPercent = calculatePointsPercentage(
    userData.currentPoints,
    userData.maxPoints
  );

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const switchTab = (tab: TabName): void => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO HEADER ── */}
        <Animated.View style={[styles.heroSection, { opacity: headerFade }]}>
          <View style={styles.heroGlowContainer}>
            <View style={styles.heroGlow} />
          </View>

          <View style={styles.profileRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                {userData.avatarUrl ? (
                  <Image
                    source={{ uri: userData.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {userData.name[0]}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.name}</Text>
              <View style={styles.joinedRow}>
                <View style={styles.calendarIcon}>
                  <Text style={styles.calendarDot}>|</Text>
                </View>
                <Text style={styles.joinedText}>
                  Joined {userData.joinedDate}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── POINTS BAR ── */}
        <Animated.View
          style={[
            styles.pointsCard,
            {
              opacity: headerFade,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <View style={styles.pointsRow}>
            <Text style={styles.pointsText}>
              {userData.currentPoints} / {userData.maxPoints} points
            </Text>
            <View style={styles.badgeContainer}>
              <View style={styles.badgeIcon}>
                <Text style={styles.badgeIconText}>*</Text>
              </View>
              <Text style={styles.badgeLevel}>{userData.badgeLevel}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFillAnimated,
                { width: `${pointsPercent}%` },
              ]}
            />
          </View>
        </Animated.View>

        {/* ── PROGRESS CARD ── */}
        <Animated.View
          style={[
            styles.progressCard,
            {
              opacity: headerFade,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Progress</Text>
            <View style={styles.trendIcon}>
              <Text style={styles.trendArrow}>↗</Text>
            </View>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => switchTab('fitness')}
              style={[
                styles.tabBtn,
                activeTab === 'fitness' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'fitness' && styles.tabTextActive,
                ]}
              >
                Fitness Score
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchTab('training')}
              style={[
                styles.tabBtn,
                activeTab === 'training' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'training' && styles.tabTextActive,
                ]}
              >
                Training
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'fitness' ? (
            <View style={styles.fitnessTabContent}>
              <Text style={styles.fitnessScoreLabel}>Fitness Score</Text>
              <AnimatedScore score={computedScore} />

              <View style={styles.radarWrapper}>
                <HexRadarChart metrics={userData.metrics} size={260} />
              </View>

              <View style={styles.breakdownRow}>
                {(Object.entries(userData.metrics) as [MetricKey, number][]).map(
                  ([key, val]) => (
                    <View key={key} style={styles.breakdownItem}>
                      <View style={styles.breakdownBarTrack}>
                        <View
                          style={[
                            styles.breakdownBarFill,
                            { height: `${(val / 10) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownItemLabel}>
                        {getMetricLabel(key).slice(0, 3)}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          ) : (
            <TrainingTab data={userData.trainingData} />
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heroGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3a6b0a',
    opacity: 0.08,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#7dc832',
    fontSize: 26,
    fontWeight: '700',
  },
  addBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#141414',
    borderWidth: 1.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    opacity: 0.5,
    marginRight: 5,
  },
  calendarDot: {
    color: '#888',
    fontSize: 12,
  },
  joinedText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '400',
  },

  // Points Card
  pointsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 26,
    height: 26,
    backgroundColor: '#8B6914',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  badgeIconText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
  },
  badgeLevel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFillAnimated: {
    height: '100%',
    backgroundColor: '#7dc832',
    borderRadius: 4,
    opacity: 0.9,
  },

  // Progress Card
  progressCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  trendIcon: {
    backgroundColor: '#1a2a0a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendArrow: {
    color: '#7dc832',
    fontSize: 13,
    fontWeight: '700',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
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
  tabBtnActive: {
    backgroundColor: '#1e3a08',
    borderWidth: 1,
    borderColor: '#3a6b12',
  },
  tabText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#a3e635',
    fontWeight: '700',
  },

  // Fitness Tab
  fitnessTabContent: {
    alignItems: 'center',
  },
  fitnessScoreLabel: {
    color: '#7dc832',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fitnessScoreNumber: {
    color: '#ffffff',
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

  // Breakdown bars
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    height: 48,
    alignItems: 'flex-end',
  },
  breakdownItem: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  breakdownBarTrack: {
    width: 22,
    height: 36,
    backgroundColor: '#1e1e1e',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  breakdownBarFill: {
    width: '100%',
    backgroundColor: '#4a8a14',
    borderRadius: 4,
  },
  breakdownItemLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: '500',
  },

  // Training Tab
  trainingContainer: {},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#252525',
    alignItems: 'center',
    margin: '1%',
  },
  statValue: {
    color: '#a3e635',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 3,
  },
  statLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  pbSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#252525',
    marginBottom: 16,
  },
  pbTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7dc832',
    marginRight: 10,
  },
  pbExercise: {
    flex: 1,
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  pbValue: {
    color: '#a3e635',
    fontSize: 14,
    fontWeight: '700',
  },
  volumeBar: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#252525',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  volumeValue: {
    color: '#a3e635',
    fontSize: 20,
    fontWeight: '800',
  },
});