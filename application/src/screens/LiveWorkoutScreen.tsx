/**
 * LiveWorkoutScreen - AI Fitness Engine with Real Pose Detection
 *
 * This screen uses MediaPipe Pose Detection via react-native-mediapipe
 * for real-time exercise tracking and rep counting.
 *
 * Features:
 * 1. Real camera pose detection (MediaPipe)
 * 2. Exercise selection
 * 3. Real-time feedback display
 * 4. Voice feedback
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  Linking,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevices,
  useCameraPermission,
} from 'react-native-vision-camera';
import {
  usePoseDetection,
  Delegate,
  RunningMode,
  type PoseDetectionResultBundle,
  type ViewCoordinator,
  type DetectionError,
} from 'react-native-mediapipe';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  AIFitnessEngine,
  getFeedbackForCode,
  ExerciseLogic,
  ExerciseResult,
  Landmark,
  voiceFeedback,
} from '../services/aiFitnessEngine';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Supported exercises
const EXERCISES = AIFitnessEngine.getSupportedExercises();

type ExerciseDifficulty = 'Beginner' | 'Advanced';

const EXERCISE_DIFFICULTY_MAP: Record<string, ExerciseDifficulty> = {
  // Beginner
  knee_pushup: 'Beginner',
  knee_push_up: 'Beginner',
  bent_knee_dip: 'Beginner',
  standing_overhead_press: 'Beginner',
  front_raises: 'Beginner',
  chair_squat: 'Beginner',
  static_split_squat: 'Beginner',
  glute_bridge: 'Beginner',
  bird_dog: 'Beginner',
  high_plank: 'Beginner',
  crunch: 'Beginner',
  knee_tucks: 'Beginner',
  knee_tap: 'Beginner',
  jumping_jacks: 'Beginner',
  side_lying_leg_raise: 'Beginner',

  // Advanced
  classic_pushup: 'Advanced',
  classic_push_up: 'Advanced',
  straight_leg_dip: 'Advanced',
  pike_pushup: 'Advanced',
  lateral_raises: 'Advanced',
  squat: 'Advanced',
  reverse_lunge: 'Advanced',
  donkey_kick: 'Advanced',
  superman: 'Advanced',
  elbow_plank: 'Advanced',
  v_ups: 'Advanced',
  leg_raises: 'Advanced',
  high_knees: 'Advanced',
  inchworm: 'Advanced',
  toe_touch: 'Advanced',
};

const EXERCISE_INSTRUCTIONS = {
  squat: {
    desc: 'Stand with feet shoulder-width apart. Lower your hips deep down as if sitting in an invisible chair (knees bent < 90°), then drive back up.',
    orientation: 'Vertical',
    position: 'Front View',
  },
  superman: {
    desc: 'Lie face down on the floor with arms extended forward. Simultaneously lift your arms, chest, and legs off the ground. Hold, then lower.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  leg_raises: {
    desc: 'Lie flat on your back, hands under glutes. Keep legs straight and lift them until vertical (90°). Lower slowly without touching the ground.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  high_plank: {
    desc: 'Get into a pushup position on your hands and toes. Keep arms straight and body in a straight line from head to heels. Engage core and hold.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  elbow_plank: {
    desc: 'Similar to High Plank but support your weight on your forearms (elbows). Keep your body straight and core tight.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  crunch: {
    desc: "Lie on your back, knees bent. Hands behind head. Lift your shoulders and upper back off the floor using your abs. Don't pull your neck.",
    orientation: 'Horizontal',
    position: 'Side View',
  },
  jumping_jacks: {
    desc: 'Start standing. Jump feet wide apart while raising arms overhead. Jump feet back together while lowering arms.',
    orientation: 'Vertical',
    position: 'Front View',
  },
  lateral_raises: {
    desc: 'Stand tall. Lift your arms out to the sides until they reach shoulder height (T-shape), then lower slowly.',
    orientation: 'Vertical',
    position: 'Front View',
  },
  front_raises: {
    desc: 'Stand tall. Lift your arms straight out in front of you until shoulder height, then lower slowly.',
    orientation: 'Vertical',
    position: 'Side View',
  },
  standing_overhead_press: {
    desc: 'Stand tall. Raise hands from shoulder level straight up over your head until arms are extended, then lower.',
    orientation: 'Horizontal',
    position: 'Front View',
  },
  high_knees: {
    desc: 'Run in place, driving your knees up towards your chest as high and fast as possible. Pump your arms.',
    orientation: 'Vertical',
    position: 'Front View',
  },
  knee_tap: {
    desc: 'Stand tall. Lift your right knee and tap it with your left hand. Switch immediately. Keep an upright posture.',
    orientation: 'Horizontal',
    position: 'Front View',
  },
  pike_pushup: {
    desc: 'Start in downward dog (inverted V-shape). Lower head towards floor by bending elbows, then push back up.',
    orientation: 'Horizontal',
    position: 'Side View: Phone on your LEFT side',
  },
  static_split_squat: {
    desc: 'Split stance. Lower hips until both knees are bent approx 90°. Keep feet fixed; move up and down.',
    orientation: 'Vertical',
    position: 'Side View',
  },
  chair_squat: {
    desc: 'Stand in front of a chair. Lower hips back until you lightly touch the seat, then push through heels to stand.',
    orientation: 'Vertical',
    position: 'Side View',
  },
  glute_bridge: {
    desc: 'Lie on back, knees bent. Lift hips toward ceiling until body forms a straight line. Squeeze glutes at the top.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  bird_dog: {
    desc: 'Start on hands and knees. Extend right arm forward and left leg backward until straight. Hold, return and switch.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  reverse_lunge: {
    desc: 'Stand tall. Step one foot backward and lower hips until both knees are bent at 90°. Push off back foot to return.',
    orientation: 'Vertical',
    position: 'Side View',
  },
  v_ups: {
    desc: 'Lie flat on your back. Simultaneously lift your straight legs and torso up to touch your toes, forming a V shape.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  bent_knee_dip: {
    desc: 'Hands on a chair behind you. Feet flat on floor, knees bent 90°. Lower hips by bending elbows, then push up.',
    orientation: 'Vertical',
    position: 'Side View',
  },
  knee_pushup: {
    desc: 'Pushup position but with knees on the ground. Lower chest to floor, then push back up.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  classic_pushup: {
    desc: 'High plank on toes. Lower chest to floor until elbows are at 90°, then push back up explosively.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  straight_leg_dip: {
    desc: 'Hands on a chair behind you. Extend legs fully forward. Lower body by bending elbows, then push up.',
    orientation: 'Vertical',
    position: 'Side View: Phone on your RIGHT side',
  },
  toe_touch: {
    desc: 'Stand tall. Kick right leg straight forward and up while reaching to touch toes with left hand. Switch sides.',
    orientation: 'Vertical',
    position: 'Front View',
  },
  inchworm: {
    desc: 'Stand tall. Hinge at hips to touch floor, walk hands out into high plank, hold briefly, walk hands back and stand up.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  side_lying_leg_raise: {
    desc: 'Lie on side with legs straight. Lift top leg towards ceiling. Lower slowly without touching bottom leg.',
    orientation: 'Horizontal',
    position: 'Side View, Head towards camera',
  },
  knee_tucks: {
    desc: 'Sit on floor, lean back slightly with hands for support. Pull both knees into chest, then extend legs out.',
    orientation: 'Horizontal',
    position: 'Side View',
  },
  donkey_kick: {
    desc: 'Start on all fours. Kick one leg backwards and upwards towards ceiling (knee bent 90°). Squeeze glutes.',
    orientation: 'Horizontal',
    position: 'Side View: Active leg facing the camera',
  },
};

const getExerciseDifficulty = (exercise: string): ExerciseDifficulty => {
  const normalized = exercise.toLowerCase().trim().replace(/\s+/g, '_');

  if (EXERCISE_DIFFICULTY_MAP[exercise]) {
    return EXERCISE_DIFFICULTY_MAP[exercise];
  }

  if (EXERCISE_DIFFICULTY_MAP[normalized]) {
    return EXERCISE_DIFFICULTY_MAP[normalized];
  }

  const compactPushupKey = normalized
    .replace('classic_push_up', 'classic_pushup')
    .replace('knee_push_up', 'knee_pushup');

  if (EXERCISE_DIFFICULTY_MAP[compactPushupKey]) {
    return EXERCISE_DIFFICULTY_MAP[compactPushupKey];
  }

  // Default fallback: always return one of the two only
  return 'Advanced';
};

const ORDERED_EXERCISES = [
  ...EXERCISES.filter((item) => getExerciseDifficulty(item) === 'Beginner'),
  ...EXERCISES.filter((item) => getExerciseDifficulty(item) === 'Advanced'),
];

/**
 * Convert MediaPipe landmarks to our Landmark format
 */
