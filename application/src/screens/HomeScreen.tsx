import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useStepCounter } from '../hooks/useStepCounter';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BLUE = '#007BFF';
// PRIMARY color replaced dynamically with colors.primary
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';

type NavigationTarget = 'notifications' | 'messages' | 'chatbot';

export default function HomeScreen() {
  const { user } = useAuth() as any;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const stepData = useStepCounter();
  const { systemBottomInset } = useSystemNavigation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  const handleNavigateTo = (target: NavigationTarget) => {
    switch (target) {
      case 'notifications':
        navigation.navigate('Notifications' as never);
        break;
      case 'messages':
        navigation.navigate('Messages' as never);
        break;
      case 'chatbot':
        navigation.navigate('Chatbot' as never);
        break;
    }
  };

  const INITIAL_MEALS = ['Breakfast', 'Lunch', 'Workout Meal', 'Dinner'];
  const EXTRA_MEALS = ['Morning Snack', 'Evening Snack', 'Post-Workout Shake'];
  const displayedMeals = showAll ? [...INITIAL_MEALS, ...EXTRA_MEALS] : INITIAL_MEALS;

  const waterGoal = 8;
  const waterDrank = 0;
  const waterProgress = waterDrank / waterGoal;

  return (
    <View style={[styles.main, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: dynamicPaddingBottom - 20 }]}
      >

        {/* Professional Header with Quick Actions */}
        <View style={styles.headerContainer}>
          {/* Quick Action Icons - Prominent and Accessible */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}
              onPress={() => handleNavigateTo('notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Alerts</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}
              onPress={() => handleNavigateTo('messages')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}
              onPress={() => handleNavigateTo('chatbot')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${colors.primary}10` }]}>
                <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>AI Coach</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Steps Section - Professional Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>Details →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder, shadowColor: colors.shadow }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="shoe-print" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Steps</Text>
              </View>
              <View style={[styles.stepGoalChip, { backgroundColor: `${colors.primary}10` }]}>
                <Text style={[styles.stepGoalText, { color: colors.primary }]}>Goal: {stepData.goal.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.stepsMainRow}>
              <View style={styles.stepsMetric}>
                <Text style={[styles.stepsValue, { color: colors.text }]}>{stepData.steps.toLocaleString()}</Text>
                <Text style={[styles.stepsUnit, { color: colors.textSecondary }]}>steps</Text>
              </View>
              <View style={styles.progressWrapper}>
                <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${stepData.progress * 100}%` }]} />
                </View>
                <View style={styles.progressStats}>
                  <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(stepData.progress * 100)}%</Text>
                  <Text style={[styles.progressRemaining, { color: colors.textSecondary }]}>{stepData.remaining.toLocaleString()} left</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.steps.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="flag" size={18} color={WARNING} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.goal.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Target</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.remaining.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
              </View>
            </View>

            {stepData.error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{stepData.error}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Food Section - Professional */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition Plan</Text>
            <TouchableOpacity onPress={() => setShowAll(!showAll)}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>
                {showAll ? 'Show less →' : 'View all →'}
              </Text>
            </TouchableOpacity>
          </View>

          {displayedMeals.map((meal, index) => (
            <MealCard key={index} title={meal} />
          ))}
        </View>

        {/* Daily Water Intake - Professional */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hydration</Text>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>History →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.waterCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder, shadowColor: colors.shadow }]}>
            <View style={styles.waterHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="water" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Water Intake</Text>
              </View>
              <View style={[styles.waterGoalChip, { backgroundColor: `${colors.primary}10` }]}>
                <Text style={[styles.waterGoalText, { color: colors.primary }]}>Goal: {waterGoal} cups</Text>
              </View>
            </View>

            <View style={styles.waterMain}>
              <View style={styles.waterCircleContainer}>
                <View style={[styles.waterCircle, { borderColor: colors.primary, backgroundColor: colors.iconBg }]}>
                  <Text style={[styles.waterCount, { color: colors.primary }]}>{waterDrank}</Text>
                  <Text style={[styles.waterUnit, { color: colors.textSecondary }]}>cups</Text>
                </View>
              </View>

              <View style={styles.waterDetails}>
                <View style={styles.waterProgressSection}>
                  <View style={[styles.waterProgressBarBg, { backgroundColor: colors.progressBg }]}>
                    <View style={[styles.waterProgressBarFill, { backgroundColor: colors.primary, width: `${waterProgress * 100}%` }]} />
                  </View>
                  <Text style={[styles.waterProgressText, { color: colors.textSecondary }]}>
                    {waterDrank} of {waterGoal} cups completed
                  </Text>
                </View>

                <TouchableOpacity 
                  style={{ 
                    borderRadius: 20, 
                    overflow: 'hidden', 
                    shadowColor: '#000', 
                    shadowOffset: { width: 0, height: 4 }, 
                    shadowOpacity: 0.2, 
                    shadowRadius: 8, 
                    elevation: 5,
                    marginTop: 8
                  }} 
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary || colors.primary]}
                    style={styles.addWaterBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.addWaterBtnText}>Add Glass</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.waterStatsRow}>
              <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Text style={[styles.waterStatValue, { color: colors.text }]}>2000</Text>
                <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>Target</Text>
                <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>ml</Text>
              </View>
              <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Text style={[styles.waterStatValue, { color: colors.text }]}>0</Text>
                <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>Consumed</Text>
                <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>ml</Text>
              </View>
              <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Text style={[styles.waterStatValue, { color: colors.text }]}>2000</Text>
                <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>ml</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// Professional Meal Card Component
