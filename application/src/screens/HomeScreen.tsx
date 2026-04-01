import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView, 
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { useAuth } from '../context'; 
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useStepCounter } from '../hooks/useStepCounter';

const BLUE = '#007BFF'; 

export default function HomeScreen() {
  const { user } = useAuth() as any;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const stepData = useStepCounter();

  const INITIAL_MEALS = ['Breakfast', 'Lunch', 'Workout Meal', 'Dinner'];
  const EXTRA_MEALS = ['Morning Snack', 'Evening Snack', 'Post-Workout Shake'];
  const displayedMeals = showAll ? [...INITIAL_MEALS, ...EXTRA_MEALS] : INITIAL_MEALS;

  return (
    <View style={[styles.main, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFill} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Welcome Header - Minimal */}
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.welcomeTxt, { color: colors.subtleText }]}>{t('hello')}</Text>
            <Text style={[styles.nameTxt, { color: colors.text }]}>
              {user?.firstName || t('champion')}
            </Text>
          </View>
        </View>

        {/* Daily Steps Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Steps</Text>
          <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>

            {/* Left - Step Circle */}
            <View style={styles.stepsLeft}>
              <View style={[styles.stepsCircle, { borderColor: colors.primary, backgroundColor: colors.iconBg }]}>
                <Text style={[styles.stepsCount, { color: colors.primary }]}>
                  {stepData.isLoading ? '...' : stepData.steps.toLocaleString()}
                </Text>
                <Text style={[styles.stepsSmallText, { color: colors.subtleText }]}>Steps</Text>
              </View>
              <MaterialCommunityIcons name="foot-print" size={40} color={BLUE} />
            </View>

            {/* Right - Progress and Stats */}
            <View style={styles.stepsRight}>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${stepData.progress * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                  {stepData.steps.toLocaleString()} {t('of')} {stepData.goal.toLocaleString()} {t('steps')}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <View style={styles.statBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#28A745" />
                    <Text style={[styles.statItemValue, { color: colors.primary }]}>
                      {stepData.steps.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.statItemLabel, { color: colors.subtleText }]}>{t('done')}</Text>
                </View>

                <View style={[styles.statItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <View style={styles.statBadge}>
                    <Ionicons name="flag" size={20} color={colors.primary} />
                    <Text style={[styles.statItemValue, { color: colors.primary }]}>
                      {stepData.goal.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.statItemLabel, { color: colors.subtleText }]}>{t('goal')}</Text>
                </View>

                <View style={[styles.statItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <View style={styles.statBadge}>
                    <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                    <Text style={[styles.statItemValue, { color: colors.primary }]}>
                      {stepData.remaining.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.statItemLabel, { color: colors.subtleText }]}>{t('remaining')}</Text>
                </View>
              </View>

              {stepData.error && (
                <Text style={{ color: '#FF6B6B', fontSize: 11, marginTop: 8 }}>
                  ⚠️ {stepData.error}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Daily Food Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dailyRoutine')}</Text>
            <TouchableOpacity onPress={() => setShowAll(!showAll)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {showAll ? t('showLess') : t('showMore')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {displayedMeals.map((meal, index) => (
            <MealCard key={index} title={meal} />
          ))}
        </View>

        {/* Daily Water Intake */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dailyWaterIntake')}</Text>
          <View style={[styles.waterCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
            
            {/* Left - Water Circle */}
            <View style={styles.waterLeft}>
              <View style={[styles.waterCircle, { borderColor: colors.primary, backgroundColor: colors.iconBg }]}>
                <Text style={[styles.waterCount, { color: colors.primary }]}>0</Text>
                <MaterialCommunityIcons name="water" size={28} color={BLUE} />
              </View>
            </View>

            {/* Right - Progress and Stats */}
            <View style={styles.waterRight}>
              {/* Progress Bar */}
              <View style={styles.waterProgressContainer}>
                <Text style={[styles.waterProgressLabel, { color: colors.primary }]}>
                  0 {t('cups')} | 8 {t('cups')} {t('total')}
                </Text>
                <View style={[styles.waterProgressBarBg, { backgroundColor: colors.progressBg }]}>
                  <View style={[styles.waterProgressBarFill, { backgroundColor: colors.primary }]} />
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.waterStatsRow}>
                <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <Text style={[styles.waterStatValue, { color: colors.primary }]}>2000</Text>
                  <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Goal</Text>
                  <Text style={[styles.waterStatUnit, { color: colors.subtleText }]}>ml</Text>
                </View>

                <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <Text style={[styles.waterStatValue, { color: colors.primary }]}>0</Text>
                  <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Drank</Text>
                  <Text style={[styles.waterStatUnit, { color: colors.subtleText }]}>ml</Text>
                </View>

                <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                  <Text style={[styles.waterStatValue, { color: colors.primary }]}>2000</Text>
                  <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Remaining</Text>
                  <Text style={[styles.waterStatUnit, { color: colors.subtleText }]}>ml</Text>
                </View>
              </View>

              {/* Add Glass Button */}
              <TouchableOpacity style={[styles.addGlassBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={[styles.addGlassBtnText, { color: '#FFFFFF' }]}>Add Glass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Extra padding at bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// Meal Card Component (unchanged)
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
        description: null
      },
      { 
        name: 'French Toast',
        calories: '210 kcal',
        protein: '8g',
        carbs: '22g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
        description: null
      },
      { 
        name: 'Apple & Almonds',
        calories: '160 kcal',
        protein: '6g',
        carbs: '16g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
        description: null
      }
    ],
    'Lunch': [
      { 
        name: 'Grilled Salmon & Rice',
        calories: '280 kcal',
        protein: '22g',
        carbs: '25g',
        fat: '13g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grilled_salmon.jpg',
        description: null
      },
      { 
        name: 'Kofta & Bread',
        calories: '280 kcal',
        protein: '24g',
        carbs: '20g',
        fat: '18g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kofta.jpg',
        description: null
      },
      { 
        name: 'Caesar Salad',
        calories: '180 kcal',
        protein: '10g',
        carbs: '7g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/caesar_salad.jpg',
        description: null
      }
    ],
    'Workout Meal': [
      { 
        name: 'Banana & Honey',
        calories: '160 kcal',
        protein: '1.5g',
        carbs: '41g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
        description: null
      },
      { 
        name: 'Toast & Peanut Butter',
        calories: '200 kcal',
        protein: '8g',
        carbs: '20g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
        description: null
      },
      { 
        name: 'Dates & Milk',
        calories: '140 kcal',
        protein: '4g',
        carbs: '32g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
        description: null
      }
    ],
    'Dinner': [
      { 
        name: 'Kebda & Rice',
        calories: '240 kcal',
        protein: '26g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kebda.jpg',
        description: null
      },
      { 
        name: 'Fish & Bread',
        calories: '260 kcal',
        protein: '20g',
        carbs: '18g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fish.jpg',
        description: null
      },
      { 
        name: 'Chicken Wings & Rice',
        calories: '280 kcal',
        protein: '20g',
        carbs: '25g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/chicken_wings.jpg',
        description: null
      }
    ],
    'Morning Snack': [
      { 
        name: 'Apple & Cheese',
        calories: '150 kcal',
        protein: '8g',
        carbs: '14g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
        description: null
      },
      { 
        name: 'Yogurt & Granola',
        calories: '180 kcal',
        protein: '10g',
        carbs: '20g',
        fat: '5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/frozen_yogurt.jpg',
        description: null
      },
      { 
        name: 'Banana & Almonds',
        calories: '160 kcal',
        protein: '5g',
        carbs: '25g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
        description: null
      }
    ],
    'Evening Snack': [
      { 
        name: 'Cheese & Crackers',
        calories: '170 kcal',
        protein: '10g',
        carbs: '12g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/cheese_plate.jpg',
        description: null
      },
      { 
        name: 'Grapes & Nuts',
        calories: '150 kcal',
        protein: '4g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grape.jpg',
        description: null
      },
      { 
        name: 'Fig & Honey',
        calories: '130 kcal',
        protein: '1g',
        carbs: '32g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
        description: null
      }
    ],
    'Post-Workout Shake': [
      { 
        name: 'Banana & Milk',
        calories: '120 kcal',
        protein: '8g',
        carbs: '18g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
        description: null
      },
      { 
        name: 'Dates & Yogurt',
        calories: '140 kcal',
        protein: '6g',
        carbs: '28g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
        description: null
      },
      { 
        name: 'Fool & Bread',
        calories: '160 kcal',
        protein: '8g',
        carbs: '16g',
        fat: '9g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fool.jpg',
        description: null
      }
    ]
  };

  const foodItems = mealDetails[title as keyof typeof mealDetails] || [];

  return (
    <TouchableOpacity 
      style={[
        mealStyles.card, 
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.cardBorder, 
          shadowColor: colors.shadow 
        }, 
        open && { borderColor: colors.primary }
      ]} 
      onPress={() => setOpen(!open)} 
      activeOpacity={0.9}
    >
      <View style={mealStyles.header}>
        <View>
          <Text style={[mealStyles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[mealStyles.subTitle, { color: colors.primary }]}>
            {foodItems.length} foods
          </Text>
        </View>
        <Feather name={open ? "chevron-up" : "chevron-right"} size={20} color={colors.primary} />
      </View>
      
      {open && (
        <View style={[mealStyles.content, { borderTopColor: colors.divider }]}>
          {/* Image Gallery - First 3 images */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mealStyles.imageGallery}>
            {foodItems.slice(0, 3).map((food, index) => (
              <View key={`gallery-${index}`} style={mealStyles.galleryItem}>
                <Image 
                  source={{ uri: food.imageUrl }} 
                  style={[mealStyles.galleryImg, { backgroundColor: colors.statBg }]} 
                />
              </View>
            ))}
          </ScrollView>

          {/* Detailed List */}
          {foodItems.map((food, index) => (
            <View 
              key={index} 
              style={[
                mealStyles.foodItem, 
                { backgroundColor: colors.statBg, borderColor: colors.cardBorder }
              ]}
            >
              <Image 
                source={{ uri: food.imageUrl }} 
                style={[mealStyles.foodImg, { backgroundColor: colors.statBg }]} 
              />
              <View style={mealStyles.foodDetails}>
                <Text style={[mealStyles.foodName, { color: colors.primary }]}>{food.name}</Text>
                <Text style={[mealStyles.foodDescription, { color: colors.textSecondary }]}>
                  {food.description}
                </Text>
                <View style={mealStyles.nutritionRow}>
                  <View style={[mealStyles.nutritionItem, { backgroundColor: colors.surface, borderColor: colors.statBorder }]}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.subtleText }]}>Cal</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.calories}</Text>
                  </View>
                  <View style={[mealStyles.nutritionItem, { backgroundColor: colors.surface, borderColor: colors.statBorder }]}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.subtleText }]}>P</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.protein}</Text>
                  </View>
                  <View style={[mealStyles.nutritionItem, { backgroundColor: colors.surface, borderColor: colors.statBorder }]}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.subtleText }]}>C</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.carbs}</Text>
                  </View>
                  <View style={[mealStyles.nutritionItem, { backgroundColor: colors.surface, borderColor: colors.statBorder }]}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.subtleText }]}>F</Text>
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

