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
  TextInput,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
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
import ar from '../../i18n/locales/ar.json';

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
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flatListRef = useRef<FlatList>(null);

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

  const filterSheetRef = useRef<BottomSheetModal>(null);

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

  const sheetBg = theme === 'dark' ? '#1C1C1E' : '#FFFFFF';
  const sheetBackground = React.useMemo(
    () => ({ backgroundColor: sheetBg }),
    [sheetBg]
  );
  
  const handleIndicatorStyle = React.useMemo(
    () => ({ backgroundColor: colors.divider ?? '#C0C0C0', width: 40, height: 4 }),
    [colors.divider]
  );

  const openFilterSheet = useCallback((filterType: 'bodyPart' | 'targetArea' | 'equipment' | 'level') => {
    setCurrentFilter(filterType);
    setShowFilterModal(true);
    filterSheetRef.current?.present();
  }, []);

  const closeFilterSheet = useCallback(() => {
    setShowFilterModal(false);
    filterSheetRef.current?.dismiss();
  }, []);

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
          title: ar.filtersErrorTitle,
          message: response?.message || ar.filtersErrorMessage,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to load filters:', error);

      showErrorToast({
        title: ar.filtersErrorTitle,
        message: getErrorMessage(error) || ar.filtersErrorMessage,
      });
    }
  }, []);

  const loadWorkouts = useCallback(async () => {
    try {
      if (!tokenRef.current) return;

      if (initialLoad) setLoading(true);

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
        const workoutList: Workout[] = Array.isArray(result?.data)
          ? result.data
          : result?.data?.workouts || [];

        const paginationData = result?.pagination || result?.data?.pagination;

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
        
        const pag = paginationData;
        if (pag) {
          setPagination((prev) => ({
            ...prev,
            total: pag.total ?? prev.total,
            limit: pag.limit ?? prev.limit,
            totalPages: pag.totalPages ?? prev.totalPages,
          }));
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
            title: ar.noResultsTitle,
            message: ar.noWorkoutsMatchFilters,
          });
        }
      } else {
        showErrorToast({
          title: ar.loadFailedTitle,
          message: result?.message || ar.loadFailedMessage,
        });
        setWorkouts([]);
      }
    } catch (error: unknown) {
      console.error('Failed to load workouts:', error);

      showErrorToast({
        title: ar.loadFailedTitle,
        message: getErrorMessage(error) || ar.loadFailedMessage,
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

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

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

  useEffect(() => {
    const backAction = () => {
      if (showFilterModal) {
        closeFilterSheet();
        return true;
      }
      
      if (pagination && pagination.page > 1) {
        goToPage(pagination.page - 1);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pagination, showFilterModal, goToPage, closeFilterSheet]);

  const handleSearchChange = (text: string) => {
    setSearchInput(text);
    setIsSearching(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
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
      title: ar.searchClearedTitle,
      message: ar.searchClearedMessage,
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
      title: ar.filtersClearedTitle,
      message: ar.filtersClearedMessage,
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
          title: ar.authenticationError,
          message: ar.needLoginToSaveWorkouts,
        });
        return;
      }

      if (workout.isSaved) {
        showInfoToast({
          title: ar.alreadySavedTitle,
          message: ar.alreadySavedMessage,
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
        title: ar.workoutSavedTitle,
        message: ar.workoutSavedMessage.replace('{name}', workout.name),
      });
    } catch (error: unknown) {
      console.error('Failed to save workout:', error);

      showErrorToast({
        title: ar.saveFailedTitle,
        message: getErrorMessage(error) || ar.saveFailedMessage,
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
            <Text style={styles.startButtonText}>{ar.startSession}</Text>
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

      <View
        style={[
          styles.filtersContainer,
          { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
        ]}
      >
        <View style={styles.filtersHeader}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>
            {ar.filters}
          </Text>

          <View style={styles.searchWrapper}>
            <View style={[styles.searchInputContainer, { borderColor: colors.authInputBorder || colors.border, backgroundColor: colors.authInputBg || colors.surface }]}>
              <Ionicons name="search" size={18} color={colors.primary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={ar.searchWorkoutsPlaceholder}
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
              <Text style={styles.clearText}>{ar.clearAll}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedBodyPart 
                  ? { borderColor: colors.primary, borderWidth: 1, overflow: 'hidden' }
                  : { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border, borderWidth: 1 }
              ]}
              onPress={() => openFilterSheet('bodyPart')}
            >
              {selectedBodyPart ? (
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text
                style={[
                  styles.filterButtonText,
                  { color: selectedBodyPart ? '#FFFFFF' : colors.text, zIndex: 1 },
                ]}
              >
                {selectedBodyPart || ar.bodyPart}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={selectedBodyPart ? '#FFFFFF' : colors.text}
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedTargetArea
                  ? { borderColor: colors.primary, borderWidth: 1, overflow: 'hidden' }
                  : { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border, borderWidth: 1 }
              ]}
              onPress={() => openFilterSheet('targetArea')}
            >
              {selectedTargetArea ? (
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text
                style={[
                  styles.filterButtonText,
                  { color: selectedTargetArea ? '#FFFFFF' : colors.text, zIndex: 1 },
                ]}
              >
                {selectedTargetArea || ar.targetAreaFilterLabel}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={selectedTargetArea ? '#FFFFFF' : colors.text}
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedEquipment
                  ? { borderColor: colors.primary, borderWidth: 1, overflow: 'hidden' }
                  : { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border, borderWidth: 1 }
              ]}
              onPress={() => openFilterSheet('equipment')}
            >
              {selectedEquipment ? (
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text
                style={[
                  styles.filterButtonText,
                  { color: selectedEquipment ? '#FFFFFF' : colors.text, zIndex: 1 },
                ]}
              >
                {selectedEquipment || ar.equipmentFilterLabel}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={selectedEquipment ? '#FFFFFF' : colors.text}
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedLevel
                  ? { borderColor: colors.primary, borderWidth: 1, overflow: 'hidden' }
                  : { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.border, borderWidth: 1 }
              ]}
              onPress={() => openFilterSheet('level')}
            >
              {selectedLevel ? (
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text
                style={[
                  styles.filterButtonText,
                  { color: selectedLevel ? '#FFFFFF' : colors.text, zIndex: 1 },
                ]}
              >
                {selectedLevel || ar.level}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={selectedLevel ? '#FFFFFF' : colors.text}
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        ref={filterSheetRef}
        snapPoints={['50%', '70%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        onDismiss={() => setShowFilterModal(false)}
      >
        <BottomSheetView
          style={[
            styles.bottomSheetContent,
            { paddingBottom: Math.max(30, systemBottomInset + 4) },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.authInputBorder || colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {currentFilter === 'bodyPart'
                ? ar.selectBodyPart
                : currentFilter === 'targetArea'
                ? ar.selectTargetArea
                : currentFilter === 'equipment'
                ? ar.selectEquipment
                : ar.selectLevel}
            </Text>
          </View>

          <BottomSheetScrollView style={styles.modalScroll}>
            <TouchableOpacity
              style={[styles.modalOption, { borderBottomColor: colors.authInputBorder || colors.border }]}
              onPress={() => {
                if (currentFilter === 'bodyPart') setSelectedBodyPart('');
                else if (currentFilter === 'targetArea') setSelectedTargetArea('');
                else if (currentFilter === 'equipment') setSelectedEquipment('');
                else if (currentFilter === 'level') setSelectedLevel('');
                closeFilterSheet();
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>
                {ar.allFilterOption}
              </Text>
            </TouchableOpacity>

            {currentFilter === 'bodyPart' &&
              filters.bodyParts.map((part) => (
                <TouchableOpacity
                  key={part}
                  style={[styles.modalOption, { borderBottomColor: colors.authInputBorder || colors.border }]}
                  onPress={() => {
                    setSelectedBodyPart(part);
                    closeFilterSheet();
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
                  style={[styles.modalOption, { borderBottomColor: colors.authInputBorder || colors.border }]}
                  onPress={() => {
                    setSelectedTargetArea(area);
                    closeFilterSheet();
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
                  style={[styles.modalOption, { borderBottomColor: colors.authInputBorder || colors.border }]}
                  onPress={() => {
                    setSelectedEquipment(equip);
                    closeFilterSheet();
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
                  style={[styles.modalOption, { borderBottomColor: colors.authInputBorder || colors.border }]}
                  onPress={() => {
                    setSelectedLevel(level);
                    closeFilterSheet();
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
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <FlatList
        ref={flatListRef}
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id.toString()}
        extraData={pagination.page}
        contentContainerStyle={[
          styles.listContent, 
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
                ? ar.noWorkoutsMatchFilters
                : ar.noWorkoutsFound}
            </Text>
          </View>
        }
      />

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
            {ar.paginationInfoWorkouts
              .replace('{page}', pagination.page.toString())
              .replace('{totalPages}', pagination.totalPages.toString())
              .replace('{total}', pagination.total.toString())}
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
    borderBottomWidth: 0.5,
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
    borderBottomWidth: 0.5,
  },
  modalOptionText: {
    fontSize: 16,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 0,
  },
});

export default WorkoutsScreen;