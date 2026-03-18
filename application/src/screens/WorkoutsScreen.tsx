import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { workoutService, savedWorkoutService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

interface Workout {
  id: number;
  name: string;
  body_part: string;
  target_area: string;
  equipment: string | null;
  level: string;
  description: string | null;
  gif_link: string;
  isSaved?: boolean;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface WorkoutFilters {
  bodyParts: string[];
  targetAreas: string[];
  equipment: string[];
  levels: string[];
}

const WorkoutsScreen = () => {
  const { token } = useAuth();
  const { theme, colors } = useTheme();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<WorkoutFilters>({
    bodyParts: [],
    targetAreas: [],
    equipment: [],
    levels: [],
  });

  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [selectedTargetArea, setSelectedTargetArea] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<
    'bodyPart' | 'targetArea' | 'equipment' | 'level' | null
  >(null);

  // aliases to support both old/new service names
  const checkWorkoutSavedFn =
    savedWorkoutService.checkWorkoutIsInSavedList ||
    savedWorkoutService.CheckWorkoutIsInSavedList;

  const addWorkoutSavedFn =
    savedWorkoutService.addWorkoutToSaveList ||
    savedWorkoutService.AddWorkoutToSaveList;

  const loadFilters = useCallback(async () => {
    try {
      if (!token) return;

      const response = await workoutService.getWorkoutFilters(token);

      if (response?.success) {
        const cleanEquipment = (response.data?.equipment || []).filter(
          (item: string | null) => item !== null
        );

        setFilters({
          bodyParts: response.data?.bodyParts || [],
          targetAreas: response.data?.targetAreas || [],
          equipment: cleanEquipment,
          levels: response.data?.levels || [],
        });
      } else {
        showErrorToast({
          title: 'Filters Error',
          message: response?.message || 'Failed to load workout filters',
        });
      }
    } catch (error: unknown) {
      console.error('Failed to load filters:', error);

      showErrorToast({
        title: 'Filters Error',
        message: getErrorMessage(error) || 'Failed to load workout filters',
      });
    }
  }, [token]);

  const loadWorkouts = useCallback(async () => {
    try {
      if (!token) return;

      setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedBodyPart) params.body_part = selectedBodyPart;
      if (selectedTargetArea) params.target_area = selectedTargetArea;
      if (selectedEquipment) params.equipment = selectedEquipment;
      if (selectedLevel) params.level = selectedLevel;

      const result = await workoutService.getWorkouts(token, params);

      if (result?.success) {
        // support multiple response shapes safely
        const workoutList: Workout[] = Array.isArray(result?.data)
          ? result.data
          : result?.data?.workouts || [];

        const paginationData = result?.pagination || result?.data?.pagination;

        // Check saved status for each workout in parallel
        const workoutsWithSavedStatus = await Promise.all(
          workoutList.map(async (workout: Workout) => {
            try {
              const res = await checkWorkoutSavedFn(workout.id, token);
              const isSaved = !!res?.data?.isSaved;
              return { ...workout, isSaved };
            } catch (error) {
              console.error(
                `Failed to check saved status for workout ${workout.id}:`,
                error
              );
              return { ...workout, isSaved: false };
            }
          })
        );

        setWorkouts(workoutsWithSavedStatus);

        if (paginationData) {
          setPagination({
            total: paginationData.total || 0,
            page: paginationData.page || 1,
            limit: paginationData.limit || pagination.limit,
            totalPages: paginationData.totalPages || 0,
          });
        } else {
          const total = workoutsWithSavedStatus.length;
          const totalPages = Math.max(Math.ceil(total / pagination.limit), 1);

          setPagination((prev) => ({
            ...prev,
            total,
            totalPages,
          }));
        }

        if (
          workoutsWithSavedStatus.length === 0 &&
          (selectedBodyPart ||
            selectedTargetArea ||
            selectedEquipment ||
            selectedLevel)
        ) {
          showInfoToast({
            title: 'No Results',
            message: 'No workouts match the selected filters',
          });
        }
      } else {
        showErrorToast({
          title: 'Load Failed',
          message: result?.message || 'Failed to load workouts',
        });
        setWorkouts([]);
      }
    } catch (error: unknown) {
      console.error('Failed to load workouts:', error);

      showErrorToast({
        title: 'Load Failed',
        message: getErrorMessage(error) || 'Failed to load workouts',
      });

      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    pagination.page,
    pagination.limit,
    selectedBodyPart,
    selectedTargetArea,
    selectedEquipment,
    selectedLevel,
    checkWorkoutSavedFn,
  ]);

  // Load filters on mount
  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Load workouts when filters/page change
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const clearFilters = () => {
    setSelectedBodyPart('');
    setSelectedTargetArea('');
    setSelectedEquipment('');
    setSelectedLevel('');
    setPagination((prev) => ({ ...prev, page: 1 }));

    showInfoToast({
      title: 'Filters Cleared',
      message: 'All workout filters have been reset',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && page !== pagination.page) {
      setPagination((prev) => ({ ...prev, page }));
    }
  };

  const goToNextPage = () => goToPage(pagination.page + 1);
  const goToPreviousPage = () => goToPage(pagination.page - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(pagination.totalPages);

  const handleSaveWorkout = async (workout: Workout) => {
    try {
      if (!token) {
        showErrorToast({
          title: 'Authentication Error',
          message: 'You need to be logged in to save workouts',
        });
        return;
      }

      if (workout.isSaved) {
        showInfoToast({
          title: 'Already Saved',
          message:
            'This workout is already in your saved list. Go to Saved Workouts to remove it.',
        });
        return;
      }

      await addWorkoutSavedFn(workout.id, token);

      setWorkouts((prevWorkouts) =>
        prevWorkouts.map((w) =>
          w.id === workout.id ? { ...w, isSaved: true } : w
        )
      );

      showSuccessToast({
        title: 'Workout Saved',
        message: `"${workout.name}" has been added to your saved workouts`,
      });
    } catch (error: unknown) {
      console.error('Failed to save workout:', error);

      showErrorToast({
        title: 'Save Failed',
        message: getErrorMessage(error) || 'Failed to save workout',
      });
    }
  };

  const renderPageNumbers = () => {
    if (!pagination || pagination.totalPages === 0) return null;

    const pages = [];
    const currentPage = pagination.page;
    const totalPages = pagination.totalPages;

    // Show first page
    if (currentPage > 2) {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
    }

    // Show pages around current page
    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }

    // Show last page
    if (currentPage < totalPages - 1) {
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <Text
            key={`dots-${index}`}
            style={[styles.pageNumberDots, { color: colors.primary }]}
          >
            ...
          </Text>
        );
      }

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

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    return (
      <View
        style={[
          styles.workoutCard,
          { borderColor: colors.border, backgroundColor: colors.card },
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

            <TouchableOpacity
              onPress={() => handleSaveWorkout(item)}
              style={styles.saveButton}
            >
              <Ionicons
                name={item.isSaved ? 'star' : 'star-outline'}
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons
              name="body"
              size={14}
              color={colors.textSecondary}
            />{' '}
            {item.body_part} - {item.target_area}
          </Text>

          {item.equipment && (
            <Text
              style={[styles.workoutDetail, { color: colors.textSecondary }]}
            >
              <Ionicons
                name="barbell"
                size={14}
                color={colors.textSecondary}
              />{' '}
              {item.equipment}
            </Text>
          )}

          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons
              name="trophy"
              size={14}
              color={colors.textSecondary}
            />{' '}
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
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters */}
      <View
        style={[
          styles.filtersContainer,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>
            Filters
          </Text>

          {(selectedBodyPart ||
            selectedTargetArea ||
            selectedEquipment ||
            selectedLevel) && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentFilter('bodyPart');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme === 'dark' ? '#000000' : '#FFFFFF' },
                ]}
              >
                {selectedBodyPart || 'Body Part'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme === 'dark' ? '#000000' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentFilter('targetArea');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme === 'dark' ? '#000000' : '#FFFFFF' },
                ]}
              >
                {selectedTargetArea || 'Target Area'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme === 'dark' ? '#000000' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentFilter('equipment');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme === 'dark' ? '#000000' : '#FFFFFF' },
                ]}
              >
                {selectedEquipment || 'Equipment'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme === 'dark' ? '#000000' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentFilter('level');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme === 'dark' ? '#000000' : '#FFFFFF' },
                ]}
              >
                {selectedLevel || 'Level'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme === 'dark' ? '#000000' : '#FFFFFF'}
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
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select{' '}
                {currentFilter === 'bodyPart'
                  ? 'Body Part'
                  : currentFilter === 'targetArea'
                  ? 'Target Area'
                  : currentFilter === 'equipment'
                  ? 'Equipment'
                  : 'Level'}
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
                  else if (currentFilter === 'targetArea') setSelectedTargetArea('');
                  else if (currentFilter === 'equipment') setSelectedEquipment('');
                  else if (currentFilter === 'level') setSelectedLevel('');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>
                  All
                </Text>
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
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {part}
                    </Text>
                    {selectedBodyPart === part && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {currentFilter === 'targetArea' &&
                filters.targetAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.modalOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedTargetArea(area);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {area}
                    </Text>
                    {selectedTargetArea === area && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {currentFilter === 'equipment' &&
                filters.equipment.map((equip) => (
                  <TouchableOpacity
                    key={equip}
                    style={[styles.modalOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedEquipment(equip);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {equip}
                    </Text>
                    {selectedEquipment === equip && (
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
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {level}
                    </Text>
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {selectedBodyPart ||
              selectedTargetArea ||
              selectedEquipment ||
              selectedLevel
                ? 'No workouts match your filters'
                : 'No workouts found'}
            </Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <>
          <View
            style={[
              styles.paginationContainer,
              { backgroundColor: colors.background, borderTopColor: colors.border },
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

            <View style={styles.pageNumbersContainer}>{renderPageNumbers()}</View>

            <TouchableOpacity
              style={[
                styles.navButton,
                pagination.page === pagination.totalPages &&
                  styles.navButtonDisabled,
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
                pagination.page === pagination.totalPages &&
                  styles.navButtonDisabled,
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

          <Text
            style={[
              styles.pageInfo,
              { color: colors.text, backgroundColor: colors.background },
            ]}
          >
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
            workouts)
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
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
  workoutGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  workoutInfo: {
    marginBottom: 8,
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
  saveButton: {
    padding: 4,
    marginLeft: 8,
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
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
    paddingBottom: 16,
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

export default WorkoutsScreen;