const convertLandmarks = (mediapipeLandmarks: any[]): Landmark[] => {
  return mediapipeLandmarks.map((lm) => ({
    x: lm.x ?? 0.5,
    y: lm.y ?? 0.5,
    z: lm.z ?? 0,
    visibility: lm.visibility ?? 0.9,
  }));
};

/**
 * Check if key landmarks are visible
 */
const areLandmarksValid = (landmarks: Landmark[]): boolean => {
  const keyIndices = [11, 12, 23, 24, 25, 26, 27, 28];
  return keyIndices.every((idx) => {
    const lm = landmarks[idx];
    return lm && (lm.visibility ?? 0) >= 0.5;
  });
};

const LiveWorkoutScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'front') || devices[0];
  const cameraRef = useRef<Camera>(null);

  // State
  const [selectedExercise, setSelectedExercise] = useState<string>('jumping_jacks');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [feedback, setFeedback] = useState({ message: t('selectAnExercise') });
  const [debugInfo, setDebugInfo] = useState<string>(t('waitingForPose'));
  const [poseStatus, setPoseStatus] = useState<string>(t('loadingModel'));

  // Refs
  const trainerRef = useRef<ExerciseLogic | null>(null);
  const lastFeedbackRef = useRef<string>('');
  const frameCountRef = useRef(0);
  const isActiveRef = useRef(false);
  const poseDetectedRef = useRef(false);
  const lastPoseErrorToastRef = useRef(0);
  const noCameraToastShownRef = useRef(false);

  // Keep isActiveRef in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    setShowTooltip(true);

    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [selectedExercise]);

  // INITIALIZE: Create trainer instance on component mount
  useEffect(() => {
    const initializeTrainer = () => {
      try {
        trainerRef.current = AIFitnessEngine.getTrainer(selectedExercise);

        if (trainerRef.current && typeof trainerRef.current.analyze === 'function') {
          trainerRef.current.reset?.();
          console.log(`✅ Trainer initialized for: ${selectedExercise}`);
        } else {
          console.warn(`⚠️ Trainer initialization failed or analyze method missing`);
          trainerRef.current = null;
        }
      } catch (error) {
        console.error('❌ Error initializing trainer:', error);
        trainerRef.current = null;
      }
    };

    initializeTrainer();
  }, [selectedExercise]);

  // Handle pose detection results
  const handlePoseResults = useCallback((result: PoseDetectionResultBundle, vc: ViewCoordinator) => {
    frameCountRef.current++;

    // Always update to show we're receiving frames
    if (!poseDetectedRef.current) {
      poseDetectedRef.current = true;
      setPoseStatus(t('poseModelActive'));
    }

    // Only process if workout is active
    if (!isActiveRef.current) {
      setDebugInfo(t('framesPressStart').replace('{count}', String(frameCountRef.current)));
      return;
    }

    // SAFETY GUARD: Verify trainer is ready before calling analyze
    if (!trainerRef.current || typeof trainerRef.current.analyze !== 'function') {
      setDebugInfo(t('trainerNotReady').replace('{count}', String(frameCountRef.current)));
      return;
    }

    // Process every 2nd frame for performance
    if (frameCountRef.current % 2 !== 0) return;

    try {
      console.log('Pose result:', JSON.stringify(result?.results?.length ?? 0));

      if (
        result?.results &&
        result.results.length > 0 &&
        result.results[0].landmarks?.length > 0
      ) {
        const landmarks = convertLandmarks(result.results[0].landmarks[0]);

        console.log('Landmarks count:', landmarks.length);
        console.log('Sample landmark 11 (L shoulder):', JSON.stringify(landmarks[11]));
        console.log('Sample landmark 27 (L ankle):', JSON.stringify(landmarks[27]));

        if (areLandmarksValid(landmarks)) {
          const analysisResult = trainerRef.current.analyze(landmarks);

          console.log('Analysis result:', JSON.stringify(analysisResult));

          setResult(analysisResult);
          const fb = getFeedbackForCode(
            analysisResult.feedback_code,
            analysisResult.exercise
          );
          setFeedback(fb);
          setDebugInfo(t('activeFrame').replace('{count}', String(frameCountRef.current)));

          // Voice feedback on change
          if (analysisResult.feedback_code !== lastFeedbackRef.current) {
            lastFeedbackRef.current = analysisResult.feedback_code;

            voiceFeedback.speakFeedback(
              analysisResult.feedback_code,
              analysisResult.exercise,
              { gender: 'female' }
            );
          }
        } else {
          setDebugInfo(t('lowVisibilityShowFullBody').replace('{count}', String(frameCountRef.current)));
        }
      } else {
        setDebugInfo(t('noPoseInFrame').replace('{count}', String(frameCountRef.current)));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setDebugInfo(t('error').replace('{message}', String(error)));
    }
  }, []);

  // Handle pose detection errors
  const handlePoseError = useCallback((error: DetectionError) => {
    console.error('Pose detection error:', error);

    const message = error.message || 'Unknown pose detection error';
    setPoseStatus(`Error: ${message}`);
    setDebugInfo(`Pose Error: ${message}`);

    // Preserve existing structure without showing toast messages
    const now = Date.now();
    if (now - lastPoseErrorToastRef.current > 4000) {
      lastPoseErrorToastRef.current = now;
    }
  }, []);

  // Initialize MediaPipe Pose Detection
  const poseDetection = usePoseDetection(
    {
      onResults: handlePoseResults,
      onError: handlePoseError,
    },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    {
      delegate: Delegate.GPU,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }
  );

  // Initialize voice feedback
  useEffect(() => {
    voiceFeedback.initialize();
    return () => {
      voiceFeedback.stop();
    };
  }, []);

  // Initialize trainer when exercise changes
  useEffect(() => {
    trainerRef.current = AIFitnessEngine.getTrainer(selectedExercise);
    trainerRef.current?.reset?.();
    setResult(null);
    setFeedback({ message: t('readyFor').replace('{exercise}', selectedExercise.replace('_', ' ')) });
    lastFeedbackRef.current = '';
    frameCountRef.current = 0;
    poseDetectedRef.current = false;
    setPoseStatus(t('loadingModel'));
  }, [selectedExercise]);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch((error) => {
        console.error('Camera permission request failed:', error);
      });
    }
  }, [hasPermission, requestPermission]);

  // Notify pose detection when camera device changes
  useEffect(() => {
    if (device) {
      poseDetection.cameraDeviceChangeHandler(device);
      noCameraToastShownRef.current = false;
    } else if (!noCameraToastShownRef.current) {
      noCameraToastShownRef.current = true;
    }
  }, [device, poseDetection]);

  // Ask permission manually from button
  const handleRequestPermission = useCallback(async () => {
    try {
      const granted = await requestPermission();

      if (!granted) {
        Linking.openSettings();
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  }, [requestPermission]);

  const handleShowInstructions = useCallback(() => {
    setShowInstructionsModal(true);
    setShowTooltip(false);
  }, []);

  // Toggle workout
  const toggleWorkout = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      voiceFeedback.stop();
      setFeedback({ message: t('workoutPaused') });
    } else {
      setIsActive(true);
      trainerRef.current?.reset?.();
      lastFeedbackRef.current = '';
      frameCountRef.current = 0;
      setFeedback({ message: t('getInPosition') });
    }
  }, [isActive]);

  // Reset workout
  const resetWorkout = useCallback(() => {
    setIsActive(false);
    voiceFeedback.stop();
    trainerRef.current?.reset?.();
    lastFeedbackRef.current = '';
    frameCountRef.current = 0;
    setResult(null);
    setFeedback({ message: t('readyFor').replace('{exercise}', selectedExercise.replace('_', ' ')) });
  }, [selectedExercise]);

  // Display values
  const reps = (result as any)?.reps ?? 0;
  const timer = (result as any)?.timer ?? 0;
  const isTimerExercise = selectedExercise.includes('plank');
  const stage = (result as any)?.stage ?? '-';
  const isCorrect = (result as any)?.is_correct ?? true;

  const filteredExercises = ORDERED_EXERCISES.filter((item) =>
    item.replace(/_/g, ' ').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const renderInstructionsModal = () => {
    const instructions =
      EXERCISE_INSTRUCTIONS[selectedExercise as keyof typeof EXERCISE_INSTRUCTIONS];

    const exerciseName = selectedExercise.replace(/_/g, ' ').toUpperCase();

    const description =
      instructions?.desc ||
      'No instructions available for this exercise yet.';
    const orientation =
      instructions?.orientation ||
      'Please place the phone clearly so your full body is visible.';
    const position =
      instructions?.position ||
      'Stand or position yourself so the camera can detect your movement clearly.';

    return (
      <Modal
        visible={showInstructionsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowInstructionsModal(false)}
      >
        <View style={styles.instructionsOverlay}>
          <View
            style={[
              styles.instructionsCard,
              { backgroundColor: colors.card, borderColor: colors.primary + '33' },
            ]}
          >
            <View style={styles.instructionsHeader}>
              <View
                style={[
                  styles.instructionsIconWrap,
                  { backgroundColor: colors.primary + '18' },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={26}
                  color={colors.primary}
                />
              </View>

              <View style={styles.instructionsHeaderTextWrap}>
                <Text style={[styles.instructionsTitle, { color: colors.text }]}>
                  {t('howToPlay')}
                </Text>
                <Text
                  style={[styles.instructionsExerciseName, { color: colors.primary }]}
                  numberOfLines={2}
                >
                  {exerciseName}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.instructionsCloseIcon}
                onPress={() => setShowInstructionsModal(false)}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.instructionsScrollContent}
            >
              <View
                style={[
                  styles.instructionsSection,
                  { backgroundColor: colors.background, borderColor: colors.primary + '1A' },
                ]}
              >
                <View style={styles.instructionsSectionHeader}>
                  <Ionicons name="warning" size={18} color={colors.primary} />
                  <Text style={[styles.instructionsSectionTitle, { color: colors.text }]}>
                    {t('instructions')}
                  </Text>
                </View>
                <Text style={[styles.instructionsBodyText, { color: colors.text }]}>
                  {description}
                </Text>
              </View>

              <View style={styles.instructionsInfoRow}>
                <View
                  style={[
                    styles.instructionsMiniCard,
                    { backgroundColor: colors.background, borderColor: colors.primary + '1A' },
                  ]}
                >
                  <View
                    style={[
                      styles.instructionsMiniIcon,
                      { backgroundColor: colors.primary + '18' },
                    ]}
                  >
                    <Ionicons name="phone-portrait" size={18} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.instructionsMiniLabel, { color: colors.text }]}
                  >
                    {t('phoneOrientation')}
                  </Text>
                  <Text
                    style={[styles.instructionsMiniValue, { color: colors.primary }]}
                  >
                    {orientation}
                  </Text>
                </View>

                <View
                  style={[
                    styles.instructionsMiniCard,
                    { backgroundColor: colors.background, borderColor: colors.primary + '1A' },
                  ]}
                >
                  <View
                    style={[
                      styles.instructionsMiniIcon,
                      { backgroundColor: colors.primary + '18' },
                    ]}
                  >
                    <Ionicons name="body" size={18} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.instructionsMiniLabel, { color: colors.text }]}
                  >
                    {t('bodyPosition')}
                  </Text>
                  <Text
                    style={[styles.instructionsMiniValue, { color: colors.primary }]}
                  >
                    {position}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.instructionsPrimaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowInstructionsModal(false)}
            >
              <Text style={styles.instructionsPrimaryButtonText}>{t('gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Exercise modal
  const renderExerciseModal = () => (
    <Modal
      visible={showExerciseModal}
      animationType="slide"
      transparent
      onRequestClose={() => {
        setShowExerciseModal(false);
        setSearchQuery('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t('selectExercise')}
          </Text>

          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border || 'rgba(255,255,255,0.12)',
              },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.text}
              style={styles.searchIcon}
            />

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('searchExercise')}
              placeholderTextColor="#999"
              style={[styles.searchInput, { color: colors.text }]}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptySearchContainer}>
                <Text style={[styles.emptySearchText, { color: colors.text }]}>
                  {t('noExercisesFound')}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const difficulty = getExerciseDifficulty(item);

              const badgeStyle =
                difficulty === 'Beginner'
                  ? styles.beginnerBadge
                  : styles.advancedBadge;

              const badgeTextStyle =
                difficulty === 'Beginner'
                  ? styles.beginnerBadgeText
                  : styles.advancedBadgeText;

              return (
                <TouchableOpacity
                  style={[
                    styles.exerciseItem,
                    item === selectedExercise && {
                      backgroundColor: colors.primary + '30',
                    },
                  ]}
                  onPress={() => {
                    setSelectedExercise(item);
                    setShowExerciseModal(false);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.exerciseItemContent}>
                    <Text style={[styles.exerciseItemText, { color: colors.text }]}>
                      {item.replace(/_/g, ' ').toUpperCase()}
                    </Text>

                    <View style={[styles.badgeContainer, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeTextStyle]}>
                        {difficulty}
                      </Text>
                    </View>
                  </View>

                  {item === selectedExercise && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setShowExerciseModal(false);
              setSearchQuery('');
            }}
          >
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Permission check
  if (!hasPermission) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) },
        ]}
      >
        <LinearGradient
          colors={colors.authBgGradient || ['#000', '#000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color={colors.text} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            {t('cameraPermissionRequired')}
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { overflow: 'hidden' }]}
            onPress={handleRequestPermission}
          >
            <LinearGradient
              colors={[colors.primary, (colors as any).secondary || colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={[styles.permissionButtonText, { position: 'relative' }]}>
              {t('grantPermission')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No camera
  if (!device) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) },
        ]}
      >
        <LinearGradient
          colors={colors.authBgGradient || ['#000', '#000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centerContent}>
          <Ionicons name="warning-outline" size={64} color={colors.text} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            {t('noCameraDeviceFound')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera with Pose Detection */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        pixelFormat="rgb"
        frameProcessor={poseDetection.frameProcessor}
        onLayout={poseDetection.cameraViewLayoutChangeHandler}
      />

      {/* Overlay UI */}
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenterGroup}>
            <TouchableOpacity
              style={styles.exerciseSelector}
              onPress={() => setShowExerciseModal(true)}
            >
              <Text style={styles.exerciseName} numberOfLines={1}>
                {selectedExercise.replace('_', ' ').toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.howToPlayWrapper}>
              <TouchableOpacity
                style={styles.howToPlayButton}
                onPress={handleShowInstructions}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showTooltip && (
                <View
                  style={[
                    styles.tooltipBubble,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.tooltipText}>{t('howToPlay')}</Text>
                  <View
                    style={[
                      styles.tooltipArrow,
                      { borderBottomColor: colors.primary },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetWorkout}>
            <Ionicons name="refresh" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {isTimerExercise ? `${timer}s` : reps}
            </Text>
            <Text style={styles.statLabel}>
              {isTimerExercise ? t('time') : t('reps').toUpperCase()}
            </Text>
          </View>

          <View style={[styles.statBox, !isCorrect && styles.statBoxError]}>
            <Text style={styles.statValue}>{String(stage).toUpperCase()}</Text>
            <Text style={styles.statLabel}>{t('stage').toUpperCase()}</Text>
          </View>
        </View>

        {/* Feedback Display */}
        <View
          style={[
            styles.feedbackContainer,
            !isCorrect && styles.feedbackError,
          ]}
        >
          <Text style={styles.feedbackText}>{feedback.message}</Text>
          {isActive && (
            <Text style={styles.audioHint}>{t('voiceFeedbackEnabled')}</Text>
          )}
        </View>

        {/* Start/Stop Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              overflow: 'hidden',
              borderWidth: 0,
              backgroundColor: isActive ? '#f44336' : 'transparent',
            },
          ]}
          onPress={toggleWorkout}
        >
          {!isActive && colors.authBgGradient && (
            <LinearGradient
              colors={[
                colors.primary,
                (colors as any).secondary || colors.primary,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <Ionicons
            name={isActive ? 'pause' : 'play'}
            size={40}
            color="#fff"
            style={{ position: 'relative' }}
          />
          <Text style={[styles.actionButtonText, { position: 'relative' }]}>
            {isActive ? t('pause') : t('start')}
          </Text>
        </TouchableOpacity>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            {(result as any)?.debug_class || result?.feedback_code || '-'}
          </Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
          <Text
            style={[
              styles.debugText,
              { color: poseDetectedRef.current ? '#4CAF50' : '#FF9800' },
            ]}
          >
            {poseStatus}
          </Text>
        </View>

        {/* Status Notice */}
        <View
          style={[
            styles.noticeContainer,
            isActive && styles.noticeActive,
          ]}
        >
          <Text style={styles.noticeText}>
            {isActive
              ? t('poseDetectionActiveFullBody')
              : t('positionYourselfCamera')}
          </Text>
        </View>
      </View>

      {renderExerciseModal()}
      {renderInstructionsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Camera screen - always dark behind camera feed
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerCenterGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 0,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  exerciseSelector: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
    flex: 1,
  },
  howToPlayWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBubble: {
    position: 'absolute',
    top: 44,
    right: -6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  resetButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  statBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 120,
  },
  statBoxError: {
    backgroundColor: 'rgba(255,50,50,0.7)',
  },
  statValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 5,
  },
  feedbackContainer: {
    backgroundColor: 'rgba(0,150,0,0.8)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  feedbackError: {
    backgroundColor: 'rgba(200,50,50,0.8)',
  },
  feedbackText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  audioHint: {
    color: '#ddd',
    fontSize: 12,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 30,
    gap: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  debugContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  debugText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  noticeContainer: {
    backgroundColor: 'rgba(255,165,0,0.8)',
    padding: 10,
    borderRadius: 10,
  },
  noticeActive: {
    backgroundColor: 'rgba(0,150,0,0.8)',
  },
  noticeText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  emptySearchContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    opacity: 0.8,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  exerciseItemContent: {
    flex: 1,
    marginRight: 12,
  },
  exerciseItemText: {
    fontSize: 18,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  beginnerBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  beginnerBadgeText: {
    color: '#2E7D32',
  },
  advancedBadge: {
    backgroundColor: 'rgba(255, 87, 34, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.35)',
  },
  advancedBadgeText: {
    color: '#D84315',
  },
  closeButton: {
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  instructionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  instructionsCard: {
    borderRadius: 24,
    padding: 20,
    maxHeight: '78%',
    borderWidth: 1,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  instructionsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionsHeaderTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  instructionsExerciseName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  instructionsCloseIcon: {
    padding: 4,
    marginLeft: 8,
  },
  instructionsScrollContent: {
    paddingBottom: 8,
  },
  instructionsSection: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  instructionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  instructionsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  instructionsBodyText: {
    fontSize: 15,
    lineHeight: 23,
  },
  instructionsInfoRow: {
    gap: 12,
  },
  instructionsMiniCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  instructionsMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  instructionsMiniLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
    marginBottom: 6,
  },
  instructionsMiniValue: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  instructionsPrimaryButton: {
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default LiveWorkoutScreen;