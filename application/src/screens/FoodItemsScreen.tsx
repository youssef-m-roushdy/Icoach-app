import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { foodService, Food, PaginationData } from '../services/foodService';
import { showErrorToast, showInfoToast, getErrorMessage } from '../utils/toast';

export default function FoodItemsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const isThreeButtonNav = systemBottomInset > 24;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Two-state search pattern (same as WorkoutsScreen):
  //    searchInput  → controlled TextInput value, updates on every keystroke (no re-fetch)
  //    searchQuery  → actual filter sent to API, only updates after debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isInitialLoadRef = useRef(true);

  // Filter States
  const [minCalories, setMinCalories] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const flatListRef = useRef<FlatList>(null);

  // Keep a stable reference to token
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const loadFoods = useCallback(async () => {
    try {
      if (!tokenRef.current) return;

      // Only show full loading spinner on initial load
      if (isInitialLoadRef.current) setLoading(true);

      const response = await foodService.getFoods(tokenRef.current, {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(minCalories ? { minCalories: Number(minCalories) } : {}),
        ...(maxCalories ? { maxCalories: Number(maxCalories) } : {}),
        ...(minProtein ? { minProtein: Number(minProtein) } : {}),
      });

      if (response.success && response.data) {
        setFoods(response.data);

        if (response.pagination) {
          setPagination(response.pagination);
        } else {
          setPagination((prev) => ({
            ...prev,
            totalItems: response.data.length,
            totalPages: Math.ceil(response.data.length / prev.itemsPerPage) || 1,
            hasNextPage: false,
            hasPreviousPage: prev.currentPage > 1,
          }));
        }

        if (
          response.data.length === 0 &&
          (searchQuery || minCalories || maxCalories || minProtein)
        ) {
          showInfoToast({
            title: 'No Results',
            message: 'No foods match your search criteria',
          });
        }
      } else {
        showErrorToast({
          title: 'Load Failed',
          message: response.message || 'Failed to load foods',
        });
        setFoods([]);
      }
    } catch (error: unknown) {
      console.error('Failed to load foods:', error);
      showErrorToast({
        title: 'Load Failed',
        message: getErrorMessage(error) || 'Failed to load foods',
      });
      setFoods([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
      isInitialLoadRef.current = false;
    }
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    searchQuery,       // ✅ Only searchQuery (not searchInput) triggers re-fetch
    minCalories,
    maxCalories,
    minProtein,
  ]);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  // Scroll to top when page changes
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [pagination.currentPage]);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      if (pagination.currentPage > 1) {
        goToPage(pagination.currentPage - 1);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pagination]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // ✅ Mirrors WorkoutsScreen: input updates immediately, searchQuery updates after debounce
  const handleSearchChange = (text: string) => {
    setSearchInput(text);
    setIsSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
      setIsSearching(false);
    }, 100);
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchInput('');
    setSearchQuery('');
    setPagination((prev) => ({ ...prev, currentPage: 1 }));

    showInfoToast({
      title: 'Search Cleared',
      message: 'Search filter has been cleared',
    });
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchInput('');
    setSearchQuery('');
    setMinCalories('');
    setMaxCalories('');
    setMinProtein('');
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setShowFilters(false);

    showInfoToast({
      title: 'Filters Cleared',
      message: 'All filters have been reset',
    });
  };

  const goToPage = useCallback(
    (page: number) => {
      if (
        page >= 1 &&
        page <= pagination.totalPages &&
        page !== pagination.currentPage
      ) {
        setPagination((prev) => ({ ...prev, currentPage: page }));
      }
    },
    [pagination.totalPages, pagination.currentPage]
  );

  const goToNextPage = () => goToPage(pagination.currentPage + 1);
  const goToPreviousPage = () => goToPage(pagination.currentPage - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(pagination.totalPages);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFoods();
    setRefreshing(false);
  };

  const formatFoodName = (name: string): string =>
    name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  // ✅ Checks searchInput (visible state) so indicator/clear appear immediately as user types
  const hasActiveFilters = searchInput || minCalories || maxCalories || minProtein;

  // ─── Render Functions ──────────────────────────────────────────────────────
  const renderPageNumbers = () => {
    if (!pagination || pagination.totalPages === 0) return null;

    const pages = [];
    const currentPage = pagination.currentPage;
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

    return pages.map((page) => (
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
        onPress={() => goToPage(page)}
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
    ));
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <View
      style={[
        styles.foodCard,
        {
          backgroundColor: colors.authInputBg || colors.surface,
          borderColor: colors.authInputBorder || colors.border,
        },
      ]}
    >
      <Image
        source={{ uri: item.pic || 'https://via.placeholder.com/150' }}
        style={styles.foodImage}
        resizeMode="cover"
      />
      <View style={styles.foodInfo}>
        <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
          {formatFoodName(item.name)}
        </Text>

        <View style={styles.macrosContainer}>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: colors.primary }]}>{item.calories}</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>kcal</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: '#10B981' }]}>{item.protein}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: '#F59E0B' }]}>{item.carbohydrate}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: '#EF4444' }]}>{item.fat}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
          </View>
        </View>

        {item.sugar !== undefined && (
          <View style={styles.sugarInfo}>
            <Ionicons name="nutrition-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.sugarText, { color: colors.textSecondary }]}>
              Sugar: {item.sugar}g
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing && foods.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.primary, marginTop: 12 }}>Loading food database...</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Food Database</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchFilterContainer}>
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View
            style={[
              styles.searchInputContainer,
              {
                borderColor: colors.authInputBorder || colors.border,
                backgroundColor: colors.authInputBg || colors.surface,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.primary} />
            {/* ✅ value={searchInput} — controlled by local state, NOT searchQuery */}
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search foods (e.g., chicken, rice)..."
              placeholderTextColor={colors.textSecondary}
              value={searchInput}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            {searchInput !== '' && !isSearching && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Toggle and Clear */}
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={[
              styles.filterToggle,
              showFilters && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="funnel"
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterToggleText,
                { color: showFilters ? colors.primary : colors.textSecondary },
              ]}
            >
              Filters
            </Text>
            {hasActiveFilters ? (
              <View style={[styles.activeFilterDot, { backgroundColor: colors.primary }]} />
            ) : null}
          </TouchableOpacity>

          {hasActiveFilters ? (
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={[styles.clearText, { color: '#EF4444' }]}>Clear All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Expandable Filters */}
        {showFilters && (
          <View
            style={[
              styles.filtersPanel,
              {
                backgroundColor: colors.authInputBg || colors.surface,
                borderColor: colors.authInputBorder || colors.border,
              },
            ]}
          >
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Min Calories
                </Text>
                <TextInput
                  style={[
                    styles.filterInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={minCalories}
                  onChangeText={setMinCalories}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.filterItem}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Max Calories
                </Text>
                <TextInput
                  style={[
                    styles.filterInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="1000"
                  placeholderTextColor={colors.textSecondary}
                  value={maxCalories}
                  onChangeText={setMaxCalories}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Min Protein (g)
                </Text>
                <TextInput
                  style={[
                    styles.filterInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={minProtein}
                  onChangeText={setMinProtein}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.applyFilterButton, { backgroundColor: colors.primary }]}
                onPress={applyFilters}
              >
                <Text style={styles.applyFilterText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Food List */}
      <FlatList
        ref={flatListRef}
        data={foods}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderFoodItem}
        extraData={pagination.currentPage}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              pagination && pagination.totalPages > 1
                ? 16
                : Math.max(insets.bottom + 20, 20),
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {hasActiveFilters ? 'No foods match your filters' : 'No foods found'}
            </Text>
            {hasActiveFilters ? (
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={[styles.clearFiltersLink, { color: colors.primary }]}>
                  Clear filters and try again
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
          <View
            style={[
              styles.paginationContainer,
              {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 16,
                marginHorizontal: 10,
                marginTop: 10,
                paddingVertical: 10,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.navButton,
                pagination.currentPage === 1 && styles.navButtonDisabled,
              ]}
              onPress={goToFirstPage}
              disabled={pagination.currentPage === 1}
            >
              <Ionicons
                name="play-back"
                size={20}
                color={pagination.currentPage === 1 ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                !pagination.hasPreviousPage && styles.navButtonDisabled,
              ]}
              onPress={goToPreviousPage}
              disabled={!pagination.hasPreviousPage}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={!pagination.hasPreviousPage ? colors.textSecondary : colors.primary}
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
                !pagination.hasNextPage && styles.navButtonDisabled,
              ]}
              onPress={goToNextPage}
              disabled={!pagination.hasNextPage}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={!pagination.hasNextPage ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                pagination.currentPage === pagination.totalPages && styles.navButtonDisabled,
              ]}
              onPress={goToLastPage}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              <Ionicons
                name="play-forward"
                size={20}
                color={
                  pagination.currentPage === pagination.totalPages
                    ? colors.textSecondary
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageInfo, { color: colors.text }]}>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} foods)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle3: {
    position: 'absolute',
    top: '30%',
    left: '-20%',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },

  // Search and Filter Container
  searchFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchWrapper: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },

  // Filter Styles
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersPanel: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  filterInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  applyFilterButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Food Card Styles
  foodCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 48,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  sugarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sugarText: {
    fontSize: 11,
  },

  // Empty State
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
  clearFiltersLink: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },

  // Pagination
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
  pageInfo: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 16,
    paddingTop: 0,
  },
});