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
  SafeAreaView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Supported exercises
const EXERCISES = AIFitnessEngine.getSupportedExercises();

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
  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'front') || devices[0];
  const cameraRef = useRef<Camera>(null);

  // State
  const [selectedExercise, setSelectedExercise] = useState<string>('jumping_jacks');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [feedback, setFeedback] = useState({ message: 'Select an exercise' });
  const [debugInfo, setDebugInfo] = useState<string>('Waiting for pose...');
  const [poseStatus, setPoseStatus] = useState<string>('Loading model...');

  // Refs
  const trainerRef = useRef<ExerciseLogic | null>(null);
  const lastFeedbackRef = useRef<string>('');
  const frameCountRef = useRef(0);
  const isActiveRef = useRef(false);
  const poseDetectedRef = useRef(false);

  // Keep isActiveRef in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // INITIALIZE: Create trainer instance on component mount
  useEffect(() => {
    const initializeTrainer = () => {
      try {
        trainerRef.current = AIFitnessEngine.getTrainer(selectedExercise);
        
        // Verify trainer has analyze method
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
      setPoseStatus('Pose model active');
    }

    // Only process if workout is active
    if (!isActiveRef.current) {
      setDebugInfo(`Frames: ${frameCountRef.current} - Press START`);
      return;
    }

    // SAFETY GUARD: Verify trainer is ready before calling analyze
    if (!trainerRef.current || typeof trainerRef.current.analyze !== 'function') {
      setDebugInfo(`Trainer not ready - Frame: ${frameCountRef.current}`);
      return;
    }
    
    // Process every 2nd frame for performance
    if (frameCountRef.current % 2 !== 0) return;

    try {
      console.log('Pose result:', JSON.stringify(result?.results?.length ?? 0));
      
      if (result?.results && result.results.length > 0 && result.results[0].landmarks?.length > 0) {
        const landmarks = convertLandmarks(result.results[0].landmarks[0]);
        
        console.log('Landmarks count:', landmarks.length);
        console.log('Sample landmark 11 (L shoulder):', JSON.stringify(landmarks[11]));
        console.log('Sample landmark 27 (L ankle):', JSON.stringify(landmarks[27]));
        
        if (areLandmarksValid(landmarks)) {
          const analysisResult = trainerRef.current.analyze(landmarks);
          
          console.log('Analysis result:', JSON.stringify(analysisResult));
          
          setResult(analysisResult);
          const fb = getFeedbackForCode(analysisResult.feedback_code, analysisResult.exercise);
          setFeedback(fb);
          setDebugInfo(`Active - Frame: ${frameCountRef.current}`);

          // Voice feedback on change
          // هنقارن بناءً على الـ Code نفسه مش الـ message عشان نضمن إن الدالة الذكية تشتغل
          if (analysisResult.feedback_code !== lastFeedbackRef.current) {
            lastFeedbackRef.current = analysisResult.feedback_code;
            
            // ✅ التعديل هنا: استخدام speakFeedback بدل speak
            voiceFeedback.speakFeedback(analysisResult.feedback_code, analysisResult.exercise, { gender: 'female' });
          }
        } else {
          setDebugInfo(`Low visibility - show full body (F:${frameCountRef.current})`);
        }
      } else {
        setDebugInfo(`No pose in frame ${frameCountRef.current}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setDebugInfo(`Error: ${String(error)}`);
    }
  }, []);

  // Handle pose detection errors
  const handlePoseError = useCallback((error: DetectionError) => {
    console.error('Pose detection error:', error);
    setPoseStatus(`Error: ${error.message || 'Unknown error'}`);
    setDebugInfo(`Pose Error: ${error.message}`);
  }, []);

  // Initialize MediaPipe Pose Detection
  const poseDetection = usePoseDetection(
    {
      onResults: handlePoseResults,
      onError: handlePoseError,
    },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task', // Model name with .task extension
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
    setFeedback({ message: `Ready for ${selectedExercise.replace('_', ' ')}` });
    lastFeedbackRef.current = '';
    frameCountRef.current = 0;
  }, [selectedExercise]);

  // Request camera permission
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Notify pose detection when camera device changes
  useEffect(() => {
    if (device) {
      poseDetection.cameraDeviceChangeHandler(device);
    }
  }, [device, poseDetection]);

  // Toggle workout
  const toggleWorkout = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      voiceFeedback.stop();
      setFeedback({ message: 'Workout paused' });
    } else {
      setIsActive(true);
      trainerRef.current?.reset?.();
      lastFeedbackRef.current = '';
      frameCountRef.current = 0;
      setFeedback({ message: 'Get in position!' });
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
    setFeedback({ message: `Ready for ${selectedExercise.replace('_', ' ')}` });
  }, [selectedExercise]);

  // Display values
  const reps = (result as any)?.reps ?? 0;
  const timer = (result as any)?.timer ?? 0;
  const isTimerExercise = selectedExercise.includes('plank');
  const stage = (result as any)?.stage ?? '-';
  const isCorrect = (result as any)?.is_correct ?? true;

  // Exercise modal
  const renderExerciseModal = () => (
    <Modal
      visible={showExerciseModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowExerciseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Exercise</Text>
          <FlatList
            data={EXERCISES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.exerciseItem,
                  item === selectedExercise && { backgroundColor: colors.primary + '30' },
                ]}
                onPress={() => {
                  setSelectedExercise(item);
                  setShowExerciseModal(false);
                }}
              >
                <Text style={[styles.exerciseItemText, { color: colors.text }]}>
                  {item.replace('_', ' ').toUpperCase()}
                </Text>
                {item === selectedExercise && (
                  <Ionicons name="checkmark" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowExerciseModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Permission check
  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color={colors.text} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera permission required
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No camera
  if (!device) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Ionicons name="warning-outline" size={64} color={colors.text} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            No camera device found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exerciseSelector}
            onPress={() => setShowExerciseModal(true)}
          >
            <Text style={styles.exerciseName}>
              {selectedExercise.replace('_', ' ').toUpperCase()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>
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
              {isTimerExercise ? 'TIME' : 'REPS'}
            </Text>
          </View>
          <View style={[styles.statBox, !isCorrect && styles.statBoxError]}>
            <Text style={styles.statValue}>{String(stage).toUpperCase()}</Text>
            <Text style={styles.statLabel}>STAGE</Text>
          </View>
        </View>

        {/* Feedback Display */}
        <View style={[
          styles.feedbackContainer,
          !isCorrect && styles.feedbackError
        ]}>
          <Text style={styles.feedbackText}>{feedback.message}</Text>
          {isActive && (
            <Text style={styles.audioHint}>🔊 Voice feedback enabled</Text>
          )}
        </View>

        {/* Start/Stop Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isActive ? styles.stopButton : styles.startButton,
          ]}
          onPress={toggleWorkout}
        >
          <Ionicons
            name={isActive ? 'pause' : 'play'}
            size={40}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {isActive ? 'PAUSE' : 'START'}
          </Text>
        </TouchableOpacity>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            {(result as any)?.debug_class || result?.feedback_code || '-'}
          </Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
          <Text style={[styles.debugText, { color: poseDetectedRef.current ? '#4CAF50' : '#FF9800' }]}>
            {poseStatus}
          </Text>
        </View>

        {/* Status Notice */}
        <View style={[styles.noticeContainer, isActive && styles.noticeActive]}>
          <Text style={styles.noticeText}>
            {isActive 
              ? '🎯 POSE DETECTION ACTIVE - Full body in frame'
              : '📸 Position yourself so camera sees full body'}
          </Text>
        </View>
      </View>

      {renderExerciseModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',  // Camera screen - always dark behind camera feed
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
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  exerciseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
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
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
  exerciseItemText: {
    fontSize: 18,
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
});

export default LiveWorkoutScreen;
