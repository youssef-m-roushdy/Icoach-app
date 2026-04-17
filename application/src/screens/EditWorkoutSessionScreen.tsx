// EditWorkoutSessionScreen.tsx - Simple: Only Add Set reloads, Update/Delete are optimistic
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Keyboard,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  workoutSessionService,
  type WorkoutSession,
} from "../services/workoutSessionService";
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from "../utils/toast";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { workoutSessionSetService } from "../services/workoutSessionSetService";

// ── useKeyboardHeight ─────────────────────────────────────────────────────────
function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}

interface EditWorkoutSessionScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: number;
    };
  };
}

interface EditableSet {
  id?: number;
  reps: string;
  weight: string;
  isCompleted: boolean;
  restTimeSeconds?: string;
  notes?: string;
}

export default function EditWorkoutSessionScreen({ navigation, route }: EditWorkoutSessionScreenProps) {
  const { sessionId } = route.params;
  const { colors, theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const setSheetRef = useRef<BottomSheetModal>(null);
  const setSheetScrollRef = useRef<ScrollView>(null);
  const deleteSetSheetRef = useRef<BottomSheetModal>(null);

  // State
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Session details
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Sets management
  const [sets, setSets] = useState<EditableSet[]>([]);
  const [editingSet, setEditingSet] = useState<EditableSet | null>(null);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [deletingSetIndex, setDeletingSetIndex] = useState<number | null>(null);

  // Set form state
  const [setFormReps, setSetFormReps] = useState("");
  const [setFormWeight, setSetFormWeight] = useState("");
  const [setFormCompleted, setSetFormCompleted] = useState(false);
  const [setFormRestTime, setSetFormRestTime] = useState("");
  const [setFormNotes, setSetFormNotes] = useState("");

  // Snap points
  const setSheetSnapPoints = useMemo(() => ["75%"], []);
  const deleteSetSnapPoints = useMemo(() => ["30%"], []);

  // Load session data
  const loadSession = async () => {
    try {
      if (!token) return;
      setRefreshing(true);

      const response = await workoutSessionService.getWorkoutSessionById(sessionId, token);

      if (response.success && response.data) {
        setSession(response.data);
        setDuration(response.data.duration?.toString() || "");
        setNotes(response.data.notes || "");

        const editableSets: EditableSet[] = (response.data.sets || []).map((set: any) => ({
          id: set.id,
          reps: set.reps?.toString() || "0",
          weight: set.weight !== null && set.weight !== undefined ? set.weight.toString() : "",
          isCompleted: set.isCompleted || false,
          restTimeSeconds: set.restTimeSeconds?.toString(),
          notes: set.notes || undefined,
        }));
        setSets(editableSets);
      } else {
        showErrorToast({
          title: "Error",
          message: response.message || "Failed to load session",
        });
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      showErrorToast({
        title: "Error",
        message: getErrorMessage(error) || "Failed to load session",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  // ── Session Details Handlers ──────────────────────────────────────────────
  const handleSaveSessionDetails = async () => {
    if (!duration || parseInt(duration) <= 0) {
      showErrorToast({
        title: "Validation Error",
        message: "Duration must be a positive number",
      });
      return;
    }

    // Optimistic update
    const previousDuration = session?.duration;
    const previousNotes = session?.notes;
    
    if (session) {
      setSession({
        ...session,
        duration: parseInt(duration),
        notes: notes || null,
      });
    }

    setSaving(true);
    try {
      const response = await workoutSessionService.patchWorkoutSessionDetails(
        sessionId,
        {
          duration: parseInt(duration),
          notes: notes || undefined,
        },
        token!
      );

      if (response.success) {
        showSuccessToast({ title: "Success", message: "Session details updated" });
      } else {
        // Rollback
        if (session) {
          setSession({
            ...session,
            duration: previousDuration || 0,
            notes: previousNotes || null,
          });
        }
        showErrorToast({ title: "Error", message: response.message || "Failed to update session" });
      }
    } catch (error) {
      // Rollback
      if (session) {
        setSession({
          ...session,
          duration: previousDuration || 0,
          notes: previousNotes || null,
        });
      }
      console.error("Failed to update session:", error);
      showErrorToast({ title: "Error", message: getErrorMessage(error) || "Failed to update session" });
    } finally {
      setSaving(false);
    }
  };

  // ── Set Handlers ──────────────────────────────────────────────────────────
  const openAddSetSheet = () => {
    setEditingSet(null);
    setEditingSetIndex(null);
    setSetFormReps("");
    setSetFormWeight("");
    setSetFormCompleted(false);
    setSetFormRestTime("");
    setSetFormNotes("");
    setSheetRef.current?.present();
    
    setTimeout(() => {
      setSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const openEditSetSheet = (set: EditableSet, index: number) => {
    setEditingSet(set);
    setEditingSetIndex(index);
    setSetFormReps(set.reps);
    setSetFormWeight(set.weight || "");
    setSetFormCompleted(set.isCompleted);
    setSetFormRestTime(set.restTimeSeconds || "");
    setSetFormNotes(set.notes || "");
    setSheetRef.current?.present();
    
    setTimeout(() => {
      setSheetScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const closeSetSheet = () => setSheetRef.current?.dismiss();

  const handleSaveSet = async () => {
    // Validate reps
    if (!setFormReps || parseInt(setFormReps) <= 0) {
      showErrorToast({ title: "Validation Error", message: "Reps must be a positive number" });
      return;
    }
    
    // Weight is optional - only validate if provided
    if (setFormWeight && setFormWeight.trim() !== "") {
      const weightValue = parseFloat(setFormWeight);
      if (isNaN(weightValue) || weightValue < 0) {
        showErrorToast({ title: "Validation Error", message: "Weight cannot be negative" });
        return;
      }
    }

    const setData: any = {
      reps: parseInt(setFormReps),
      is_completed: setFormCompleted,
      rest_time_seconds: setFormRestTime ? parseInt(setFormRestTime) : undefined,
      notes: setFormNotes || undefined,
    };

    if (setFormWeight && setFormWeight.trim() !== "") {
      setData.weight = parseFloat(setFormWeight);
    } else {
      setData.weight = null;
    }

    setSaving(true);
    try {
      if (editingSet && editingSet.id) {
        // UPDATE - Optimistic
        const previousSets = [...sets];
        const updatedSets = sets.map((s, i) => 
          i === editingSetIndex 
            ? {
                ...s,
                reps: setFormReps,
                weight: setFormWeight,
                isCompleted: setFormCompleted,
                restTimeSeconds: setFormRestTime,
                notes: setFormNotes,
              }
            : s
        );
        setSets(updatedSets);
        closeSetSheet();
        showSuccessToast({ title: "Success", message: "Set updated" });

        try {
          const response = await workoutSessionSetService.updateSet(
            sessionId, 
            editingSet.id, 
            setData, 
            token!
          );
          if (!response.success) {
            setSets(previousSets);
            showErrorToast({ title: "Error", message: response.message || "Failed to update set" });
          }
        } catch (error) {
          setSets(previousSets);
          throw error;
        }
      } else {
        // ADD - Reload after success
        closeSetSheet();
        
        const response = await workoutSessionSetService.addSet(sessionId, setData, token!);
        if (response.success) {
          showSuccessToast({ title: "Success", message: "Set added successfully" });
          await loadSession(); // Only reload for add
        } else {
          showErrorToast({ title: "Error", message: response.message || "Failed to add set" });
        }
      }
    } catch (error) {
      console.error("Failed to save set:", error);
      showErrorToast({ title: "Error", message: getErrorMessage(error) || "Failed to save set" });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteSetSheet = (index: number) => {
    setDeletingSetIndex(index);
    deleteSetSheetRef.current?.present();
  };

  const closeDeleteSetSheet = () => {
    setDeletingSetIndex(null);
    deleteSetSheetRef.current?.dismiss();
  };

  const handleDeleteSet = async () => {
    if (deletingSetIndex === null) return;
    const setToDelete = sets[deletingSetIndex];
    
    if (setToDelete.id) {
      // Optimistic delete
      const previousSets = [...sets];
      const updatedSets = sets.filter((_, i) => i !== deletingSetIndex);
      setSets(updatedSets);
      closeDeleteSetSheet();
      showSuccessToast({ title: "Success", message: "Set deleted" });

      try {
        const response = await workoutSessionSetService.deleteSet(
          sessionId, 
          setToDelete.id, 
          token!
        );
        if (!response.success) {
          setSets(previousSets);
          showErrorToast({ title: "Error", message: response.message || "Failed to delete set" });
        }
      } catch (error) {
        setSets(previousSets);
        console.error("Failed to delete set:", error);
        showErrorToast({ title: "Error", message: getErrorMessage(error) || "Failed to delete set" });
      }
    } else {
      // Remove unsaved set
      setSets(sets.filter((_, i) => i !== deletingSetIndex));
      closeDeleteSetSheet();
    }
  };

  const handleToggleComplete = (index: number) => {
    const set = sets[index];
    if (!set.id) return;
    
    // Optimistic toggle
    const previousSets = [...sets];
    const updatedSets = sets.map((s, i) => 
      i === index ? { ...s, isCompleted: !s.isCompleted } : s
    );
    setSets(updatedSets);

    // Sync with server
    const setData = { is_completed: !set.isCompleted };
    workoutSessionSetService.updateSet(sessionId, set.id, setData, token!)
      .catch(error => {
        console.error("Failed to sync completion status:", error);
        setSets(previousSets);
      });
  };

  // ── Backdrop ───────────────────────────────────────────────────────────────
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const sheetBg = isDarkMode ? "#1C1C1E" : "#FFFFFF";
  const sheetBackground = useMemo(
    () => ({ backgroundColor: sheetBg }),
    [sheetBg]
  );

  const handleIndicatorStyle = useMemo(
    () => ({ backgroundColor: colors.divider ?? "#C0C0C0", width: 40, height: 4 }),
    [colors.divider]
  );

  // ── Calculations ───────────────────────────────────────────────────────────
  const totalVolume = sets.reduce((sum, set) => {
    const weight = set.weight && set.weight.trim() !== "" ? parseFloat(set.weight) : 0;
    return sum + (parseInt(set.reps) || 0) * weight;
  }, 0);

  const completedSets = sets.filter((s) => s.isCompleted).length;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Background */}
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 24, 40) + keyboardHeight,
          },
        ]}
      >
        {/* Workout Info */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.authInputBg || colors.card,
              borderColor: colors.authInputBorder || colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {session?.workout?.name || `Workout #${session?.workoutId}`}
          </Text>
          {session?.workout && (
            <View style={styles.workoutMeta}>
              <Ionicons name="barbell-outline" size={14} color={colors.primary} />
              <Text style={[styles.workoutMetaText, { color: colors.textSecondary }]}>
                {session.workout.body_part} • {session.workout.target_area}
              </Text>
            </View>
          )}
        </View>

        {/* Session Details */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.authInputBg || colors.card,
              borderColor: colors.authInputBorder || colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Duration (minutes)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.authInputBorder || colors.border,
                  backgroundColor: colors.authCardBg || colors.surface,
                  color: colors.text,
                },
              ]}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              placeholder="Enter duration"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  borderColor: colors.authInputBorder || colors.border,
                  backgroundColor: colors.authCardBg || colors.surface,
                  color: colors.text,
                },
              ]}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.placeholder}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { overflow: "hidden" }]}
            onPress={handleSaveSessionDetails}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, (colors as any).secondary || colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Details</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sets Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.authInputBg || colors.card,
              borderColor: colors.authInputBorder || colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Sets</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary + "15" }]}
              onPress={openAddSetSheet}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Set</Text>
            </TouchableOpacity>
          </View>

          {/* Sets Summary */}
          <View style={[styles.setsSummary, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Sets</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{sets.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.authInputBorder || colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Completed</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {completedSets}/{sets.length}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.authInputBorder || colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Volume</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalVolume} kg</Text>
            </View>
          </View>

          {/* Sets List */}
          {refreshing && sets.length === 0 ? (
            <View style={styles.emptySets}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : sets.length === 0 ? (
            <View style={styles.emptySets}>
              <Ionicons name="barbell-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptySetsText, { color: colors.textSecondary }]}>
                No sets added yet
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddButton, { borderColor: colors.primary }]}
                onPress={openAddSetSheet}
              >
                <Text style={[styles.emptyAddButtonText, { color: colors.primary }]}>
                  Add Your First Set
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            sets.map((set, index) => (
              <View
                key={set.id || `new-${index}`}
                style={[
                  styles.setCard,
                  {
                    backgroundColor: colors.authCardBg || colors.surface,
                    borderColor: colors.authInputBorder || colors.border,
                  },
                ]}
              >
                <View style={styles.setHeader}>
                  <View style={styles.setNumber}>
                    <Text style={[styles.setNumberText, { color: colors.text }]}>
                      Set {index + 1}
                    </Text>
                    {set.isCompleted && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <Text style={[styles.completedBadgeText, { color: colors.primary }]}>Completed</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.setActions}>
                    <TouchableOpacity
                      style={[styles.setAction, { backgroundColor: colors.primary + "15" }]}
                      onPress={() => handleToggleComplete(index)}
                    >
                      <Ionicons
                        name={set.isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.setAction, { backgroundColor: colors.primary + "15" }]}
                      onPress={() => openEditSetSheet(set, index)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.setAction, { backgroundColor: "#ef4444" + "15" }]}
                      onPress={() => openDeleteSetSheet(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.setDetails}>
                  <View style={styles.setDetail}>
                    <Ionicons name="repeat" size={14} color={colors.primary} />
                    <Text style={[styles.setDetailText, { color: colors.text }]}>
                      {set.reps} reps
                    </Text>
                  </View>
                  {set.weight && parseFloat(set.weight) > 0 && (
                    <View style={styles.setDetail}>
                      <Ionicons name="barbell" size={14} color={colors.primary} />
                      <Text style={[styles.setDetailText, { color: colors.text }]}>
                        {set.weight} kg
                      </Text>
                    </View>
                  )}
                  {set.restTimeSeconds && (
                    <View style={styles.setDetail}>
                      <Ionicons name="timer" size={14} color={colors.primary} />
                      <Text style={[styles.setDetailText, { color: colors.text }]}>
                        {set.restTimeSeconds}s rest
                      </Text>
                    </View>
                  )}
                </View>

                {set.notes && (
                  <View style={[styles.setNotes, { borderTopColor: colors.authInputBorder || "rgba(0,0,0,0.08)" }]}>
                    <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.setNotesText, { color: colors.textSecondary }]}>
                      {set.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Set Form Bottom Sheet */}
      <BottomSheetModal
        ref={setSheetRef}
        index={0}
        snapPoints={setSheetSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          ref={setSheetScrollRef}
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingBottom: Math.max(24, 40) + (Platform.OS === 'android' ? keyboardHeight : 0),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {editingSet ? "Edit Set" : "Add New Set"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Reps *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface, color: colors.text }]}
              keyboardType="numeric"
              value={setFormReps}
              onChangeText={setSetFormReps}
              placeholder="e.g., 12"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Weight (kg) - Optional</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface, color: colors.text }]}
              keyboardType="numeric"
              value={setFormWeight}
              onChangeText={setSetFormWeight}
              placeholder="Leave empty for bodyweight"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Rest Time (seconds)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface, color: colors.text }]}
              keyboardType="numeric"
              value={setFormRestTime}
              onChangeText={setSetFormRestTime}
              placeholder="e.g., 60"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface, color: colors.text }]}
              multiline
              numberOfLines={3}
              value={setFormNotes}
              onChangeText={setSetFormNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.placeholder}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Completed</Text>
            <Switch
              value={setFormCompleted}
              onValueChange={setSetFormCompleted}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={setFormCompleted ? "#FFFFFF" : "#f4f3f4"}
            />
          </View>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[
                styles.sheetButton,
                styles.cancelButton,
                { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border },
              ]}
              onPress={closeSetSheet}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetButton, styles.saveSheetButton, { overflow: "hidden" }]}
              onPress={handleSaveSet}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveSheetButtonText}>
                  {editingSet ? "Update" : "Add"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Delete Set Confirmation Sheet */}
      <BottomSheetModal
        ref={deleteSetSheetRef}
        index={0}
        snapPoints={deleteSetSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
      >
        <BottomSheetView style={styles.deleteSheetContent}>
          <View style={styles.deleteIconContainer}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
          </View>
          <Text style={[styles.deleteTitle, { color: colors.text }]}>Delete Set</Text>
          <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
            Are you sure you want to delete this set?
          </Text>
          <View style={styles.deleteButtons}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                styles.cancelDeleteButton,
                { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border },
              ]}
              onPress={closeDeleteSetSheet}
            >
              <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, styles.confirmDeleteButton, { backgroundColor: "#ef4444" }]}
              onPress={handleDeleteSet}
            >
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorativeCircle1: { position: "absolute", top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: "absolute", top: "30%", left: "-20%", width: 150, height: 150, borderRadius: 75 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "transparent" },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  section: { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  workoutMeta: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  workoutMetaText: { fontSize: 14, opacity: 0.8 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, opacity: 0.9 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  textArea: { minHeight: 100, paddingTop: 14, textAlignVertical: "top" },
  saveButton: { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  addButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, gap: 6 },
  addButtonText: { fontSize: 14, fontWeight: "600" },
  setsSummary: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 18, marginBottom: 16, borderRadius: 16 },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryDivider: { width: 1, height: 32, opacity: 0.4 },
  summaryLabel: { fontSize: 12, marginBottom: 6, fontWeight: "500" },
  summaryValue: { fontSize: 20, fontWeight: "700" },
  emptySets: { alignItems: "center", paddingVertical: 50 },
  emptySetsText: { fontSize: 16, marginTop: 12, marginBottom: 20, opacity: 0.7 },
  emptyAddButton: { borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
  emptyAddButtonText: { fontSize: 15, fontWeight: "600" },
  setCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  setHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  setNumber: { flexDirection: "row", alignItems: "center", gap: 10 },
  setNumberText: { fontSize: 16, fontWeight: "600" },
  completedBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4 },
  completedBadgeText: { fontSize: 11, fontWeight: "600" },
  setActions: { flexDirection: "row", gap: 6 },
  setAction: { padding: 10, borderRadius: 10 },
  setDetails: { flexDirection: "row", flexWrap: "wrap", gap: 18, marginBottom: 8 },
  setDetail: { flexDirection: "row", alignItems: "center", gap: 8 },
  setDetailText: { fontSize: 15, fontWeight: "500" },
  setNotes: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  setNotesText: { fontSize: 13, flex: 1, opacity: 0.8, lineHeight: 18 },
  sheetContent: { padding: 24 },
  sheetTitle: { fontSize: 22, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  switchGroup: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8, paddingVertical: 8 },
  sheetFooter: { flexDirection: "row", gap: 12, marginTop: 28 },
  sheetButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveSheetButton: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  saveSheetButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  deleteSheetContent: { alignItems: "center", padding: 28 },
  deleteIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#ef4444" + "15", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  deleteTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  deleteMessage: { fontSize: 15, textAlign: "center", marginBottom: 28, opacity: 0.8, lineHeight: 22, paddingHorizontal: 10 },
  deleteButtons: { flexDirection: "row", gap: 14, width: "100%" },
  deleteButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  cancelDeleteButton: { borderWidth: 1 },
  cancelDeleteText: { fontSize: 16, fontWeight: "600" },
  confirmDeleteButton: { shadowColor: "#ef4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  confirmDeleteText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});