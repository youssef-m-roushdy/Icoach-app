import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Switch,
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
import SuccessModal from "../components/common/SuccessModal";
import { showErrorToast, getErrorMessage } from "../utils/toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SetData {
  id: string;
  reps: string;
  weight: string;
  is_completed: boolean;
  completed_at: Date;
  rest_time_seconds: string; // stored as string for TextInput, parsed on submit
  notes: string;
  expanded: boolean; // UI only – toggles advanced fields
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSet = (): SetData => ({
  id: Date.now().toString() + Math.random(),
  reps: "",
  weight: "",
  is_completed: true,
  completed_at: new Date(),
  rest_time_seconds: "",
  notes: "",
  expanded: false,
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutSessionScreen({ route, navigation }: any) {
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();
  const { workoutId, workoutName, workoutImage } = route.params;
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ── Form state ──
  const [duration, setDuration] = useState("");
  const [sets, setSets] = useState<SetData[]>([makeSet()]);
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Set CRUD ──

  const addSet = () => setSets((prev) => [...prev, makeSet()]);

  const removeSet = (id: string) => {
    if (sets.length === 1) {
      showErrorToast({ title: "Cannot Remove", message: "You need at least one set" });
      return;
    }
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSet = <K extends keyof SetData>(id: string, field: K, value: SetData[K]) =>
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const toggleExpanded = (id: string) =>
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)));

  // ── Calculations ──

  const calculateVolume = () =>
    sets.reduce((total, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps) || 0;
      return total + w * r;
    }, 0);

  const completedSets = sets.filter((s) => s.reps && s.weight);

  // ── Validation ──

  const validateForm = (): boolean => {
    if (!duration || parseInt(duration) <= 0) {
      showErrorToast({ title: "Validation Error", message: "Please enter a valid duration in minutes" });
      return false;
    }
    if (completedSets.length === 0) {
      showErrorToast({ title: "Validation Error", message: "Please add at least one complete set (reps + weight)" });
      return false;
    }
    for (const s of completedSets) {
      if (isNaN(parseInt(s.reps)) || parseInt(s.reps) <= 0) {
        showErrorToast({ title: "Validation Error", message: "Reps must be a positive number" });
        return false;
      }
      if (isNaN(parseFloat(s.weight)) || parseFloat(s.weight) < 0) {
        showErrorToast({ title: "Validation Error", message: "Weight cannot be negative" });
        return false;
      }
    }
    return true;
  };

  // ── Date / Time helpers ──

  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const handleTimeChange = (_: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) setSelectedTime(time);
  };

  const getCombinedDateTime = (): Date => {
    const d = new Date(selectedDate);
    d.setHours(selectedTime.getHours());
    d.setMinutes(selectedTime.getMinutes());
    return d;
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  // ── Submit ──

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!token) {
      showErrorToast({ title: "Authentication Error", message: "You need to be logged in" });
      return;
    }

    setLoading(true);
    try {
      const completedAt = getCombinedDateTime();

      // Map each set to the normalized API shape
      const mappedSets = completedSets.map((s) => ({
        reps: parseInt(s.reps),
        weight: parseFloat(s.weight),
        is_completed: s.is_completed,
        completed_at: s.completed_at.toISOString(),
        rest_time_seconds: s.rest_time_seconds ? parseInt(s.rest_time_seconds) : undefined,
        notes: s.notes.trim() || undefined,
      }));

      const sessionData: CreateWorkoutSessionData = {
        workoutId,
        duration: parseInt(duration),
        completedAt: completedAt.toISOString(),
        notes: notes.trim() || undefined,
        sets: mappedSets,
      };

      console.log("Creating workout session:", JSON.stringify(sessionData, null, 2));

      const response = await workoutSessionService.createWorkoutSession(sessionData, token);

      if (response.success) setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Failed to save workout session:", error);
      showErrorToast({
        title: "Error",
        message: getErrorMessage(error) || "Failed to save workout session. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalVolume = calculateVolume();

  // ─── Render ────────────────────────────────────────────────────────────────

  const cardStyle = {
    backgroundColor: (colors as any).authInputBg ?? colors.surface,
    borderColor: (colors as any).authInputBorder ?? colors.cardBorder,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={(colors as any).authBgGradient || colors.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: (colors as any).authCircle1 || "rgba(255,255,255,0.05)" }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: (colors as any).authCircle2 || "rgba(255,255,255,0.05)" }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: (colors as any).authCircle3 || "rgba(255,255,255,0.05)" }]} />
      </LinearGradient>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets
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
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { backgroundColor: (colors as any).authInputBg ?? colors.surface, borderColor: (colors as any).authInputBorder ?? colors.cardBorder, borderWidth: 1 }]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Log Workout</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Workout Info Card ── */}
          <View style={[styles.workoutCard, cardStyle]}>
            {workoutImage ? (
              <Image source={{ uri: workoutImage }} style={styles.workoutImage} />
            ) : (
              <View style={[styles.workoutImagePlaceholder, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="fitness" size={40} color={colors.primary} />
              </View>
            )}
            <Text style={[styles.workoutName, { color: colors.text }]}>{workoutName}</Text>
          </View>

          {/* ── Duration ── */}
          <View style={[styles.inputCard, cardStyle]}>
            <Text style={[styles.label, { color: colors.text }]}>Duration (minutes) *</Text>
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

          {/* ── Date & Time ── */}
          <View style={[styles.inputCard, cardStyle]}>
            <Text style={[styles.label, { color: colors.text }]}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity style={[styles.dateTimeButton, { borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateTimeButton, { borderColor: colors.border }]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTime(selectedTime)}</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleDateChange} style={styles.picker} />
            )}
            {showTimePicker && (
              <DateTimePicker value={selectedTime} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleTimeChange} style={styles.picker} />
            )}
          </View>

          {/* ── Sets ── */}
          <View style={[styles.inputCard, cardStyle]}>
            <View style={styles.setsHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Sets *</Text>
              <TouchableOpacity onPress={addSet} style={[styles.addButton, { overflow: "hidden" }]} activeOpacity={0.8}>
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addButtonText}>Add Set</Text>
              </TouchableOpacity>
            </View>

            {sets.map((set, index) => (
              <View key={set.id} style={[styles.setCard, { borderColor: colors.border, backgroundColor: colors.background + "60" }]}>
                {/* ── Set header row ── */}
                <View style={styles.setHeaderRow}>
                  <Text style={[styles.setNumber, { color: colors.primary }]}>Set {index + 1}</Text>
                  <View style={styles.setHeaderActions}>
                    {/* Completed toggle */}
                    <View style={styles.completedRow}>
                      <Text style={[styles.completedLabel, { color: colors.textSecondary }]}>Done</Text>
                      <Switch
                        value={set.is_completed}
                        onValueChange={(v) => updateSet(set.id, "is_completed", v)}
                        trackColor={{ false: colors.border, true: colors.primary + "80" }}
                        thumbColor={set.is_completed ? colors.primary : colors.textSecondary}
                        style={styles.switch}
                      />
                    </View>
                    {/* Expand / collapse advanced fields */}
                    <TouchableOpacity onPress={() => toggleExpanded(set.id)} style={styles.expandBtn}>
                      <Ionicons
                        name={set.expanded ? "chevron-up-outline" : "chevron-down-outline"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {/* Remove */}
                    {sets.length > 1 && (
                      <TouchableOpacity onPress={() => removeSet(set.id)} style={styles.removeButton}>
                        <Ionicons name="close-circle" size={22} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* ── Core inputs: reps + weight ── */}
                <View style={styles.setInputs}>
                  <View style={[styles.setInputWrapper, { borderColor: colors.border }]}>
                    <Text style={[styles.setInputLabel, { color: colors.textSecondary }]}>Reps</Text>
                    <TextInput
                      style={[styles.setInput, { color: colors.text }]}
                      placeholder="0"
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(v) => updateSet(set.id, "reps", v)}
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  <View style={[styles.setInputWrapper, { borderColor: colors.border }]}>
                    <Text style={[styles.setInputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                    <TextInput
                      style={[styles.setInput, { color: colors.text }]}
                      placeholder="0"
                      keyboardType="numeric"
                      value={set.weight}
                      onChangeText={(v) => updateSet(set.id, "weight", v)}
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* ── Advanced fields (collapsible) ── */}
                {set.expanded && (
                  <View style={styles.advancedFields}>
                    {/* Rest time */}
                    <View style={[styles.advancedRow, { borderColor: colors.border }]}>
                      <Ionicons name="timer-outline" size={18} color={colors.primary} />
                      <TextInput
                        style={[styles.advancedInput, { color: colors.text }]}
                        placeholder="Rest time (seconds)"
                        keyboardType="numeric"
                        value={set.rest_time_seconds}
                        onChangeText={(v) => updateSet(set.id, "rest_time_seconds", v)}
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    {/* Set notes */}
                    <View style={[styles.advancedRow, { borderColor: colors.border }]}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <TextInput
                        style={[styles.advancedInput, { color: colors.text }]}
                        placeholder="Set notes (optional)"
                        value={set.notes}
                        onChangeText={(v) => updateSet(set.id, "notes", v)}
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    {/* Set completed_at */}
                    <TouchableOpacity
                      style={[styles.advancedRow, { borderColor: colors.border }]}
                      onPress={() => {
                        // Reuse the global time picker; store result per-set
                        // For simplicity we show a note — you can wire a per-set picker here
                      }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text style={[styles.advancedInputText, { color: colors.text }]}>
                        Completed at: {formatTime(set.completed_at)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Mini set volume hint */}
                {set.reps && set.weight ? (
                  <Text style={[styles.setVolume, { color: colors.textSecondary }]}>
                    Volume: {(parseFloat(set.weight) * parseInt(set.reps)).toFixed(1)} kg
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* ── Session Notes ── */}
          <View style={[styles.inputCard, cardStyle]}>
            <Text style={[styles.label, { color: colors.text }]}>Session Notes (optional)</Text>
            <View style={[styles.notesWrapper, { borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
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
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)
                }
              />
            </View>
          </View>

          {/* ── Summary Card ── */}
          <View style={[styles.summaryCard, cardStyle, { borderWidth: 1 }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Session Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>{totalVolume.toFixed(1)} kg</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Volume</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="timer" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>{duration || "0"} min</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duration</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="repeat" size={24} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>{completedSets.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sets</Text>
              </View>
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
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

      {/* ── Success Modal ── */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success! 🎉"
        message="Workout session saved successfully. Your progress has been updated!"
        primaryButtonText="View Progress"
        onPrimaryPress={() => {
          setShowSuccessModal(false);
          navigation.navigate("GymProgress");
        }}
        secondaryButtonText="Done"
        onSecondaryPress={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  decorativeCircle1: { position: "absolute", top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: "absolute", top: "30%", left: "-20%", width: 150, height: 150, borderRadius: 75 },
  container: { flex: 1 },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  workoutCard: {
    borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, alignItems: "center", overflow: "hidden",
    ...Platform.select({ ios: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }, android: { elevation: 8 } }),
  },
  workoutImage: { width: "100%", height: 150, borderRadius: 12, marginBottom: 12 },
  workoutImagePlaceholder: { width: "100%", height: 150, borderRadius: 12, marginBottom: 12, justifyContent: "center", alignItems: "center" },
  workoutName: { fontSize: 18, fontWeight: "700" },
  inputCard: {
    borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, overflow: "hidden",
    ...Platform.select({ ios: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }, android: { elevation: 8 } }),
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, gap: 8 },
  input: { flex: 1, fontSize: 16 },
  dateTimeRow: { flexDirection: "row", gap: 12 },
  dateTimeButton: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  dateTimeText: { fontSize: 14 },
  picker: { marginTop: 10 },
  setsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  // Per-set card
  setCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  setHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  setNumber: { fontSize: 14, fontWeight: "700" },
  setHeaderActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  completedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  completedLabel: { fontSize: 12 },
  switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  expandBtn: { padding: 4 },
  removeButton: { padding: 4 },
  setInputs: { flexDirection: "row", gap: 8, marginBottom: 6 },
  setInputWrapper: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: Platform.OS === "ios" ? 10 : 6 },
  setInputLabel: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  setInput: { fontSize: 15, fontWeight: "600" },
  setVolume: { fontSize: 11, textAlign: "right", marginTop: 2 },

  // Advanced (collapsible) fields
  advancedFields: { marginTop: 8, gap: 8 },
  advancedRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  advancedInput: { flex: 1, fontSize: 14 },
  advancedInputText: { flex: 1, fontSize: 14 },

  notesWrapper: { flexDirection: "row", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  notesInput: { flex: 1, fontSize: 14, minHeight: 80 },
  summaryCard: {
    borderRadius: 24, padding: 20, marginBottom: 24, overflow: "hidden",
    ...Platform.select({ ios: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }, android: { elevation: 8 } }),
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryDivider: { width: 1, height: 40 },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: "row", gap: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  submitButton: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});