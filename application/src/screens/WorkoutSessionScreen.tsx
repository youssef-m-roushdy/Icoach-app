import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import {
  workoutSessionService,
  type CreateWorkoutSessionData,
} from "../services/workoutSessionService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Set {
  id: string;
  reps: string;
  weight: string;
}

export default function WorkoutSessionScreen({ route, navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();
  const { workoutId, workoutName, workoutImage } = route.params;
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Form state
  const [duration, setDuration] = useState("");
  const [sets, setSets] = useState<Set[]>([{ id: "1", reps: "", weight: "" }]);
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fade in animation when screen appears
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const addSet = () => {
    setSets([...sets, { id: Date.now().toString(), reps: "", weight: "" }]);
  };

  const removeSet = (id: string) => {
    if (sets.length > 1) {
      setSets(sets.filter((set) => set.id !== id));
    } else {
      Alert.alert("Cannot Remove", "You need at least one set");
    }
  };

  const updateSet = (id: string, field: "reps" | "weight", value: string) => {
    setSets(
      sets.map((set) => (set.id === id ? { ...set, [field]: value } : set)),
    );
  };

  const calculateVolume = (): number => {
    return sets.reduce((total, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      return total + weight * reps;
    }, 0);
  };

  const validateForm = (): boolean => {
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid duration in minutes",
      );
      return false;
    }

    const validSets = sets.filter((s) => s.reps && s.weight);
    if (validSets.length === 0) {
      Alert.alert("Validation Error", "Please add at least one complete set");
      return false;
    }

    for (const set of validSets) {
      const repsNum = parseInt(set.reps);
      const weightNum = parseFloat(set.weight);

      if (isNaN(repsNum) || repsNum <= 0) {
        Alert.alert("Validation Error", "Reps must be a positive number");
        return false;
      }

      if (isNaN(weightNum) || weightNum < 0) {
        Alert.alert("Validation Error", "Weight cannot be negative");
        return false;
      }
    }

    return true;
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
    }
  };

  const getCombinedDateTime = (): Date => {
    const date = new Date(selectedDate);
    date.setHours(selectedTime.getHours());
    date.setMinutes(selectedTime.getMinutes());
    return date;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!token) {
      Alert.alert(
        "Authentication Error",
        "You need to be logged in to save workout sessions",
      );
      return;
    }

    setLoading(true);
    try {
      const validSets = sets.filter((s) => s.reps && s.weight);
      const firstSet = validSets[0];
      const totalVolume = calculateVolume();
      const completedAt = getCombinedDateTime();

      const sessionData: CreateWorkoutSessionData = {
        workoutId,
        duration: parseInt(duration),
        sets: validSets.length,
        reps: parseInt(firstSet.reps),
        weight: parseFloat(firstSet.weight),
        volume: totalVolume,
        notes: notes.trim() || undefined,
        completedAt: completedAt.toISOString(),
      };

      console.log("Creating workout session:", sessionData);

      const response = await workoutSessionService.createWorkoutSession(
        sessionData,
        token,
      );

      if (response.success) {
        Alert.alert(
          "Success! 🎉",
          "Workout session saved successfully. Your progress has been updated!",
          [
            {
              text: "View Progress",
              onPress: () => {
                navigation.navigate("GymProgress");
              },
            },
            {
              text: "Done",
              style: "cancel",
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (error: any) {
      console.error("Failed to save workout session:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save workout session. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalVolume = calculateVolume();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <LinearGradient
        colors={(colors as any).authBgGradient || colors.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View
          style={[
            styles.decorativeCircle1,
            {
              backgroundColor:
                (colors as any).authCircle1 || "rgba(255,255,255,0.05)",
            },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle2,
            {
              backgroundColor:
                (colors as any).authCircle2 || "rgba(255,255,255,0.05)",
            },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle3,
            {
              backgroundColor:
                (colors as any).authCircle3 || "rgba(255,255,255,0.05)",
            },
          ]}
        />
      </LinearGradient>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 16, 16),
              paddingBottom: Math.max(insets.bottom + 24, 40) + keyboardHeight,
            },
          ]}
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    (colors as any).authInputBg ?? colors.surface,
                  borderColor:
                    (colors as any).authInputBorder ?? colors.cardBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Log Workout
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Workout Info Card */}
          <View
            style={[
              styles.workoutCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
              },
            ]}
          >
            {workoutImage ? (
              <Image
                source={{ uri: workoutImage }}
                style={styles.workoutImage}
              />
            ) : (
              <View
                style={[
                  styles.workoutImagePlaceholder,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Ionicons name="fitness" size={40} color={colors.primary} />
              </View>
            )}
            <Text style={[styles.workoutName, { color: colors.text }]}>
              {workoutName}
            </Text>
          </View>

          {/* Duration Input */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              Duration (minutes) *
            </Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g., 45"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>

          {/* Custom Date/Time Picker */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              Date & Time
            </Text>

            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatDate(selectedDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatTime(selectedTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker Modal */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                style={styles.picker}
              />
            )}

            {/* Time Picker Modal */}
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
                style={styles.picker}
              />
            )}
          </View>

          {/* Sets Section */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
              },
            ]}
          >
            <View style={styles.setsHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Sets *</Text>
              <TouchableOpacity
                onPress={addSet}
                style={[styles.addButton, { overflow: "hidden" }]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    colors.primary,
                    (colors as any).secondary || colors.primary,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.addButtonText}>Add Set</Text>
              </TouchableOpacity>
            </View>

            {sets.map((set, index) => (
              <View
                key={set.id}
                style={[styles.setRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.setNumber, { color: colors.primary }]}>
                  Set {index + 1}
                </Text>
                <View style={styles.setInputs}>
                  <View
                    style={[
                      styles.setInputWrapper,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.setInput, { color: colors.text }]}
                      placeholder="Reps"
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(value) => updateSet(set.id, "reps", value)}
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  <View
                    style={[
                      styles.setInputWrapper,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.setInput, { color: colors.text }]}
                      placeholder="Weight (kg)"
                      keyboardType="numeric"
                      value={set.weight}
                      onChangeText={(value) =>
                        updateSet(set.id, "weight", value)
                      }
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {sets.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeSet(set.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Notes Input */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              Notes (optional)
            </Text>
            <View style={[styles.notesWrapper, { borderColor: colors.border }]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={colors.primary}
              />
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did it feel? Any observations?"
                placeholderTextColor={colors.placeholder}
                textAlignVertical="top"
                onFocus={() =>
                  setTimeout(
                    () =>
                      scrollViewRef.current?.scrollTo({
                        y: 500,
                        animated: true,
                      }),
                    150,
                  )
                }
              />
            </View>
          </View>

          {/* Summary Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: (colors as any).authInputBg ?? colors.surface,
                borderColor:
                  (colors as any).authInputBorder ?? colors.cardBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Session Summary
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="fitness" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {totalVolume.toFixed(1)} kg
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Total Volume
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryItem}>
                <Ionicons name="timer" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {duration || "0"} min
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Duration
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryItem}>
                <Ionicons name="repeat" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {sets.filter((s) => s.reps && s.weight).length}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Sets
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[
                  colors.primary,
                  (colors as any).secondary || colors.primary,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Save Session</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle3: {
    position: "absolute",
    top: "30%",
    left: "-20%",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  workoutCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  workoutImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  workoutImagePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
  },
  picker: {
    marginTop: 10,
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  setRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  setInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setInputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  setInput: {
    fontSize: 14,
  },
  removeButton: {
    padding: 4,
  },
  notesWrapper: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  notesInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 80,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
