import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  Platform,
  BackHandler,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import {
  workoutSessionService,
  type WorkoutSession,
  type CreateWorkoutSessionData,
} from "../services/workoutSessionService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSystemNavigation } from "../context/SystemNavigationContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from "../utils/toast";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

interface WorkoutSessionWithDetails extends WorkoutSession {
  workout?: {
    id: number;
    name: string;
    body_part: string;
    target_area: string;
    gif_link: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EditSessionData {
  id: number;
  duration: string;
  sets: string;
  reps: string;
  weight: string;
  notes: string;
  completedAt: Date;
}

export default function WorkoutHistoryScreen({ navigation }: any) {
  const keyboardHeight = useKeyboardHeight();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();

  // Bottom sheet refs
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const filterScrollViewRef = useRef<any>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const flatListRef = useRef<FlatList>(null);

  // Snap points
  const filterSnapPoints = useMemo(() => ["85%"], []);
  const editSnapPoints = useMemo(() => ["90%"], []);
  const deleteSnapPoints = useMemo(() => ["40%"], []);

  // State
  const [sessions, setSessions] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });

  // Filter state
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(
    null,
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [minDuration, setMinDuration] = useState<string>("");
  const [minVolume, setMinVolume] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(
    null,
  );

  // Text filters
  const [bodyPartFilter, setBodyPartFilter] = useState<string>("");
  const [targetAreaFilter, setTargetAreaFilter] = useState<string>("");
  const [workoutNameFilter, setWorkoutNameFilter] = useState<string>("");

  // Edit modal state
  const [editingSession, setEditingSession] = useState<EditSessionData | null>(
    null,
  );
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingSession, setDeletingSession] =
    useState<WorkoutSessionWithDetails | null>(null);

  // Track modal open states for back button handling
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ── Bottom sheet open/close handlers ──────────────────────────────────────
  const openFilterSheet = useCallback(
    () => {
      setIsFilterModalOpen(true);
      filterSheetRef.current?.present();
    },
    [],
  );
  const closeFilterSheet = useCallback(
    () => {
      setIsFilterModalOpen(false);
      filterSheetRef.current?.dismiss();
    },
    [],
  );

  const openEditSheet = useCallback(() => {
    setIsEditModalOpen(true);
    editSheetRef.current?.present();
  }, []);
  const closeEditSheet = useCallback(() => {
    setIsEditModalOpen(false);
    editSheetRef.current?.dismiss();
  }, []);

  const openDeleteSheet = useCallback(
    () => {
      setIsDeleteModalOpen(true);
      deleteSheetRef.current?.present();
    },
    [],
  );
  const closeDeleteSheet = useCallback(
    () => {
      setIsDeleteModalOpen(false);
      deleteSheetRef.current?.dismiss();
    },
    [],
  );

