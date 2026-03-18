import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { workoutSessionService, type WorkoutSession, type CreateWorkoutSessionData } from '../services/workoutSessionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

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
  const { colors } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  
  const modalBottomPadding = systemBottomInset + 16;
  const deleteModalBottomMargin = systemBottomInset + 20;

  // State
  const [sessions, setSessions] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Filter state
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [minDuration, setMinDuration] = useState<string>('');
  const [minVolume, setMinVolume] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  // Text filters
  const [bodyPartFilter, setBodyPartFilter] = useState<string>('');
  const [targetAreaFilter, setTargetAreaFilter] = useState<string>('');
  const [workoutNameFilter, setWorkoutNameFilter] = useState<string>('');

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<EditSessionData | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingSession, setDeletingSession] = useState<WorkoutSessionWithDetails | null>(null);

  // Load sessions when filters or page change
  useEffect(() => {
    loadSessions();
  }, [pagination.page, selectedWorkoutId, startDate, endDate, minDuration, minVolume]);

  const loadSessions = async () => {
    try {
      if (!token) return;

      setLoading(true);

      // Build params as API expects
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedWorkoutId) params.workoutId = selectedWorkoutId;
      if (startDate) params.startDate = startDate.toISOString().split('T')[0];
      if (endDate) params.endDate = endDate.toISOString().split('T')[0];
      if (minDuration) params.minDuration = parseInt(minDuration);
      if (minVolume) params.minVolume = parseFloat(minVolume);

      const response = await workoutSessionService.getWorkoutSessions(token, params);

      if (response?.success) {
        setSessions(response.data || []);
        setPagination(response.pagination || {
          total: response.data?.length || 0,
          page: 1,
          limit: pagination.limit,
          totalPages: 1,
        });
      } else {
        showErrorToast({
          title: 'Error',
          message: response?.message || 'Failed to load workout sessions',
        });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      showErrorToast({
        title: 'Error',
        message: getErrorMessage(error) || 'Failed to load workout sessions',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadSessions();
  }, []);

  const clearFilters = () => {
    setSelectedWorkoutId(null);
    setBodyPartFilter('');
    setTargetAreaFilter('');
    setWorkoutNameFilter('');
    setStartDate(null);
    setEndDate(null);
    setMinDuration('');
    setMinVolume('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilterModal(false);
    
    showInfoToast({
      title: 'Filters Cleared',
      message: 'All filters have been reset',
    });
  };

  const loadMore = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handleEditPress = (session: WorkoutSessionWithDetails) => {
    setEditingSession({
      id: session.id,
      duration: session.duration.toString(),
      sets: session.sets.toString(),
      reps: session.reps.toString(),
      weight: session.weight.toString(),
      notes: session.notes || '',
      completedAt: new Date(session.completedAt),
    });
    setEditModalVisible(true);
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
      showErrorToast({ title: 'Validation Error', message: 'Duration must be a positive number' });
      return;
    }
    if (!editingSession.sets || parseInt(editingSession.sets) <= 0) {
      showErrorToast({ title: 'Validation Error', message: 'Sets must be a positive number' });
      return;
    }
    if (!editingSession.reps || parseInt(editingSession.reps) <= 0) {
      showErrorToast({ title: 'Validation Error', message: 'Reps must be a positive number' });
      return;
    }
    if (!editingSession.weight || parseFloat(editingSession.weight) < 0) {
      showErrorToast({ title: 'Validation Error', message: 'Weight cannot be negative' });
      return;
    }

    setSavingEdit(true);
    try {
      const volume = parseInt(editingSession.sets) * parseInt(editingSession.reps) * parseFloat(editingSession.weight);
      
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
        token
      );

      if (response.success) {
        showSuccessToast({
          title: 'Success',
          message: 'Workout session updated successfully',
        });
        setEditModalVisible(false);
        loadSessions();
      } else {
        showErrorToast({
          title: 'Error',
          message: response.message || 'Failed to update session',
        });
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      showErrorToast({
        title: 'Error',
        message: getErrorMessage(error) || 'Failed to update session',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePress = (session: WorkoutSessionWithDetails) => {
    setDeletingSession(session);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingSession || !token) return;

    try {
      const response = await workoutSessionService.deleteWorkoutSession(deletingSession.id, token);

      if (response.success) {
        showSuccessToast({
          title: 'Success',
          message: 'Workout session deleted successfully',
        });
        setDeleteModalVisible(false);
        setDeletingSession(null);
        
        if (sessions.length === 1 && pagination.page > 1) {
          setPagination(prev => ({ ...prev, page: prev.page - 1 }));
        } else {
          loadSessions();
        }
      } else {
        showErrorToast({
          title: 'Error',
          message: response.message || 'Failed to delete session',
        });
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      showErrorToast({
        title: 'Error',
        message: getErrorMessage(error) || 'Failed to delete session',
      });
    }
  };

  const filterSessionsByText = (sessions: WorkoutSessionWithDetails[]) => {
    return sessions.filter(session => {
      const workout = session.workout;
      if (!workout) return true;

      const matchesBodyPart = !bodyPartFilter || 
        workout.body_part?.toLowerCase().includes(bodyPartFilter.toLowerCase());
      
      const matchesTargetArea = !targetAreaFilter || 
        workout.target_area?.toLowerCase().includes(targetAreaFilter.toLowerCase());
      
      const matchesName = !workoutNameFilter || 
        workout.name?.toLowerCase().includes(workoutNameFilter.toLowerCase());

      return matchesBodyPart && matchesTargetArea && matchesName;
    });
  };

  const renderSessionItem = ({ item }: { item: WorkoutSessionWithDetails }) => {
    const date = new Date(item.completedAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {item.workout?.gif_link && (
          <Image source={{ uri: item.workout.gif_link }} style={styles.sessionImage} />
        )}
        
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleContainer}>
            <Text style={[styles.workoutName, { color: colors.text }]} numberOfLines={1}>
              {item.workout?.name || `Workout #${item.workoutId}`}
            </Text>
            <View style={styles.workoutTags}>
              {item.workout?.body_part && (
                <View style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{item.workout.body_part}</Text>
                </View>
              )}
              {item.workout?.target_area && (
                <View style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{item.workout.target_area}</Text>
                </View>
              )}
            </View>
            <View style={styles.sessionMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.subtleText }]}>{formattedDate}</Text>
              <Ionicons name="time-outline" size={14} color={colors.primary} style={styles.metaIcon} />
              <Text style={[styles.metaText, { color: colors.subtleText }]}>{formattedTime}</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleEditPress(item)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
              onPress={() => handleDeletePress(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="repeat" size={16} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.sets} sets × {item.reps} reps
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="barbell" size={16} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.weight} kg
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="fitness" size={16} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.volume} kg total
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="timer" size={16} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.duration} min
            </Text>
          </View>
        </View>

        {item.notes && (
          <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={[styles.notesText, { color: colors.subtleText }]} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
      // @ts-ignore
      navigationBarTranslucent={true}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Workout History</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Text Filters Section */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Filter by Text</Text>
                  
                  <View style={styles.textFilterContainer}>
                    <View style={[styles.textFilterInput, { borderColor: colors.border }]}>
                      <Ionicons name="body" size={16} color={colors.primary} />
                      <TextInput
                        style={[styles.textFilterField, { color: colors.text }]}
                        placeholder="Body part (e.g., chest)"
                        placeholderTextColor={colors.placeholder}
                        value={bodyPartFilter}
                        onChangeText={setBodyPartFilter}
                      />
                      {bodyPartFilter !== '' && (
                        <TouchableOpacity onPress={() => setBodyPartFilter('')}>
                          <Ionicons name="close-circle" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[styles.textFilterInput, { borderColor: colors.border }]}>
                      <Ionicons name="locate" size={16} color={colors.primary} />
                      <TextInput
                        style={[styles.textFilterField, { color: colors.text }]}
                        placeholder="Target area (e.g., upper chest)"
                        placeholderTextColor={colors.placeholder}
                        value={targetAreaFilter}
                        onChangeText={setTargetAreaFilter}
                      />
                      {targetAreaFilter !== '' && (
                        <TouchableOpacity onPress={() => setTargetAreaFilter('')}>
                          <Ionicons name="close-circle" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[styles.textFilterInput, { borderColor: colors.border }]}>
                      <Ionicons name="barbell" size={16} color={colors.primary} />
                      <TextInput
                        style={[styles.textFilterField, { color: colors.text }]}
                        placeholder="Workout name"
                        placeholderTextColor={colors.placeholder}
                        value={workoutNameFilter}
                        onChangeText={setWorkoutNameFilter}
                      />
                      {workoutNameFilter !== '' && (
                        <TouchableOpacity onPress={() => setWorkoutNameFilter('')}>
                          <Ionicons name="close-circle" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* Date Range Filter */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Date Range</Text>
                  <View style={styles.dateRangeContainer}>
                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: colors.border }]}
                      onPress={() => setShowDatePicker('start')}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>
                        {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                      </Text>
                      {startDate && (
                        <TouchableOpacity onPress={() => setStartDate(null)}>
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dateButton, { borderColor: colors.border }]}
                      onPress={() => setShowDatePicker('end')}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>
                        {endDate ? endDate.toLocaleDateString() : 'End Date'}
                      </Text>
                      {endDate && (
                        <TouchableOpacity onPress={() => setEndDate(null)}>
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Min Duration Filter */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Min Duration (minutes)</Text>
                  <View style={[styles.filterInputContainer, { borderColor: colors.border }]}>
                    <Ionicons name="timer-outline" size={16} color={colors.primary} />
                    <TextInput
                      style={[styles.filterInput, { color: colors.text }]}
                      keyboardType="numeric"
                      value={minDuration}
                      onChangeText={setMinDuration}
                      placeholder="e.g., 30"
                      placeholderTextColor={colors.placeholder}
                    />
                    {minDuration !== '' && (
                      <TouchableOpacity onPress={() => setMinDuration('')}>
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Min Volume Filter */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Min Volume (kg)</Text>
                  <View style={[styles.filterInputContainer, { borderColor: colors.border }]}>
                    <Ionicons name="fitness" size={16} color={colors.primary} />
                    <TextInput
                      style={[styles.filterInput, { color: colors.text }]}
                      keyboardType="numeric"
                      value={minVolume}
                      onChangeText={setMinVolume}
                      placeholder="e.g., 1000"
                      placeholderTextColor={colors.placeholder}
                    />
                    {minVolume !== '' && (
                      <TouchableOpacity onPress={() => setMinVolume('')}>
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border, paddingBottom: modalBottomPadding }]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.clearButton, { borderColor: colors.border }]}
                  onPress={clearFilters}
                >
                  <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.applyButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setPagination(prev => ({ ...prev, page: 1 }));
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
      // @ts-ignore
      navigationBarTranslucent={true}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.editModalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Workout Session</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editModalScroll}>
                {editingSession && (
                  <>
                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Duration (minutes)</Text>
                      <TextInput
                        style={[styles.editInput, { borderColor: colors.border, color: colors.text }]}
                        keyboardType="numeric"
                        value={editingSession.duration}
                        onChangeText={(text) => setEditingSession({ ...editingSession, duration: text })}
                        placeholder="Enter duration"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Sets</Text>
                      <TextInput
                        style={[styles.editInput, { borderColor: colors.border, color: colors.text }]}
                        keyboardType="numeric"
                        value={editingSession.sets}
                        onChangeText={(text) => setEditingSession({ ...editingSession, sets: text })}
                        placeholder="Enter number of sets"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Reps per Set</Text>
                      <TextInput
                        style={[styles.editInput, { borderColor: colors.border, color: colors.text }]}
                        keyboardType="numeric"
                        value={editingSession.reps}
                        onChangeText={(text) => setEditingSession({ ...editingSession, reps: text })}
                        placeholder="Enter reps"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Weight (kg)</Text>
                      <TextInput
                        style={[styles.editInput, { borderColor: colors.border, color: colors.text }]}
                        keyboardType="numeric"
                        value={editingSession.weight}
                        onChangeText={(text) => setEditingSession({ ...editingSession, weight: text })}
                        placeholder="Enter weight"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Date & Time</Text>
                      <View style={styles.editDateTimeRow}>
                        <TouchableOpacity
                          style={[styles.editDateTimeButton, { borderColor: colors.border }]}
                          onPress={() => setShowEditDatePicker(true)}
                        >
                          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                          <Text style={[styles.editDateTimeText, { color: colors.text }]}>
                            {editingSession.completedAt.toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.editDateTimeButton, { borderColor: colors.border }]}
                          onPress={() => setShowEditTimePicker(true)}
                        >
                          <Ionicons name="time-outline" size={16} color={colors.primary} />
                          <Text style={[styles.editDateTimeText, { color: colors.text }]}>
                            {editingSession.completedAt.toLocaleTimeString()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.editField}>
                      <Text style={[styles.editLabel, { color: colors.text }]}>Notes</Text>
                      <TextInput
                        style={[styles.editNotesInput, { borderColor: colors.border, color: colors.text }]}
                        multiline
                        numberOfLines={3}
                        value={editingSession.notes}
                        onChangeText={(text) => setEditingSession({ ...editingSession, notes: text })}
                        placeholder="Add notes"
                        placeholderTextColor={colors.placeholder}
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border, paddingBottom: modalBottomPadding }]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={saveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>

              {showEditDatePicker && (
                <DateTimePicker
                  value={editingSession?.completedAt || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEditDateChange}
                />
              )}

              {showEditTimePicker && (
                <DateTimePicker
                  value={editingSession?.completedAt || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEditTimeChange}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      visible={deleteModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDeleteModalVisible(false)}
      // @ts-ignore
      navigationBarTranslucent={true}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.deleteModalContent, { backgroundColor: colors.background, marginBottom: deleteModalBottomMargin }]}>
              <Ionicons name="warning-outline" size={48} color="#ef4444" />
              <Text style={[styles.deleteTitle, { color: colors.text }]}>Delete Workout Session</Text>
              <Text style={[styles.deleteMessage, { color: colors.subtleText }]}>
                Are you sure you want to delete this workout session? This action cannot be undone.
              </Text>
              {deletingSession && (
                <Text style={[styles.deleteWorkoutName, { color: colors.primary }]}>
                  {deletingSession.workout?.name || `Workout #${deletingSession.workoutId}`}
                </Text>
              )}
              <View style={styles.deleteButtons}>
                <TouchableOpacity
                  style={[styles.deleteButton, styles.cancelDeleteButton, { borderColor: colors.border }]}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteButton, styles.confirmDeleteButton, { backgroundColor: '#ef4444' }]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderDatePickers = () => (
    <>
      {showDatePicker === 'start' && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(null);
            if (date) setStartDate(date);
          }}
        />
      )}
      {showDatePicker === 'end' && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(null);
            if (date) setEndDate(date);
          }}
        />
      )}
    </>
  );

  // Apply text filters to sessions
  const filteredSessions = filterSessionsByText(sessions);

  if (loading && !refreshing && sessions.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFill} />

      {/* Header with filter button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workout History</Text>
        <TouchableOpacity
          style={[styles.filterHeaderButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#FFFFFF" />
          <Text style={styles.filterHeaderText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Active filters display */}
      {(bodyPartFilter || targetAreaFilter || workoutNameFilter || startDate || endDate || minDuration || minVolume) && (
        <View style={[styles.activeFilters, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.activeFiltersContent}>
              {bodyPartFilter && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    Body: {bodyPartFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setBodyPartFilter('')}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {targetAreaFilter && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    Target: {targetAreaFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setTargetAreaFilter('')}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {workoutNameFilter && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    Name: {workoutNameFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setWorkoutNameFilter('')}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {startDate && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    From: {startDate.toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => setStartDate(null)}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {endDate && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    To: {endDate.toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => setEndDate(null)}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {minDuration && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    Min {minDuration} min
                  </Text>
                  <TouchableOpacity onPress={() => setMinDuration('')}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {minVolume && (
                <View style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                    Min {minVolume} kg
                  </Text>
                  <TouchableOpacity onPress={() => setMinVolume('')}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredSessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No workout sessions found</Text>
            <Text style={[styles.emptySubText, { color: colors.subtleText }]}>
              {(bodyPartFilter || targetAreaFilter || workoutNameFilter || startDate || endDate || minDuration || minVolume)
                ? 'Try clearing your filters'
                : 'Start your first workout to see it here!'}
            </Text>
          </View>
        }
        ListFooterComponent={
          pagination.page < pagination.totalPages ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* Pagination Info */}
      {filteredSessions.length > 0 && (
        <Text style={[styles.paginationInfo, { color: colors.subtleText }]}>
          Showing {filteredSessions.length} of {pagination.total} sessions
        </Text>
      )}

      {/* Modals */}
      {renderFilterModal()}
      {renderEditModal()}
      {renderDeleteModal()}
      {renderDatePickers()}
    </View>
  );
}

// Keep all the styles from the previous version
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  filterHeaderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilters: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  sessionCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionImage: {
    width: '100%',
    height: 150,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  sessionTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  workoutTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    marginLeft: 2,
    marginRight: 8,
  },
  metaIcon: {
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  sessionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  paginationInfo: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  editModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    marginTop: 50,
  },
  deleteModalContent: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    padding: 16,
  },
  editModalScroll: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
  },
  textFilterContainer: {
    gap: 8,
  },
  textFilterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  textFilterField: {
    flex: 1,
    fontSize: 14,
  },
  dateRangeContainer: {
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#FFD700',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FFD700',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Edit Modal Styles
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  editNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  editDateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editDateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  editDateTimeText: {
    fontSize: 13,
  },
  // Delete Modal Styles
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteWorkoutName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelDeleteButton: {
    borderWidth: 1,
  },
  cancelDeleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});