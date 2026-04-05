import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  ScrollView,
  Modal,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { savedWorkoutService, workoutService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';
import SuccessModal from '../components/common/SuccessModal';

import { RootStackParamList } from '../navigation/AppNavigator';

interface Workout {
  id: number;
  name: string;
  body_part: string;
  target_area: string;
  equipment: string | null;
  level: string;
  description: string | null;
  gif_link: string;
}

interface SavedWorkoutItem {
  id: number;
  userId: number;
  workoutId: number;
  createdAt: string;
  updatedAt: string;
  workout: Workout;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SavedWorkoutFilters {
  bodyParts: string[];
  levels: string[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    savedWorkouts: SavedWorkoutItem[];
    pagination: PaginationInfo;
  };
}

const SavedWorkoutsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { token } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkoutItem[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });

  // Filters - only level and body part
  const [filters, setFilters] = useState<SavedWorkoutFilters>({
    bodyParts: [],
    levels: [],
  });
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<'bodyPart' | 'level' | null>(null);
  
  // Deletion Modal state
  const [workoutToRemove, setWorkoutToRemove] = useState<{id: number, name: string} | null>(null);

  // Load filters
  useEffect(() => {
    loadFilters();
  }, []);

  // Load workouts when page or filters change
  useEffect(() => {
    loadSavedWorkouts();
  }, [pagination.page, selectedBodyPart, selectedLevel]);

  const loadFilters = async () => {
    try {
      if (!token) return;

      const response = await workoutService.getWorkoutFilters(token);

      if (response.success) {
        setFilters({
          bodyParts: response.data?.bodyParts || [],
          levels: response.data?.levels || [],
        });
      } else {
        showErrorToast({
          title: 'Filters Error',
          message: response.message || 'Failed to load filters',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to load filters:', error);

      showErrorToast({
        title: 'Filters Error',
        message: getErrorMessage(error) || 'Failed to load filters',
      });
    }
  };

  const loadSavedWorkouts = async () => {
    try {
      if (!token) return;
      setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedBodyPart) params.bodyPart = selectedBodyPart;
      if (selectedLevel) params.level = selectedLevel;

      console.log('Loading saved workouts with params:', params);
      const result: ApiResponse = await savedWorkoutService.getSavedWorkouts(token, params);

      console.log('API Response:', result);

      if (result.success) {
        const savedWorkoutsData = result.data?.savedWorkouts || [];
        setSavedWorkouts(savedWorkoutsData);

        // Extract workout data from saved workouts
        const workoutData = savedWorkoutsData.map((item) => item.workout);
        setWorkouts(workoutData);

        // Safely handle pagination data
        if (result.data?.pagination) {
          setPagination({
            total: result.data.pagination.total || 0,
            page: result.data.pagination.page || 1,
            limit: result.data.pagination.limit || 5,
            totalPages: result.data.pagination.totalPages || 0,
          });
        } else {
          // If no pagination in response, calculate based on data
          const totalPages =
            Math.ceil((savedWorkoutsData.length || 0) / pagination.limit) || 1;

          setPagination((prev) => ({
            ...prev,
            total: savedWorkoutsData.length || 0,
            totalPages,
          }));
        }

        // Optional info toast if no results after filters
        if (
          savedWorkoutsData.length === 0 &&
          (selectedBodyPart || selectedLevel)
        ) {
          showInfoToast({
            title: 'No Results',
            message: 'No saved workouts match the selected filters',
          });
        }
      } else {
        showErrorToast({
          title: 'Load Failed',
          message: result.message || 'Failed to load workouts',
        });

        setSavedWorkouts([]);
        setWorkouts([]);
      }
    } catch (error: unknown) {
      console.error('Failed to load workouts:', error);

      showErrorToast({
        title: 'Load Failed',
        message: getErrorMessage(error) || 'Failed to load workouts',
      });

      setSavedWorkouts([]);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (workout: Workout) => {
    navigation.navigate('WorkoutSession', {
      workoutId: workout.id,
      workoutName: workout.name,
      workoutImage: workout.gif_link,
    });
  };

  const handleDeleteWorkout = (savedWorkoutId: number, workoutName: string) => {
    setWorkoutToRemove({ id: savedWorkoutId, name: workoutName });
  };

  const confirmDeleteWorkout = async () => {
    try {
      if (!workoutToRemove || !token) return;
      const savedWorkoutId = workoutToRemove.id;

      const result = await savedWorkoutService.removeWorkoutFromSaveList(
        savedWorkoutId,
        token
      );

      if (result.success) {
        const removedItem = savedWorkouts.find((item) => item.id === savedWorkoutId);

        setSavedWorkouts((prev) => prev.filter((item) => item.id !== savedWorkoutId));

        if (removedItem) {
          setWorkouts((prev) =>
            prev.filter((workout) => workout.id !== removedItem.workoutId)
          );
        }

        setPagination((prev) => {
          const newTotal = Math.max(prev.total - 1, 0);
          const newTotalPages = Math.max(Math.ceil(newTotal / prev.limit), 1);
          const newPage = Math.min(prev.page, newTotalPages);

          return {
            ...prev,
            total: newTotal,
            totalPages: newTotalPages,
            page: newPage,
          };
        });

        showSuccessToast({
          title: 'Workout Removed',
          message: 'The workout was removed from your saved list',
        });
      } else {
        showErrorToast({
          title: 'Remove Failed',
          message: result.message || 'Failed to remove workout',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to delete workout:', error);

      showErrorToast({
        title: 'Remove Failed',
        message: getErrorMessage(error) || 'Failed to remove workout',
      });
    } finally {
      setWorkoutToRemove(null);
    }
  };

  const clearFilters = () => {
    setSelectedBodyPart('');
    setSelectedLevel('');
    setPagination((prev) => ({ ...prev, page: 1 }));

    showInfoToast({
      title: 'Filters Cleared',
      message: 'All filters have been reset',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedWorkouts();
    setRefreshing(false);
  };

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

      if (showFilterModal) {
        setShowFilterModal(false);
        return true; // Prevent default back behavior
      }

      return false; // Allow default back behavior (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pagination, showFilterModal, goToPage]);

  const renderPageNumbers = () => {
    if (!pagination || pagination.totalPages === 0) return null;

    const pages = [];
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Always show exactly 5 pages (or fewer if totalPages < 5) to keep UI completely static
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
            page === currentPage && [styles.pageNumberActive, { backgroundColor: colors.primary }],
            page !== currentPage && { backgroundColor: colors.primary, opacity: 0.3 },
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

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    const savedWorkoutItem = savedWorkouts.find((sw) => sw.workoutId === item.id);

    return (
      <View
        style={[
          styles.workoutCard,
          { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface, borderWidth: 1 },
        ]}
      >
        {item.gif_link ? (
          <Image source={{ uri: item.gif_link }} style={styles.workoutGif} />
        ) : null}

        <View style={styles.workoutInfo}>
          <View style={styles.workoutNameRow}>
            <Text style={[styles.workoutName, { color: colors.text }]}>
              {item.name}
            </Text>

            {savedWorkoutItem && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteWorkout(savedWorkoutItem.id, item.name)}
              >
                <Ionicons name="trash-outline" size={28} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons name="body" size={14} color={colors.textSecondary} />{' '}
            {item.body_part} - {item.target_area}
          </Text>

          {item.equipment && (
            <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
              <Ionicons name="barbell" size={14} color={colors.textSecondary} />{' '}
              {item.equipment}
            </Text>
          )}

          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons name="trophy" size={14} color={colors.textSecondary} />{' '}
            {item.level}
          </Text>

          {item.description && (
            <Text
              style={[styles.workoutDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}

          {/* Start Session Button */}
          <TouchableOpacity
            style={[styles.startButton, { overflow: 'hidden' }]}
            onPress={() => handleStartSession(item)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, (colors as any).secondary || colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing && workouts.length === 0) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Animated Gradient Background matches WorkoutsScreen */}
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

      {/* Filters Header */}
      <View
        style={[
          styles.filtersContainer,
          { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
        ]}
      >
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>
            Filters
          </Text>

          {(selectedBodyPart || selectedLevel) && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.authInputBg || colors.primary, borderColor: colors.authInputBorder || colors.primary, borderWidth: 1 }]}
              onPress={() => {
                setCurrentFilter('bodyPart');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: colors.text },
                ]}
              >
                {selectedBodyPart || 'Body Part'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.authInputBg || colors.primary, borderColor: colors.authInputBorder || colors.primary, borderWidth: 1 }]}
              onPress={() => {
                setCurrentFilter('level');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: colors.text },
                ]}
              >
                {selectedLevel || 'Level'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select {currentFilter === 'bodyPart' ? 'Body Part' : 'Level'}
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (currentFilter === 'bodyPart') setSelectedBodyPart('');
                  else if (currentFilter === 'level') setSelectedLevel('');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>All</Text>
              </TouchableOpacity>

              {currentFilter === 'bodyPart' &&
                filters.bodyParts.map((part) => (
                  <TouchableOpacity
                    key={part}
                    style={[styles.modalOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedBodyPart(part);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{part}</Text>
                    {selectedBodyPart === part && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {currentFilter === 'level' &&
                filters.levels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.modalOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedLevel(level);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{level}</Text>
                    {selectedLevel === level && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: pagination && pagination.totalPages > 1 ? 16 : Math.max(insets.bottom + 20, 20) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {selectedBodyPart || selectedLevel
                ? 'No saved workouts match your filters'
                : 'No saved workouts found'}
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              Save workouts to see them here
            </Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
          <View
            style={[
              styles.paginationContainer,
              { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 16, marginHorizontal: 10, marginTop: 10, paddingVertical: 10 },
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

          <Text style={[styles.pageInfo, { color: colors.text }]}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} workouts)
          </Text>
        </View>
      )}

      {/* Confirmation Modal for Deletion */}
      <SuccessModal
        visible={!!workoutToRemove}
        title="Remove Workout"
        message={`Are you sure you want to remove "${workoutToRemove?.name}" from your saved workouts?`}
        primaryButtonText="Remove"
        onPrimaryPress={confirmDeleteWorkout}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setWorkoutToRemove(null)}
        iconName="trash-outline"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: { position: 'absolute', top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: 'absolute', top: '30%', left: '-20%', width: 150, height: 150, borderRadius: 75 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 16,
  },
  workoutCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  workoutNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  workoutGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  workoutInfo: {
    marginBottom: 8,
  },
  workoutDetail: {
    fontSize: 14,
    marginBottom: 6,
  },
  workoutDescription: {
    fontSize: 13,
    marginTop: 12,
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 8,
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
    paddingBottom: 16,
    paddingTop: 0,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    maxWidth: 180,
  },
  filterButtonText: {
    fontSize: 14,
    marginRight: 6,
    flexShrink: 1,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
});

export default SavedWorkoutsScreen;