  // ── Shared backdrop ────────────────────────────────────────────────────────
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
    [],
  );

  // ── Shared sheet style ─────────────────────────────────────────────────────
  const sheetBackground = useMemo(
    () => ({ backgroundColor: colors.authCardBg || colors.background }),
    [colors.authCardBg, colors.background],
  );
  const handleIndicatorStyle = useMemo(
    () => ({
      backgroundColor: isDarkMode ? "#FFFFFF66" : "#00000033",
      width: 40,
      height: 4,
    }),
    [isDarkMode],
  );

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadSessions();
  }, [
    pagination.page,
    selectedWorkoutId,
    startDate,
    endDate,
    minDuration,
    minVolume,
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [pagination.page]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages && page !== pagination.page) {
      setPagination((prev) => ({ ...prev, page }));
    }
  }, [pagination.totalPages, pagination.page]);

  const goToNextPage = () => goToPage(pagination.page + 1);
  const goToPreviousPage = () => goToPage(pagination.page - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(pagination.totalPages);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      // If on a page other than 1, go to previous page
      if (pagination && pagination.page > 1) {
        goToPage(pagination.page - 1);
        return true; // Prevent default back behavior
      }

      if (isFilterModalOpen) {
        closeFilterSheet();
        return true; // Prevent default back behavior
      }
      if (isEditModalOpen) {
        closeEditSheet();
        return true; // Prevent default back behavior
      }
      if (isDeleteModalOpen) {
        closeDeleteSheet();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pagination, isFilterModalOpen, isEditModalOpen, isDeleteModalOpen, closeFilterSheet, closeEditSheet, closeDeleteSheet, goToPage]);

  const loadSessions = async () => {
    try {
      if (!token) return;
      setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedWorkoutId) params.workoutId = selectedWorkoutId;
      if (startDate) params.startDate = startDate.toISOString().split("T")[0];
      if (endDate) params.endDate = endDate.toISOString().split("T")[0];
      if (minDuration) params.minDuration = parseInt(minDuration);
      if (minVolume) params.minVolume = parseFloat(minVolume);

      const response = await workoutSessionService.getWorkoutSessions(
        token,
        params,
      );

      if (response?.success) {
        setSessions(response.data || []);
        setPagination(
          response.pagination || {
            total: response.data?.length || 0,
            page: 1,
            limit: pagination.limit,
            totalPages: 1,
          },
        );
      } else {
        console.log(response?.message)
        showErrorToast({
          title: "Error",
          message: response?.message || "Failed to load workout sessions",
        });
      }
    } catch (error: any) {
      console.log("Failed to load sessions full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error?.response?.data) {
        console.log("Error response data:", JSON.stringify(error.response.data, null, 2));
      }
      console.error("Failed to load sessions:", error);

      showErrorToast({
        title: "Error",
        message: getErrorMessage(error) || "Failed to load workout sessions",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadSessions();
  }, []);

  const clearFilters = () => {
    setSelectedWorkoutId(null);
    setBodyPartFilter("");
    setTargetAreaFilter("");
    setWorkoutNameFilter("");
    setStartDate(null);
    setEndDate(null);
    setMinDuration("");
    setMinVolume("");
    setPagination((prev) => ({ ...prev, page: 1 }));
    closeFilterSheet();
    showInfoToast({
      title: "Filters Cleared",
      message: "All filters have been reset",
    });
  };

  const renderPageNumbers = () => {
    if (!pagination || pagination.totalPages === 0) return null;

    const pages = [];
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Always show exactly 5 pages (or fewer if totalPages < 5) to keep UI perfectly completely static
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, 5);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
     pages.push(i);
    }

    return pages.map((page) => {
      return (
        <TouchableOpacity
          key={page}
          style={[
            styles.pageNumber,
            page === currentPage && [
              styles.pageNumberActive,
              { backgroundColor: colors.primary },
            ],
            page !== currentPage && {
              backgroundColor: colors.primary,
              opacity: 0.3,
            },
          ]}
          onPress={() => goToPage(page as number)}
        >
          <Text
            style={[
              styles.pageNumberText,
              page === currentPage && styles.pageNumberTextActive,
            ]}
          >
            {page}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const handleEditPress = (session: WorkoutSessionWithDetails) => {
    setEditingSession({
      id: session.id,
      duration: session.duration.toString(),
      sets: session.sets.toString(),
      reps: session.reps.toString(),
      weight: session.weight.toString(),
      notes: session.notes || "",
      completedAt: new Date(session.completedAt),
    });
    openEditSheet();
  };

  const handleEditDateChange = (event: any, date?: Date) => {
    setShowEditDatePicker(false);
    if (date && editingSession) {
      const newDate = new Date(editingSession.completedAt);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setEditingSession({ ...editingSession, completedAt: newDate });
    }
  };

  const handleEditTimeChange = (event: any, time?: Date) => {
    setShowEditTimePicker(false);
    if (time && editingSession) {
      const newDate = new Date(editingSession.completedAt);
      newDate.setHours(time.getHours(), time.getMinutes());
      setEditingSession({ ...editingSession, completedAt: newDate });
    }
  };

  const saveEdit = async () => {
    if (!editingSession || !token) return;

    if (!editingSession.duration || parseInt(editingSession.duration) <= 0) {
      showErrorToast({
        title: "Validation Error",
        message: "Duration must be a positive number",
      });
      return;
    }
    if (!editingSession.sets || parseInt(editingSession.sets) <= 0) {
      showErrorToast({
        title: "Validation Error",
        message: "Sets must be a positive number",
      });
      return;
    }
    if (!editingSession.reps || parseInt(editingSession.reps) <= 0) {
      showErrorToast({
        title: "Validation Error",
        message: "Reps must be a positive number",
      });
      return;
    }
    if (!editingSession.weight || parseFloat(editingSession.weight) < 0) {
      showErrorToast({
        title: "Validation Error",
        message: "Weight cannot be negative",
      });
      return;
    }

    setSavingEdit(true);
    try {
      const volume =
        parseInt(editingSession.sets) *
        parseInt(editingSession.reps) *
        parseFloat(editingSession.weight);

      const updateData: Partial<CreateWorkoutSessionData> = {
        duration: parseInt(editingSession.duration),
        sets: parseInt(editingSession.sets),
        reps: parseInt(editingSession.reps),
        weight: parseFloat(editingSession.weight),
        volume,
        notes: editingSession.notes || undefined,
        completedAt: editingSession.completedAt.toISOString(),
      };

      const response = await workoutSessionService.updateWorkoutSession(
        editingSession.id,
        updateData,
        token,
      );

      if (response.success) {
        showSuccessToast({
          title: "Success",
          message: "Workout session updated successfully",
        });
        closeEditSheet();
        loadSessions();
      } else {
        showErrorToast({
          title: "Error",
          message: response.message || "Failed to update session",
        });
      }
    } catch (error) {
      console.error("Failed to update session:", error);
      showErrorToast({
        title: "Error",
        message: getErrorMessage(error) || "Failed to update session",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Delete handlers ────────────────────────────────────────────────────────
  const handleDeletePress = (session: WorkoutSessionWithDetails) => {
    setDeletingSession(session);
    openDeleteSheet();
  };

  const confirmDelete = async () => {
    if (!deletingSession || !token) return;

    try {
      const response = await workoutSessionService.deleteWorkoutSession(
        deletingSession.id,
        token,
      );

      if (response.success) {
        showSuccessToast({
          title: "Success",
          message: "Workout session deleted successfully",
        });
        closeDeleteSheet();
        setDeletingSession(null);

        if (sessions.length === 1 && pagination.page > 1) {
          setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
        } else {
          loadSessions();
        }
      } else {
        showErrorToast({
          title: "Error",
          message: response.message || "Failed to delete session",
        });
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      showErrorToast({
        title: "Error",
        message: getErrorMessage(error) || "Failed to delete session",
      });
    }
  };

  const filterSessionsByText = (sessions: WorkoutSessionWithDetails[]) => {
    return sessions.filter((session) => {
      const workout = session.workout;
      if (!workout) return true;

      const matchesBodyPart =
        !bodyPartFilter ||
        workout.body_part?.toLowerCase().includes(bodyPartFilter.toLowerCase());
      const matchesTargetArea =
        !targetAreaFilter ||
        workout.target_area
          ?.toLowerCase()
          .includes(targetAreaFilter.toLowerCase());
      const matchesName =
        !workoutNameFilter ||
        workout.name?.toLowerCase().includes(workoutNameFilter.toLowerCase());

      return matchesBodyPart && matchesTargetArea && matchesName;
    });
  };

  // Calculate total volume for a session
  const calculateVolume = (sets: number, reps: number, weight: number) => {
    return sets * reps * weight;
  };

  // ── Session card ───────────────────────────────────────────────────────────
  const renderSessionItem = ({ item }: { item: WorkoutSessionWithDetails }) => {
    const date = new Date(item.completedAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const volume = calculateVolume(item.sets, item.reps, item.weight);

    return (
      <View
        style={[
          styles.sessionCard,
          {
            backgroundColor: colors.authCardBg || colors.card,
            borderColor:
              colors.authCardBorder ||
              colors.cardBorder ||
              colors.border + "40",
            borderWidth: 1,
            shadowColor: isDarkMode ? "#000" : "#000",
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: isDarkMode ? 10 : 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: isDarkMode ? 8 : 4,
          },
        ]}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.primary + "15", colors.primary + "05"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        />

        {item.workout?.gif_link && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.workout.gif_link }}
              style={styles.sessionImage}
            />
            <LinearGradient
              colors={["transparent", colors.background + "CC"]}
              style={styles.imageOverlay}
            />
          </View>
        )}

        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionTitleContainer}>
              <Text
                style={[styles.workoutName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.workout?.name || `Workout #${item.workoutId}`}
              </Text>
              <View style={styles.workoutTags}>
                {item.workout?.body_part && (
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <Ionicons name="body" size={10} color={colors.primary} />
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      {item.workout.body_part}
                    </Text>
                  </View>
                )}
                {item.workout?.target_area && (
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <Ionicons name="locate" size={10} color={colors.primary} />
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      {item.workout.target_area}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.sessionMeta}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={[styles.metaText, { color: colors.subtleText }]}>
                    {formattedDate}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={[styles.metaText, { color: colors.subtleText }]}>
                    {formattedTime}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
                onPress={() => handleEditPress(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.authInputBg || colors.surface },
                ]}
                onPress={() => handleDeletePress(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sessionDetails}>
            <View style={styles.detailItem}>
              <View
                style={[
                  styles.detailIconBg,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons name="repeat" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {item.sets} × {item.reps}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View
                style={[
                  styles.detailIconBg,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons name="barbell" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {item.weight} kg
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View
                style={[
                  styles.detailIconBg,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons name="fitness" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {volume} kg
              </Text>
            </View>
            <View style={styles.detailItem}>
              <View
                style={[
                  styles.detailIconBg,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons name="timer" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.detailText, { color: colors.text }]}>
                {item.duration} min
              </Text>
            </View>
          </View>

          {item.notes && (
            <View
              style={[styles.notesContainer, { borderTopColor: colors.border }]}
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={colors.primary}
              />
              <Text
                style={[styles.notesText, { color: colors.subtleText }]}
                numberOfLines={2}
              >
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const filteredSessions = filterSessionsByText(sessions);

  if (loading && !refreshing && sessions.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {/* Animated Gradient Background matches WorkoutsScreen */}
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View
          style={[
            styles.decorativeCircle1,
            { backgroundColor: colors.authCircle1 },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle2,
            { backgroundColor: colors.authCircle2 },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle3,
            { backgroundColor: colors.authCircle3 },
          ]}
        />
      </LinearGradient>

      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: "transparent", backgroundColor: "transparent" },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Workout History
        </Text>
        <TouchableOpacity
          style={[
            styles.filterHeaderButton,
            {
              backgroundColor: colors.authInputBg || colors.surface,
              borderColor: colors.authInputBorder || colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={openFilterSheet}
        >
          <Ionicons name="filter" size={18} color={colors.text} />
          <Text style={[styles.filterHeaderText, { color: colors.text }]}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {(bodyPartFilter ||
        targetAreaFilter ||
        workoutNameFilter ||
        startDate ||
        endDate ||
        minDuration ||
        minVolume) && (
        <View
          style={[styles.activeFilters, { borderBottomColor: colors.border }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.activeFiltersContent}>
              {bodyPartFilter && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    Body: {bodyPartFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setBodyPartFilter("")}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {targetAreaFilter && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    Target: {targetAreaFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setTargetAreaFilter("")}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {workoutNameFilter && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    Name: {workoutNameFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setWorkoutNameFilter("")}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {startDate && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    From: {startDate.toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => setStartDate(null)}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {endDate && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    To: {endDate.toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => setEndDate(null)}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {minDuration && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    ≥{minDuration} min
                  </Text>
                  <TouchableOpacity onPress={() => setMinDuration("")}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {minVolume && (
                <View
                  style={[
                    styles.activeFilterChip,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[styles.activeFilterText, { color: colors.primary }]}
                  >
                    ≥{minVolume} kg
                  </Text>
                  <TouchableOpacity onPress={() => setMinVolume("")}>
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredSessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id.toString()}
        extraData={pagination.page}
        contentContainerStyle={[
          styles.listContent,
          // Only add padding if pagination is not shown, otherwise pageInfo handles the padding!
          (!pagination || pagination.totalPages <= 1) && { paddingBottom: Math.max(insets.bottom + 20, 20) }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons
                name="fitness-outline"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No workout sessions found
            </Text>
            <Text style={[styles.emptySubText, { color: colors.subtleText }]}>
              {bodyPartFilter ||
              targetAreaFilter ||
              workoutNameFilter ||
              startDate ||
              endDate ||
              minDuration ||
              minVolume
                ? "Try clearing your filters"
                : "Start your first workout to see it here!"}
            </Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={{ backgroundColor: 'transparent', paddingBottom: 0 }}>
          <View
            style={[
              styles.paginationContainer,
              { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 16, marginHorizontal: 10, marginVertical: 0 },
            ]}
          >
            <TouchableOpacity
              style={[styles.navButton, pagination.page === 1 && styles.navButtonDisabled]}
              onPress={goToFirstPage}
              disabled={pagination.page === 1}
            >
              <Ionicons
                name="play-back"
                size={20}
                color={pagination.page === 1 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, pagination.page === 1 && styles.navButtonDisabled]}
              onPress={goToPreviousPage}
              disabled={pagination.page === 1}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={pagination.page === 1 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pageNumbersContainer}
              style={{ flexGrow: 0, flexShrink: 1 }}
            >
              {renderPageNumbers()}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.navButton,
                pagination.page === pagination.totalPages && styles.navButtonDisabled,
              ]}
              onPress={goToNextPage}
              disabled={pagination.page === pagination.totalPages}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  pagination.page === pagination.totalPages
                    ? colors.textSecondary
                    : colors.primary
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                pagination.page === pagination.totalPages && styles.navButtonDisabled,
              ]}
              onPress={goToLastPage}
              disabled={pagination.page === pagination.totalPages}
            >
              <Ionicons
                name="play-forward"
                size={20}
                color={
                  pagination.page === pagination.totalPages
                    ? colors.textSecondary
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageInfo, { color: colors.text, marginTop: 0, marginBottom: 0, textAlign: 'center' }]}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} sessions)
          </Text>
        </View>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheetModal
        ref={filterSheetRef}
        index={0}
        snapPoints={filterSnapPoints}
        onChange={(index) => setIsFilterModalOpen(index >= 0)}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.sheetContent}>
          <View
            style={[styles.sheetHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filter Sessions
            </Text>
            <TouchableOpacity
              onPress={closeFilterSheet}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView
            ref={filterScrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: 20 }]}
          >
            {/* Text Filters */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Text Search
              </Text>
              <View style={styles.textFilterContainer}>
                <View
                  style={[
                    styles.textFilterInput,
                    {
                      borderColor: colors.authInputBorder || colors.border,
                      backgroundColor: colors.authInputBg || colors.surface,
                    },
                  ]}
                >
                  <Ionicons name="body" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.textFilterField, { color: colors.text }]}
                    placeholder="Body part (e.g., chest)"
                    placeholderTextColor={colors.placeholder}
                    value={bodyPartFilter}
                    onChangeText={setBodyPartFilter}
                  />
                  {bodyPartFilter !== "" && (
                    <TouchableOpacity onPress={() => setBodyPartFilter("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  style={[
                    styles.textFilterInput,
                    {
                      borderColor: colors.authInputBorder || colors.border,
                      backgroundColor: colors.authInputBg || colors.surface,
                    },
                  ]}
                >
                  <Ionicons name="locate" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.textFilterField, { color: colors.text }]}
                    placeholder="Target area (e.g., upper chest)"
                    placeholderTextColor={colors.placeholder}
                    value={targetAreaFilter}
                    onChangeText={setTargetAreaFilter}
                  />
                  {targetAreaFilter !== "" && (
                    <TouchableOpacity onPress={() => setTargetAreaFilter("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  style={[
                    styles.textFilterInput,
                    {
                      borderColor: colors.authInputBorder || colors.border,
                      backgroundColor: colors.authInputBg || colors.surface,
                    },
                  ]}
                >
                  <Ionicons name="barbell" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.textFilterField, { color: colors.text }]}
                    placeholder="Workout name"
                    placeholderTextColor={colors.placeholder}
                    value={workoutNameFilter}
                    onChangeText={setWorkoutNameFilter}
                  />
                  {workoutNameFilter !== "" && (
                    <TouchableOpacity onPress={() => setWorkoutNameFilter("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Date Range
              </Text>
              <View style={styles.dateRangeContainer}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      borderColor: colors.authInputBorder || colors.border,
                      backgroundColor: colors.authInputBg || colors.surface,
                    },
                  ]}
                  onPress={() => setShowDatePicker("start")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {startDate ? startDate.toLocaleDateString() : "Start Date"}
                  </Text>
                  {startDate && (
                    <TouchableOpacity onPress={() => setStartDate(null)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      borderColor: colors.authInputBorder || colors.border,
                      backgroundColor: colors.authInputBg || colors.surface,
                    },
                  ]}
                  onPress={() => setShowDatePicker("end")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {endDate ? endDate.toLocaleDateString() : "End Date"}
                  </Text>
                  {endDate && (
                    <TouchableOpacity onPress={() => setEndDate(null)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Min Duration */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Minimum Duration
              </Text>
              <View
                style={[
                  styles.filterInputContainer,
                  {
                    borderColor: colors.authInputBorder || colors.border,
                    backgroundColor: colors.authInputBg || colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={colors.primary}
                />
                <TextInput
                  style={[styles.filterInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={minDuration}
                  onChangeText={setMinDuration}
                  placeholder="e.g., 30"
                  placeholderTextColor={colors.placeholder}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        filterScrollViewRef.current?.scrollTo({
                          y: 350,
                          animated: true,
                        }),
                      150,
                    )
                  }
                />
                <Text
                  style={[styles.inputSuffix, { color: colors.subtleText }]}
                >
                  min
                </Text>
                {minDuration !== "" && (
                  <TouchableOpacity onPress={() => setMinDuration("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Min Volume */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Minimum Volume
              </Text>
              <View
                style={[
                  styles.filterInputContainer,
                  {
                    borderColor: colors.authInputBorder || colors.border,
                    backgroundColor: colors.authInputBg || colors.surface,
                  },
                ]}
              >
                <Ionicons name="fitness" size={18} color={colors.primary} />
                <TextInput
                  style={[styles.filterInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={minVolume}
                  onChangeText={setMinVolume}
                  placeholder="e.g., 1000"
                  placeholderTextColor={colors.placeholder}
                  onFocus={() =>
                    setTimeout(
                      () =>
                        filterScrollViewRef.current?.scrollTo({
                          y: 450,
                          animated: true,
                        }),
                      150,
                    )
                  }
                />
                <Text
                  style={[styles.inputSuffix, { color: colors.subtleText }]}
                >
                  kg
                </Text>
                {minVolume !== "" && (
                  <TouchableOpacity onPress={() => setMinVolume("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </BottomSheetScrollView>

          <View
            style={[
              styles.sheetFooter,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(16, systemBottomInset + 16) + (keyboardHeight ? keyboardHeight : 0),
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.clearButton,
                {
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: colors.authInputBorder || colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, { color: colors.text }]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.applyButton,
                { overflow: "hidden", borderWidth: 0 },
              ]}
              onPress={() => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                closeFilterSheet();
              }}
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
              <Text
                style={[
                  styles.applyButtonText,
                  { color: "#FFFFFF", position: "relative" },
                ]}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      {/* Edit Bottom Sheet */}
      <BottomSheetModal
        ref={editSheetRef}
        index={0}
        snapPoints={editSnapPoints}
        onChange={(index) => setIsEditModalOpen(index >= 0)}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={styles.sheetContent}>
          <View
            style={[styles.sheetHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Session
            </Text>
            <TouchableOpacity
              onPress={closeEditSheet}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetScrollContent,
              { paddingBottom: 100 },
            ]}
          >
            {editingSession && (
              <>
                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Duration (minutes)
                  </Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        borderColor: colors.authInputBorder || colors.border,
                        backgroundColor: colors.authInputBg || colors.surface,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={editingSession.duration}
                    onChangeText={(text) =>
                      setEditingSession({ ...editingSession, duration: text })
                    }
                    placeholder="Enter duration"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Sets
                  </Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        borderColor: colors.authInputBorder || colors.border,
                        backgroundColor: colors.authInputBg || colors.surface,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={editingSession.sets}
                    onChangeText={(text) =>
                      setEditingSession({ ...editingSession, sets: text })
                    }
                    placeholder="Enter number of sets"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Reps per Set
                  </Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        borderColor: colors.authInputBorder || colors.border,
                        backgroundColor: colors.authInputBg || colors.surface,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={editingSession.reps}
                    onChangeText={(text) =>
                      setEditingSession({ ...editingSession, reps: text })
                    }
                    placeholder="Enter reps"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Weight (kg)
                  </Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        borderColor: colors.authInputBorder || colors.border,
                        backgroundColor: colors.authInputBg || colors.surface,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={editingSession.weight}
                    onChangeText={(text) =>
                      setEditingSession({ ...editingSession, weight: text })
                    }
                    placeholder="Enter weight"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Date & Time
                  </Text>
                  <View style={styles.editDateTimeRow}>
                    <TouchableOpacity
                      style={[
                        styles.editDateTimeButton,
                        {
                          borderColor: colors.authInputBorder || colors.border,
                          backgroundColor: colors.authInputBg || colors.surface,
                        },
                      ]}
                      onPress={() => setShowEditDatePicker(true)}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.editDateTimeText,
                          { color: colors.text },
                        ]}
                      >
                        {editingSession.completedAt.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.editDateTimeButton,
                        {
                          borderColor: colors.authInputBorder || colors.border,
                          backgroundColor: colors.authInputBg || colors.surface,
                        },
                      ]}
                      onPress={() => setShowEditTimePicker(true)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.editDateTimeText,
                          { color: colors.text },
                        ]}
                      >
                        {editingSession.completedAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.editField}>
                  <Text style={[styles.editLabel, { color: colors.text }]}>
                    Notes
                  </Text>
                  <TextInput
                    style={[
                      styles.editNotesInput,
                      {
                        borderColor: colors.authInputBorder || colors.border,
                        backgroundColor: colors.authInputBg || colors.surface,
                        color: colors.text,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    value={editingSession.notes}
                    onChangeText={(text) =>
                      setEditingSession({ ...editingSession, notes: text })
                    }
                    placeholder="Add notes about your workout..."
                    placeholderTextColor={colors.placeholder}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </BottomSheetScrollView>

          <View
            style={[
              styles.sheetFooter,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(16, systemBottomInset + 16),
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: colors.authInputBorder || colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={closeEditSheet}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                { overflow: "hidden", borderWidth: 0 },
              ]}
              onPress={saveEdit}
              disabled={savingEdit}
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
              {savingEdit ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                  style={{ position: "relative" }}
                />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: "#FFFFFF", position: "relative" },
                  ]}
                >
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Delete Bottom Sheet */}
      <BottomSheetModal
        ref={deleteSheetRef}
        index={0}
        snapPoints={deleteSnapPoints}
        onChange={(index) => setIsDeleteModalOpen(index >= 0)}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.deleteSheetContent}>
            <View
              style={[
                styles.deleteIconContainer,
                { backgroundColor: colors.authInputBg || colors.surface },
              ]}
            >
              <Ionicons name="warning-outline" size={48} color="#ef4444" />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>
              Delete Session
            </Text>
            <Text style={[styles.deleteMessage, { color: colors.subtleText }]}>
              Are you sure you want to delete this workout session? This action
              cannot be undone.
            </Text>
            {deletingSession && (
              <Text
                style={[styles.deleteWorkoutName, { color: colors.primary }]}
              >
                {deletingSession.workout?.name ||
                  `Workout #${deletingSession.workoutId}`}
              </Text>
            )}
            <View
              style={[
                styles.deleteButtons,
                { marginBottom: Math.max(0, systemBottomInset) },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  styles.cancelDeleteButton,
                  {
                    backgroundColor: colors.authInputBg || colors.surface,
                    borderColor: colors.authInputBorder || colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={closeDeleteSheet}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  styles.confirmDeleteButton,
                  { overflow: "hidden", borderWidth: 0 },
                ]}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FF3B30", "#FF1100"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text
                  style={[
                    styles.confirmDeleteText,
                    { color: "#FFFFFF", position: "relative" },
                  ]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Date Pickers */}
      {showDatePicker === "start" && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(null);
            if (date) setStartDate(date);
          }}
        />
      )}
      {showDatePicker === "end" && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(null);
            if (date) setEndDate(date);
          }}
        />
      )}
      {showEditDatePicker && (
        <DateTimePicker
          value={editingSession?.completedAt || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEditDateChange}
        />
      )}
      {showEditTimePicker && (
        <DateTimePicker
          value={editingSession?.completedAt || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEditTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  filterHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterHeaderText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  // Active filter chips
  activeFilters: { borderBottomWidth: 1, paddingVertical: 8 },
  activeFiltersContent: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: { fontSize: 12, fontWeight: "500" },

  // List
  listContent: { padding: 16, flexGrow: 1 },

  // Session card
  sessionCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  imageContainer: {
    position: "relative",
  },
  sessionImage: { width: "100%", height: 140 },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  sessionContent: {
    padding: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sessionTitleContainer: { flex: 1, marginRight: 12 },
  workoutName: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  workoutTags: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  tagText: { fontSize: 10, fontWeight: "600" },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  actionButtons: { flexDirection: "row", gap: 8 },
  actionButton: { padding: 8, borderRadius: 10 },
  sessionDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: "22%",
  },
  detailIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { fontSize: 13, fontWeight: "500" },
  notesContainer: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  notesText: { flex: 1, fontSize: 12, fontStyle: "italic", lineHeight: 16 },

  // Empty / footer
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  emptySubText: { fontSize: 14, marginTop: 8, textAlign: "center" },
  loaderFooter: { paddingVertical: 20, alignItems: "center" },
  paginationInfo: {
    textAlign: "center",
    fontSize: 12,
    paddingBottom: 16,
    paddingTop: 8,
  },

  // Bottom Sheet styles
  sheetContent: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  sheetScrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },

  // Filter
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  filterInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  filterInput: { flex: 1, fontSize: 16 },
  inputSuffix: { fontSize: 14, fontWeight: "500" },
  textFilterContainer: { gap: 12 },
  textFilterInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textFilterField: { flex: 1, fontSize: 16 },
  dateRangeContainer: { gap: 12 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateButtonText: { flex: 1, fontSize: 15 },

  // Shared buttons
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "600" },
  clearButton: { borderWidth: 1 },
  clearButtonText: { fontSize: 16, fontWeight: "600" },
  applyButton: {},
  applyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: {},
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  // Edit
  editField: { marginBottom: 20 },
  editLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  editNotesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  editDateTimeRow: { flexDirection: "row", gap: 12 },
  editDateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  editDateTimeText: { fontSize: 14 },

  // Delete
  deleteSheetContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  deleteTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  deleteMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteWorkoutName: { fontSize: 16, fontWeight: "600", marginBottom: 24 },
  deleteButtons: { flexDirection: "row", gap: 12, width: "100%" },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelDeleteButton: { borderWidth: 1 },
  cancelDeleteText: { fontSize: 16, fontWeight: "600" },
  confirmDeleteButton: {},
  confirmDeleteText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  // Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 5,
    borderTopWidth: 1,
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  navButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  pageNumberActive: {
    opacity: 1,
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pageNumberDots: {
    paddingHorizontal: 8,
  },
  pageInfo: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 15,
    paddingTop: 4,
  },
});