// Styles
const styles = StyleSheet.create({
  main: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeTxt: { fontSize: 14 },
  nameTxt: { fontSize: 22, fontWeight: '800' },
  section: { paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  
  // Daily Steps Styles
  stepsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stepsLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepsCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsCount: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  stepsSmallText: {
    fontSize: 9,
    fontWeight: '600',
  },
  stepsRight: {
    flex: 1,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
  },
  statBadge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statItemValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statItemLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  
  // Daily Water Intake Styles
  waterCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  waterLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  waterCount: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  waterRight: {
    flex: 1,
  },
  waterProgressContainer: {
    marginBottom: 12,
  },
  waterProgressLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
  },
  waterProgressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    width: '0%',
    height: '100%',
    borderRadius: 3,
  },
  waterStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  waterStatItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  waterStatValue: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 1,
  },
  waterStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 1,
  },
  waterStatUnit: {
    fontSize: 7,
    fontWeight: '500',
  },
  addGlassBtn: {
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addGlassBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

// Meal Card Styles
const mealStyles = StyleSheet.create({
  card: { 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 10, 
    borderWidth: 1, 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 6, 
    elevation: 2 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  subTitle: { 
    fontSize: 11, 
    marginTop: 2 
  },
  content: { 
    marginTop: 12, 
    borderTopWidth: 1, 
    paddingTop: 12, 
    gap: 10 
  },
  imageGallery: { 
    marginBottom: 10, 
    paddingVertical: 4 
  },
  galleryItem: { 
    marginRight: 8, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  galleryImg: { 
    width: 100, 
    height: 100, 
    borderRadius: 12 
  },
  foodItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 12, 
    padding: 10, 
    borderWidth: 1 
  },
  foodImg: { 
    width: 70, 
    height: 70, 
    borderRadius: 10, 
    marginRight: 10 
  },
  foodDetails: { 
    flex: 1 
  },
  foodName: { 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  foodDescription: { 
    fontSize: 10, 
    marginBottom: 6, 
    fontStyle: 'italic' 
  },
  nutritionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 4 
  },
  nutritionItem: { 
    flex: 1, 
    borderRadius: 6, 
    padding: 4, 
    alignItems: 'center', 
    borderWidth: 1 
  },
  nutritionLabel: { 
    fontSize: 7, 
    fontWeight: '600', 
    marginBottom: 1 
  },
  nutritionValue: { 
    fontSize: 8, 
    fontWeight: '700' 
  },
});