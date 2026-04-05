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
  TextInput,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation } from '@react-navigation/native';
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
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { token } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { systemBottomInset } = useSystemNavigation();
  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false); // don't start true to avoid double flickers if undefined token
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keep a stable reference to token to avoid re-fetching when token refreshes automatically
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  });

  // Search state - separate input value from actual search query
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);

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
      if (!tokenRef.current) return;

      const response = await workoutService.getWorkoutFilters(tokenRef.current);

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
  }, []); // Remove token from dependencies

  const loadWorkouts = useCallback(async () => {
    try {
      if (!tokenRef.current) return;

      // Only show spinner if we don't have workouts, to avoid screen flashes
      if (workouts.length === 0) setLoading(true);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (selectedBodyPart) params.body_part = selectedBodyPart;
      if (selectedTargetArea) params.target_area = selectedTargetArea;
      if (selectedEquipment) params.equipment = selectedEquipment;
      if (selectedLevel) params.level = selectedLevel;
      if (searchQuery) params.search = searchQuery;

      const result = await workoutService.getWorkouts(tokenRef.current, params);

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
              const res = await checkWorkoutSavedFn(workout.id, tokenRef.current!);
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
            selectedLevel ||
            searchQuery)
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
      setIsSearching(false);
      setInitialLoad(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    selectedBodyPart,
    selectedTargetArea,
    selectedEquipment,
    selectedLevel,
    searchQuery,
    checkWorkoutSavedFn,
  ]);

  // Load filters on mount
  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Load workouts when filters/page/search change
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

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
      return false; // Allow default back behavior (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pagination, goToPage]);

  // Handle search with debounce - only updates searchQuery after user stops typing
  const handleSearchChange = (text: string) => {
    setSearchInput(text);
    setIsSearching(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout to update search query after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
      setPagination((prev) => ({ ...prev, page: 1 }));
      setIsSearching(false);
    }, 100);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPagination((prev) => ({ ...prev, page: 1 }));
    
    showInfoToast({
      title: 'Search Cleared',
      message: 'Search filter has been cleared',
    });
  };

  const clearFilters = () => {
    setSelectedBodyPart('');
    setSelectedTargetArea('');
    setSelectedEquipment('');
    setSelectedLevel('');
    setSearchInput('');
    setSearchQuery('');
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

  const handleStartSession = (workout: Workout) => {
    navigation.navigate('WorkoutSession', {
      workoutId: workout.id,
      workoutName: workout.name,
      workoutImage: workout.gif_link,
    });
  };

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
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Animated Gradient Background matches SignIn */}
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

      {/* Filters Header with Search */}
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

          {/* Search Input */}
          <View style={styles.searchWrapper}>
            <View style={[styles.searchInputContainer, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface }]}>
              <Ionicons name="search" size={18} color={colors.primary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search workouts..."
                placeholderTextColor={colors.placeholder}
                value={searchInput}
                onChangeText={handleSearchChange}
              />
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {searchInput !== '' && !isSearching && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(selectedBodyPart ||
            selectedTargetArea ||
            selectedEquipment ||
            selectedLevel ||
            searchQuery) && (
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
                setCurrentFilter('targetArea');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: colors.text },
                ]}
              >
                {selectedTargetArea || 'Target Area'}
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
                setCurrentFilter('equipment');
                setShowFilterModal(true);
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: colors.text },
                ]}
              >
                {selectedEquipment || 'Equipment'}
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
        ref={flatListRef}
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id.toString()}
        extraData={pagination.page}
        contentContainerStyle={[
          styles.listContent, 
          // Only add padding if pagination is not shown, otherwise pageInfo handles the padding!
          (!pagination || pagination.totalPages <= 1) && { paddingBottom: dynamicPaddingBottom }
        ]}
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
              selectedLevel ||
              searchQuery
                ? 'No workouts match your filters'
                : 'No workouts found'}
            </Text>
          </View>
        }
      />

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={{ backgroundColor: 'transparent', paddingBottom: dynamicPaddingBottom }}>
          <View
            style={[
              styles.paginationContainer,
              { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 16, marginHorizontal: 10, marginVertical: 0, paddingVertical: 5 },
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

          <Text style={[styles.pageInfo, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} workouts)
          </Text>
        </View>
      )}
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
    // Space for floating bottom navigation added dynamically via contentContainerStyle
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
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 5, // Reduced from 110, padding is now handled by pageInfo dynamically
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
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchWrapper: {
    flex: 1,
    minWidth: 150,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
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
