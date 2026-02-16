import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { savedWorkoutService, workoutService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

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
  const { token } = useAuth();
  const { theme, colors } = useTheme();
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
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
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
        const workoutData = savedWorkoutsData.map(item => item.workout);
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
          const totalPages = Math.ceil((savedWorkoutsData.length || 0) / pagination.limit) || 1;
          setPagination(prev => ({
            ...prev,
            total: savedWorkoutsData.length || 0,
            totalPages: totalPages,
          }));
        }
      } else {
        // Handle API error
        Alert.alert('Error', result.message || 'Failed to load workouts');
        setSavedWorkouts([]);
        setWorkouts([]);
      }
    } catch (error: any) {
      console.error('Failed to load workouts:', error);
      Alert.alert('Error', error.message || 'Failed to load workouts');
      setSavedWorkouts([]);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = (savedWorkoutId: number, workoutName: string) => {
    Alert.alert(
      'Remove Workout',
      `Are you sure you want to remove "${workoutName}" from saved workouts?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteWorkout(savedWorkoutId),
        },
      ]
    );
  };

  const deleteWorkout = async (savedWorkoutId: number) => {
    try {
      if (!token) return;
      
      const result = await savedWorkoutService.removeWorkoutFromSaveList(savedWorkoutId, token);
      
      if (result.success) {
        // Remove from local state
        setSavedWorkouts(prev => prev.filter(item => item.id !== savedWorkoutId));
        setWorkouts(prev => prev.filter(workout => 
          !prev.find(item => item.id === workout.id && 
            savedWorkouts.find(sw => sw.id === savedWorkoutId && sw.workoutId === workout.id)
          )
        ));
        
        // Update pagination total
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / prev.limit),
        }));
        
        // If we're on a page that no longer exists, go to last page
        if (pagination.page > Math.ceil((pagination.total - 1) / pagination.limit)) {
          setPagination(prev => ({
            ...prev,
            page: Math.max(1, Math.ceil((prev.total - 1) / prev.limit)),
          }));
        }
        
        Alert.alert('Success', 'Workout removed from saved workouts');
      } else {
        Alert.alert('Error', result.message || 'Failed to remove workout');
      }
    } catch (error: any) {
      console.error('Failed to delete workout:', error);
      Alert.alert('Error', error.message || 'Failed to remove workout');
    }
  };

  const clearFilters = () => {
    setSelectedBodyPart('');
    setSelectedLevel('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedWorkouts();
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
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
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
          <Text key={`dots-${index}`} style={[styles.pageNumberDots, { color: colors.primary }]}>
            ...
          </Text>
        );
      }

      return (
        <TouchableOpacity
          key={page}
          style={[
            styles.pageNumber,
            page === currentPage && [styles.pageNumberActive, { backgroundColor: colors.primary }],
            page !== currentPage && { backgroundColor: colors.primary, opacity: 0.3 }
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
    // Find the saved workout item that contains this workout
    const savedWorkoutItem = savedWorkouts.find(sw => sw.workoutId === item.id);
    
    return (
      <View style={[styles.workoutCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.workoutHeader}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{item.name}</Text>
          {savedWorkoutItem && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteWorkout(savedWorkoutItem.id, item.name)}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
        
        {item.gif_link && (
          <Image source={{ uri: item.gif_link }} style={styles.workoutGif} />
        )}
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons name="body" size={14} color={colors.textSecondary} /> {item.body_part} - {item.target_area}
          </Text>
          {item.equipment && (
            <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
              <Ionicons name="barbell" size={14} color={colors.textSecondary} /> {item.equipment}
            </Text>
          )}
          <Text style={[styles.workoutDetail, { color: colors.textSecondary }]}>
            <Ionicons name="trophy" size={14} color={colors.textSecondary} /> {item.level}
          </Text>
          {item.description && (
            <Text style={[styles.workoutDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters - Only Body Part and Level */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>
          {(selectedBodyPart || selectedLevel) && (
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
              <Text style={[styles.filterButtonText, { color: theme === 'dark' ? '#000000' : '#FFFFFF' }]}>
                {selectedBodyPart || 'Body Part'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme === 'dark' ? '#000000' : '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentFilter('level');
                setShowFilterModal(true);
              }}
            >
              <Text style={[styles.filterButtonText, { color: theme === 'dark' ? '#000000' : '#FFFFFF' }]}>
                {selectedLevel || 'Level'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme === 'dark' ? '#000000' : '#FFFFFF'} />
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
              {currentFilter === 'bodyPart' && filters.bodyParts.map((part) => (
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
              {currentFilter === 'level' && filters.levels.map((level) => (
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No saved workouts found</Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              Save workouts to see them here
            </Text>
          </View>
        }
      />

      {/* Pagination Controls - Only show if we have pagination data */}
      {pagination && pagination.totalPages > 1 && (
        <>
          <View style={[styles.paginationContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.navButton, pagination.page === 1 && styles.navButtonDisabled]}
              onPress={goToFirstPage}
              disabled={pagination.page === 1}
            >
              <Ionicons name="play-back" size={20} color={pagination.page === 1 ? colors.textSecondary : colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, pagination.page === 1 && styles.navButtonDisabled]}
              onPress={goToPreviousPage}
              disabled={pagination.page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={pagination.page === 1 ? colors.textSecondary : colors.primary} />
            </TouchableOpacity>

            <View style={styles.pageNumbersContainer}>{renderPageNumbers()}</View>

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
                color={pagination.page === pagination.totalPages ? colors.textSecondary : colors.primary}
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
                color={pagination.page === pagination.totalPages ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageInfo, { color: colors.text, backgroundColor: colors.background }]}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} workouts)
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
    flexGrow: 1,
  },
  workoutCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  workoutHeader: {
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
    marginRight: 12,
  },
  deleteButton: {
    padding: 4,
  },
  workoutGif: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
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
  },
  pageNumberTextActive: {
    fontWeight: 'bold',
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