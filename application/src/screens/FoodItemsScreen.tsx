import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { foodService, Food } from '../services/foodService'; // Make sure foodService is exported in your api index
import { showErrorToast, getErrorMessage } from '../utils/toast';

export default function FoodItemsScreen() {
  const { token } = useAuth();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const LIMIT = 10;

  // ─── Debounce Search ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchFoods = async (pageNum: number, query: string, isRefresh = false) => {
    if (!token) return;
    
    try {
      if (isRefresh) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await foodService.getFoods(token, {
        page: pageNum,
        limit: LIMIT,
        search: query,
      });

      if (response.success && response.data) {
        if (isRefresh) {
          setFoods(response.data);
        } else {
          setFoods((prev) => [...prev, ...response.data]);
        }
        setHasNextPage(response.pagination.hasNextPage);
      }
    } catch (error: unknown) {
      showErrorToast({
        title: 'Error Fetching Foods',
        message: getErrorMessage(error) || 'Could not load the food database.',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────────────
  // Fetch when search changes or on mount
  useEffect(() => {
    setPage(1);
    fetchFoods(1, debouncedSearch, true);
  }, [debouncedSearch]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFoods(nextPage, debouncedSearch, false);
    }
  };

  const formatFoodName = (name: string): string =>
    name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  // ─── Render Components ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.title, { color: colors.text }]}>🥗 Food Database</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Explore nutrition facts for your favorite meals
      </Text>

      <View
        style={[
          styles.searchContainer,
          { 
            backgroundColor: colors.authInputBg || colors.card,
            borderColor: colors.authInputBorder || colors.border 
          },
        ]}
      >
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search foods (e.g. Chicken, Rice)..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="x-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFoodItem = ({ item }: { item: Food }) => (
    <View
      style={[
        styles.foodCard,
        { 
          backgroundColor: colors.authInputBg || colors.card, 
          borderColor: colors.authInputBorder || colors.border 
        },
      ]}
    >
      <Image 
        source={{ uri: item.pic || 'https://via.placeholder.com/150' }} 
        style={styles.foodImage} 
        resizeMode="cover"
      />
      <View style={styles.foodInfo}>
        <Text style={[styles.foodName, { color: colors.primary }]} numberOfLines={1}>
          {formatFoodName(item.name)}
        </Text>
        
        <View style={styles.macrosContainer}>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: colors.text }]}>{item.calories}</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>kcal</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: colors.text }]}>{item.protein}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: colors.text }]}>{item.carbohydrate}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.macroValue, { color: colors.text }]}>{item.fat}g</Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) return null; // Prevent showing empty text while initial loading
    return (
      <View style={styles.emptyContainer}>
        <Icon name="inbox" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>No foods found</Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
          Try adjusting your search query
        </Text>
      </View>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Animated Gradient Background matches the template */}
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

      {loading && page === 1 ? (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          {renderHeader()}
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.primary, marginTop: SIZES.md }}>Loading database...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderFoodItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top, paddingBottom: dynamicPaddingBottom }
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5} // Trigger load more when 50% from bottom
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Background Decorations
  decorativeCircle1: { position: 'absolute', top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: 'absolute', top: '30%', left: '-20%', width: 150, height: 150, borderRadius: 75 },
  
  listContent: {
    paddingHorizontal: SIZES.lg,
  },
  headerContainer: {
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  title: { fontSize: SIZES.h1, fontWeight: 'bold', marginBottom: SIZES.sm },
  subtitle: { fontSize: SIZES.body, marginBottom: SIZES.xl },

  // Search Input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    height: 50,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    marginBottom: SIZES.sm,
  },
  searchIcon: {
    marginRight: SIZES.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.body,
    height: '100%',
  },

  // Food Card
  foodCard: {
    flexDirection: 'row',
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    padding: SIZES.sm,
    marginBottom: SIZES.md,
    alignItems: 'center',
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusSmall,
    marginRight: SIZES.md,
  },
  foodInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  foodName: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSmall,
    minWidth: 45,
  },
  macroValue: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 10,
    marginTop: 2,
  },

  // States
  loadingContainer: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
  },
  centerSpinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: SIZES.md,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    marginTop: SIZES.md,
  },
  emptySubText: {
    fontSize: SIZES.body,
    marginTop: SIZES.xs,
  },
});