const MealCard = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const mealDetails = {
    'Breakfast': [
      {
        name: 'Eggs & Toast',
        calories: '230 kcal',
        protein: '11g',
        carbs: '10g',
        fat: '14g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/eggs_benedict.jpg',
      },
      {
        name: 'French Toast',
        calories: '210 kcal',
        protein: '8g',
        carbs: '22g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
      },
      {
        name: 'Apple & Almonds',
        calories: '160 kcal',
        protein: '6g',
        carbs: '16g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
      },
    ],
    'Lunch': [
      {
        name: 'Grilled Salmon & Rice',
        calories: '280 kcal',
        protein: '22g',
        carbs: '25g',
        fat: '13g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grilled_salmon.jpg',
      },
      {
        name: 'Kofta & Bread',
        calories: '280 kcal',
        protein: '24g',
        carbs: '20g',
        fat: '18g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kofta.jpg',
      },
      {
        name: 'Caesar Salad',
        calories: '180 kcal',
        protein: '10g',
        carbs: '7g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/caesar_salad.jpg',
      },
    ],
    'Workout Meal': [
      {
        name: 'Banana & Honey',
        calories: '160 kcal',
        protein: '1.5g',
        carbs: '41g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
      {
        name: 'Toast & Peanut Butter',
        calories: '200 kcal',
        protein: '8g',
        carbs: '20g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
      },
      {
        name: 'Dates & Milk',
        calories: '140 kcal',
        protein: '4g',
        carbs: '32g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
    ],
    'Dinner': [
      {
        name: 'Kebda & Rice',
        calories: '240 kcal',
        protein: '26g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kebda.jpg',
      },
      {
        name: 'Fish & Bread',
        calories: '260 kcal',
        protein: '20g',
        carbs: '18g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fish.jpg',
      },
      {
        name: 'Chicken Wings & Rice',
        calories: '280 kcal',
        protein: '20g',
        carbs: '25g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/chicken_wings.jpg',
      },
    ],
    'Morning Snack': [
      {
        name: 'Apple & Cheese',
        calories: '150 kcal',
        protein: '8g',
        carbs: '14g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
      },
      {
        name: 'Yogurt & Granola',
        calories: '180 kcal',
        protein: '10g',
        carbs: '20g',
        fat: '5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/frozen_yogurt.jpg',
      },
      {
        name: 'Banana & Almonds',
        calories: '160 kcal',
        protein: '5g',
        carbs: '25g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
    ],
    'Evening Snack': [
      {
        name: 'Cheese & Crackers',
        calories: '170 kcal',
        protein: '10g',
        carbs: '12g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/cheese_plate.jpg',
      },
      {
        name: 'Grapes & Nuts',
        calories: '150 kcal',
        protein: '4g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grape.jpg',
      },
      {
        name: 'Fig & Honey',
        calories: '130 kcal',
        protein: '1g',
        carbs: '32g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
    ],
    'Post-Workout Shake': [
      {
        name: 'Banana & Milk',
        calories: '120 kcal',
        protein: '8g',
        carbs: '18g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
      {
        name: 'Dates & Yogurt',
        calories: '140 kcal',
        protein: '6g',
        carbs: '28g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
      {
        name: 'Fool & Bread',
        calories: '160 kcal',
        protein: '8g',
        carbs: '16g',
        fat: '9g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fool.jpg',
      },
    ],
  };

  const foodItems = mealDetails[title as keyof typeof mealDetails] || [];
  const totalCalories = foodItems.reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);

  return (
    <TouchableOpacity
      style={[
        mealStyles.card,
        {
          backgroundColor: colors.authInputBg || colors.surface,
          borderColor: colors.authInputBorder || colors.cardBorder,
          shadowColor: colors.shadow,
        },
        open && { borderColor: colors.primary },
      ]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.9}
    >
      <View style={mealStyles.cardHeader}>
        <View style={mealStyles.titleContainer}>
          <View style={[mealStyles.mealIcon, { backgroundColor: `${colors.primary}10` }]}>
            <MaterialCommunityIcons name="food-apple" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[mealStyles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[mealStyles.subtitle, { color: colors.textSecondary }]}>
              {foodItems.length} items • {totalCalories} cal
            </Text>
          </View>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-right'} size={20} color={colors.textSecondary} />
      </View>

      {open && (
        <View style={[mealStyles.content, { borderTopColor: colors.divider }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mealStyles.gallery}>
            {foodItems.slice(0, 3).map((food, index) => (
              <Image key={index} source={{ uri: food.imageUrl }} style={[mealStyles.galleryImage, { backgroundColor: colors.statBg }]} />
            ))}
          </ScrollView>

          {foodItems.map((food, index) => (
            <View key={index} style={[mealStyles.foodItem, { backgroundColor: colors.statBg, borderColor: colors.authInputBorder || colors.cardBorder }]}>
              <Image source={{ uri: food.imageUrl }} style={[mealStyles.foodImage, { backgroundColor: colors.statBg }]} />
              <View style={mealStyles.foodInfo}>
                <Text style={[mealStyles.foodName, { color: colors.text }]}>{food.name}</Text>
                <View style={mealStyles.nutritionGrid}>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>Cal</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.calories}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>P</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.protein}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>C</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.carbs}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>F</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.fat}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Professional Styles
const styles = StyleSheet.create({
  decorativeCircle1: { position: 'absolute', top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: 'absolute', top: '30%', left: '-20%', width: 150, height: 150, borderRadius: 75 },
  main: { flex: 1 },
  scrollContent: {},
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
    gap: 8,
    position: 'relative',
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsCard: {
    borderRadius: 32,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepGoalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 32,
  },
  stepGoalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepsMetric: {
    alignItems: 'center',
  },
  stepsValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  stepsUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRemaining: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EF444430',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
  },
  waterCard: {
    borderRadius: 32,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterGoalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 32,
  },
  waterGoalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waterMain: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  waterCircleContainer: {
    alignItems: 'center',
  },
  waterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  waterUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  waterDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  waterProgressSection: {
    gap: 6,
  },
  waterProgressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterProgressText: {
    fontSize: 11,
  },
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addWaterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  waterStatsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB30',
  },
  waterStatItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  waterStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  waterStatLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  waterStatUnit: {
    fontSize: 9,
  },
});

const mealStyles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  gallery: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  galleryImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginRight: 10,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nutritionLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  nutritionValue: {
    fontSize: 10,
    fontWeight: '700',
  },
});
