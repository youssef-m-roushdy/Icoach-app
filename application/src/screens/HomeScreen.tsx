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
import MediaPickerSheet from '../components/MediaPickerSheet';
import { useNavigation } from '@react-navigation/native'; 

const GOLD = '#FFD700';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const BLUE = '#007BFF'; 
const BG_GRADIENT = ['#0F0F0F', '#1A1A1A', '#000000'] as const;

export default function HomeScreen() {
  const { user } = useAuth() as any;
  const navigation = useNavigation<any>();
  const { theme, colors, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const userImage = useMemo(() => {
    
    const googlePhotoUrl = user?.photoURL || user?.avatar;
    
    
    if (googlePhotoUrl && typeof googlePhotoUrl === 'string' && googlePhotoUrl.startsWith('http')) {
      return { uri: googlePhotoUrl };
    }
    
    
    const name = user?.firstName || user?.username || 'User';
    console.warn('⚠️ No Google photo found, using generated avatar for:', name);
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FFD700&color=000&bold=true` };
  }, [user]);

  const INITIAL_MEALS = ['Breakfast', 'Lunch', 'Workout Meal', 'Dinner'];
  const EXTRA_MEALS = ['Morning Snack', 'Evening Snack', 'Post-Workout Shake'];
  const displayedMeals = showAll ? [...INITIAL_MEALS, ...EXTRA_MEALS] : INITIAL_MEALS;

  return (
    <View style={[styles.main, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.bgGradient as any} style={StyleSheet.absoluteFill} />
      
      {/* Background Image */}
      {!(theme === 'light') && (
      <Image 
        source={require('../../assets/Boy.png')} 
        style={styles.backgroundImage} 
      />
      )}
      

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          <View style={styles.headerTop}>
             <View>
                <Text style={[styles.welcomeTxt, { color: colors.textSecondary }]}>{t('hello')}</Text>
                <Text style={[styles.nameTxt, { color: colors.text }]}>{t('champion')}</Text>
             </View>
             <View style={styles.headerBtnsContainer}>
                <TouchableOpacity style={styles.chatbotBtn}>
                   <MaterialCommunityIcons name="robot-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.notifBtn}>
                   <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
             </View>
          </View>

          <View style={styles.storiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                
                {/* My Story */}
                <TouchableOpacity style={storyStyles.container} onPress={() => setIsSheetVisible(true)} activeOpacity={0.8}>
                    <View style={[storyStyles.ring, { borderColor: 'rgba(45, 14, 88, 0.1)' }]}>
                        <Image 
                            source={userImage} 
                            style={storyStyles.img}
                            key={userImage.uri} 
                        />
                        <View style={storyStyles.add}><Ionicons name="add" size={14} color={colors.background} /></View>
                    </View>
                    <Text style={storyStyles.txt}>My Story</Text>
                </TouchableOpacity>

                
                {[
                    { name: 'Youssef', image: require('../../assets/youssef.jpeg') },
                    { name: 'Omar', image: require('../../assets/omar.jpeg') },
                    { name: 'Amr', image: require('../../assets/amr.jpeg') },
                    { name: 'Mazen', image: require('../../assets/mazen.jpeg') },
                    { name: 'Ziad', image: require('../../assets/ziad.jpeg') },
                    { name: 'Saif', image: require('../../assets/saif.jpeg') }
                ].map((item, index) => (
                    <View key={index} style={storyStyles.container}>
                        <View style={[storyStyles.ring, { borderColor: colors.primary }]}>
                            <Image source={item.image} style={storyStyles.img} />
                        </View>
                        <Text style={storyStyles.txt}>{item.name}</Text>
                    </View>
                ))}
            </ScrollView>
          </View>

          {/* Daily Steps Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Steps</Text>
            <View style={styles.stepsCard}>
              {/* Left: Steps Count and Icon */}
              <View style={styles.stepsLeft}>
                <View style={[styles.stepsCircle, { borderColor: colors.primary }]}>
                  <Text style={[styles.stepsCount, { color: colors.primary }]}>0</Text>
                  <Text style={styles.stepsSmallText}>Steps</Text>
                </View>
                <MaterialCommunityIcons name="foot-print" size={40} color={BLUE} />
              </View>

              {/* Right: Progress and Stats */}
              <View style={styles.stepsRight}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.primary }]}>0 {t('of')} 10000 {t('steps')}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#28A745" />
                      <Text style={[styles.statItemValue, { color: colors.primary }]}>0</Text>
                    </View>
                    <Text style={styles.statItemLabel}>{t('done')}</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={styles.statBadge}>
                      <Ionicons name="flag" size={20} color={colors.primary} />
                      <Text style={[styles.statItemValue, { color: colors.primary }]}>10000</Text>
                    </View>
                    <Text style={styles.statItemLabel}>{t('goal')}</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={styles.statBadge}>
                      <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                      <Text style={[styles.statItemValue, { color: colors.primary }]}>10000</Text>
                    </View>
                    <Text style={styles.statItemLabel}>{t('remaining')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('dailyRoutine')}</Text>
                <TouchableOpacity onPress={() => setShowAll(!showAll)}>
                    <Text style={styles.seeAll}>{showAll ? t('showLess') : t('showMore')}</Text>
                </TouchableOpacity>
            </View>
            
            {displayedMeals.map((meal, index) => (
                <MealCard key={index} title={meal} />
            ))}
          </View>

          {/* Daily Water Intake */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dailyWaterIntake')}</Text>
            <View style={styles.waterCard}>
              {/* Left: Water Count */}
              <View style={styles.waterLeft}>
                <View style={[styles.waterCircle, { borderColor: colors.primary }]}>
                  <Text style={[styles.waterCount, { color: colors.primary }]}>0</Text>
                <MaterialCommunityIcons name="water" size={28} color={BLUE} />
                </View>
              </View>

              {/* Right: Progress and Stats */}
              <View style={styles.waterRight}>
                {/* Progress Bar */}
                <View style={styles.waterProgressContainer}>
                  <Text style={[styles.waterProgressLabel, { color: colors.primary }]}>0 {t('cups')} | 8 {t('cups')} {t('total')}</Text>
                  <View style={styles.waterProgressBarBg}>
                    <View style={[styles.waterProgressBarFill, { backgroundColor: colors.primary }]} />
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.waterStatsRow}>
                  <View style={styles.waterStatItem}>
                    <Text style={[styles.waterStatValue, { color: colors.primary }]}>2000</Text>
                    <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Goal</Text>
                    <Text style={styles.waterStatUnit}>ml</Text>
                  </View>

                  <View style={styles.waterStatItem}>
                    <Text style={[styles.waterStatValue, { color: colors.primary }]}>0</Text>
                    <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Drank</Text>
                    <Text style={styles.waterStatUnit}>ml</Text>
                  </View>

                  <View style={styles.waterStatItem}>
                    <Text style={[styles.waterStatValue, { color: colors.primary }]}>2000</Text>
                    <Text style={[styles.waterStatLabel, { color: colors.primary }]}>Remaining</Text>
                    <Text style={styles.waterStatUnit}>ml</Text>
                  </View>
                </View>

                {/* Add Glass Button */}
                <TouchableOpacity style={[styles.addGlassBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add-circle" size={20} color={colors.text === '#FFFFFF' ? '#000000' : '#FFFFFF'} />
                  <Text style={[styles.addGlassBtnText, { color: colors.text === '#FFFFFF' ? '#000000' : '#FFFFFF' }]}>Add Glass</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </ScrollView>

      
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SavedWorkouts')}>
          <MaterialCommunityIcons name="dumbbell" size={28} color="#666" />
          <Text style={styles.navTxt}>My Workouts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="people" size={28} color="#666" /><Text style={styles.navTxt}>Community</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Foods')}>
            <LinearGradient colors={[colors.primary, colors.secondary] as any} style={styles.centerCircle}>
                <MaterialCommunityIcons name="food-apple" size={30} color={colors.text === '#FFFFFF' ? '#000000' : '#FFFFFF'} /> 
            </LinearGradient>
            <Text style={styles.navTxt}>Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={toggleTheme}>
          <MaterialCommunityIcons name={theme === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'} size={28} color={colors.primary} />
          <Text style={styles.navTxt}>{theme === 'dark' ? 'Light' : 'Dark'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="settings-sharp" size={26} color="#666" /><Text style={styles.navTxt}>Settings</Text></TouchableOpacity>
      </View>

      <MediaPickerSheet isVisible={isSheetVisible} onClose={() => setIsSheetVisible(false)} onSelectMedia={() => {}} />
    </View>
  );
}


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
        <TouchableOpacity style={[mealStyles.card, open && { borderColor: colors.primary }]} onPress={() => setOpen(!open)} activeOpacity={0.9}>
            <View style={mealStyles.header}>
                <View>
                  <Text style={[mealStyles.title, { color: colors.text }]}>{title}</Text>
                  <Text style={[mealStyles.subTitle, { color: colors.primary }]}>{foodItems.length} foods</Text>
                </View>
                <Feather name={open ? "chevron-up" : "chevron-right"} size={20} color={colors.primary} />
            </View>
            {open && (
                <View style={mealStyles.content}>
                    {/* Image Gallery - First 3 images */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mealStyles.imageGallery}>
                        {foodItems.slice(0, 3).map((food, index) => (
                            <View key={`gallery-${index}`} style={mealStyles.galleryItem}>
                                <Image 
                                    source={{ uri: food.imageUrl }} 
                                    style={mealStyles.galleryImg} 
                                />
                            </View>
                        ))}
                    </ScrollView>

                    {/* Detailed List */}
                    {foodItems.map((food, index) => (
                        <View key={index} style={[mealStyles.foodItem, { backgroundColor: colors.background }]}>
                            <Image 
                                source={{ uri: food.imageUrl }} 
                                style={mealStyles.foodImg} 
                            />
                            <View style={mealStyles.foodDetails}>
                                <Text style={[mealStyles.foodName, { color: colors.primary }]}>{food.name}</Text>
                                <Text style={[mealStyles.foodDescription, { color: colors.textSecondary }]}>{food.description}</Text>
                                <View style={mealStyles.nutritionRow}>
                                    <View style={[mealStyles.nutritionItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>Cal</Text>
                                        <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.calories}</Text>
                                    </View>
                                    <View style={[mealStyles.nutritionItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>P</Text>
                                        <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.protein}</Text>
                                    </View>
                                    <View style={[mealStyles.nutritionItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>C</Text>
                                        <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.carbs}</Text>
                                    </View>
                                    <View style={[mealStyles.nutritionItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

const styles = StyleSheet.create({
    main: { flex: 1, backgroundColor: '#000' },
    backgroundImage: { 
      position: 'absolute', 
      top: 0, 
      right: 0, 
      width: '100%', 
      height: '100%', 
      opacity: 0.2,
      resizeMode: 'contain',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
    welcomeTxt: { color: '#888', fontSize: 16 },
    nameTxt: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    emojiIcon: { fontSize: 28, marginLeft: 8, fontWeight: '800' },
    headerBtnsContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
    chatbotBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,215,0,0.2)' },
    storiesContainer: { marginVertical: 25 },
    section: { paddingHorizontal: 20, marginBottom: 20, gap: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
    sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    seeAll: { color: GOLD, fontSize: 14, fontWeight: '500' },
    bottomNav: { position: 'absolute', bottom: 25, left: 20, right: 20, height: 75, backgroundColor: 'rgba(25, 25, 25, 0.95)', borderRadius: 25, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    navTxt: { color: WHITE, fontSize: 10, marginTop: 4, fontWeight: '600' },
    navItemCenter: { top: -20 },
    centerCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    // Daily Steps Styles
    stepsCard: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    stepsLeft: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    stepsCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    stepsCount: {
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 30,
    },
    stepsSmallText: {
      color: '#AAA',
      fontSize: 10,
      fontWeight: '600',
    },
    stepsRight: {
      flex: 1,
    },
    progressContainer: {
      marginBottom: 16,
    },
    progressBarBg: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      width: '0%',
      height: '100%',
    },
    progressText: {
      fontSize: 11,
      fontWeight: '500',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    statBadge: {
      alignItems: 'center',
      marginBottom: 8,
    },
    statItemValue: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    statItemLabel: {
      color: '#888',
      fontSize: 10,
      fontWeight: '600',
    },
    // Daily Water Intake Styles
    waterCard: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    waterLeft: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    waterCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    waterCount: {
      fontSize: 32,
      fontWeight: '900',
      lineHeight: 35,
    },
    waterRight: {
      flex: 1,
    },
    waterProgressContainer: {
      marginBottom: 14,
    },
    waterProgressLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 8,
    },
    waterProgressBarBg: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
    },
    waterProgressBarFill: {
      width: '0%',
      height: '100%',
    },
    waterStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12,
    },
    waterStatItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    waterStatValue: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    waterStatLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 2,
    },
    waterStatUnit: {
      color: '#888',
      fontSize: 8,
      fontWeight: '500',
    },
    addGlassBtn: {
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    addGlassBtnText: {
      color: BLACK,
      fontSize: 13,
      fontWeight: '700',
    },
});

const storyStyles = StyleSheet.create({
    container: { alignItems: 'center', marginRight: 18 },
    ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    img: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#222' },
    txt: { color: 'rgba(187, 187, 187, 0.7)', fontSize: 11, fontWeight: '500' },
    add: { position: 'absolute', bottom: 2, right: 2, backgroundColor: GOLD, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A' }
});

const mealStyles = StyleSheet.create({
    card: { backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#FFF', fontSize: 17, fontWeight: '700' },
    subTitle: { fontSize: 12, marginTop: 2 },
    content: { marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 12 },
    mealImg: { width: 110, height: 110, borderRadius: 15, marginRight: 12 },
    
    // Image Gallery Styles
    imageGallery: { marginBottom: 12, paddingVertical: 8 },
    galleryItem: { marginRight: 10, borderRadius: 15, overflow: 'hidden' },
    galleryImg: { width: 130, height: 130, borderRadius: 15, backgroundColor: '#222' },
    
    foodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
    foodImg: { width: 100, height: 100, borderRadius: 12, marginRight: 12, backgroundColor: '#222' },
    foodDetails: { flex: 1 },
    foodName: { color: GOLD, fontSize: 14, fontWeight: '700', marginBottom: 8 },
    
    
    nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 2, marginTop: 4 },
    nutritionItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 4, alignItems: 'center' },
    nutritionLabel: { color: '#888', fontSize: 8, fontWeight: '600', marginBottom: 1 },
    nutritionValue: { color: '#FFF', fontSize: 9, fontWeight: '700' },
    foodDescription: { color: '#AAA', fontSize: 11, marginTop: 2, marginBottom: 4, fontStyle: 'italic' }
});