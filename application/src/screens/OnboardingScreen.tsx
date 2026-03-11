import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Accent colors (these don't change between themes)
const ONBOARDING_COLORS = {
  primary: '#C5981B',
  primaryLight: 'rgba(197, 152, 27, 0.15)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// Date picker wheel component
const DatePickerWheel = ({ 
  items, 
  selectedIndex, 
  onSelect, 
  width = 80,
  suffix = '' 
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
  suffix?: string;
}) => {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const itemHeight = 50;
  
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
  }, []);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < items.length && index !== selectedIndex) {
      onSelect(index);
    }
  };

  return (
    <View style={[{ width, height: itemHeight * 3 }]}>
      <View style={styles.pickerHighlight} pointerEvents="none" />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: itemHeight }}
      >
        {items.map((item, index) => (
          <View key={index} style={[styles.pickerItem, { height: itemHeight }]}>
            <Text style={[
              styles.pickerItemText,
              { color: colors.subtleText },
              index === selectedIndex && [styles.pickerItemTextSelected, { color: colors.text }]
            ]}>
              {item}{suffix}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// Vertical Height ruler component
const HeightRuler = ({ 
  value, 
  onChange, 
  min = 120, 
  max = 220 
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) => {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const tickHeight = 20;
  const rulerHeight = 320;
  const totalTicks = max - min;
  
  useEffect(() => {
    const position = (max - value) * tickHeight;
    scrollViewRef.current?.scrollTo({ y: position - rulerHeight / 2, animated: false });
  }, []);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y + rulerHeight / 2;
    const newValue = max - Math.round(y / tickHeight);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };

  return (
    <View style={styles.verticalRulerWrapper}>
      <View style={styles.verticalRulerIndicator} pointerEvents="none" />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: rulerHeight / 2 }}
        decelerationRate="fast"
        style={styles.verticalRulerScroll}
        nestedScrollEnabled={true}
        bounces={true}
      >
        {Array.from({ length: totalTicks + 1 }, (_, i) => {
          const tickValue = max - i;
          const isMajor = tickValue % 10 === 0;
          const isMid = tickValue % 5 === 0 && !isMajor;
          
          return (
            <View key={i} style={styles.verticalTickContainer}>
              <View style={styles.verticalTickRow}>
                {isMajor ? (
                  <Text style={[styles.verticalTickLabel, { color: colors.text }]}>{tickValue}</Text>
                ) : (
                  <View style={styles.verticalTickLabelSpacer} />
                )}
                <View style={[
                  styles.verticalTick,
                  { backgroundColor: colors.divider },
                  isMajor && [styles.verticalTickMajor, { backgroundColor: colors.text }],
                  isMid && [styles.verticalTickMid, { backgroundColor: colors.subtleText }],
                ]} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Weight circular gauge
const WeightGauge = ({ 
  value, 
  onChange, 
  height 
}: {
  value: number;
  onChange: (val: number) => void;
  height: number;
}) => {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const tickWidth = 8;
  const min = 30;
  const max = 200;
  
  useEffect(() => {
    const position = (value - min) * tickWidth;
    scrollViewRef.current?.scrollTo({ x: position - SCREEN_WIDTH / 2 + 60, animated: false });
  }, []);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x + SCREEN_WIDTH / 2 - 60;
    const newValue = Math.round(x / tickWidth) + min;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };

  // Calculate BMI
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? value / (heightInMeters * heightInMeters) : 0;
  
  const getBMICategory = () => {
    if (bmi < 18.5) return { label: 'Underweight', color: ONBOARDING_COLORS.warning };
    if (bmi < 25) return { label: 'Normal', color: ONBOARDING_COLORS.success };
    if (bmi < 30) return { label: 'Overweight', color: ONBOARDING_COLORS.warning };
    return { label: 'Obese', color: ONBOARDING_COLORS.error };
  };

  const bmiInfo = getBMICategory();

  return (
    <View style={styles.weightGaugeContainer}>
      {/* BMI Categories */}
      <View style={styles.bmiCategories}>
        <View style={styles.bmiCategory}>
          <View style={[styles.bmiDot, { backgroundColor: ONBOARDING_COLORS.warning }]} />
          <Text style={[styles.bmiLabel, { color: colors.subtleText }, bmi < 18.5 && [styles.bmiLabelActive, { color: colors.text }]]}>Underweight</Text>
        </View>
        <View style={styles.bmiCategory}>
          <View style={[styles.bmiDot, { backgroundColor: ONBOARDING_COLORS.success }]} />
          <Text style={[styles.bmiLabel, { color: colors.subtleText }, bmi >= 18.5 && bmi < 25 && [styles.bmiLabelActive, { color: colors.text }]]}>Normal</Text>
        </View>
        <View style={styles.bmiCategory}>
          <View style={[styles.bmiDot, { backgroundColor: ONBOARDING_COLORS.warning }]} />
          <Text style={[styles.bmiLabel, { color: colors.subtleText }, bmi >= 25 && bmi < 30 && [styles.bmiLabelActive, { color: colors.text }]]}>Overweight</Text>
        </View>
      </View>

      {/* Weight Display */}
      <View style={styles.weightDisplay}>
        <Text style={[styles.weightValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
        <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>
      </View>

      {/* Weight Ruler */}
      <View style={styles.weightRulerContainer}>
        <View style={styles.weightIndicator} />
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
          contentContainerStyle={{ paddingHorizontal: SCREEN_WIDTH / 2 - 60 }}
          decelerationRate="fast"
        >
          {Array.from({ length: (max - min) * 2 + 1 }, (_, i) => {
            const tickValue = min + i * 0.5;
            const isMajor = tickValue % 5 === 0;
            
            return (
              <View key={i} style={[styles.weightTickContainer, { width: tickWidth }]}>
                <View style={[
                  styles.weightTick,
                  { backgroundColor: colors.divider },
                  isMajor && [styles.weightTickMajor, { backgroundColor: colors.text }],
                ]} />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* BMI Info */}
      <View style={[styles.bmiInfoBox, { borderColor: bmiInfo.color }]}>
        <Text style={[styles.bmiInfoLabel, { color: colors.textSecondary }]}>Your BMI shows you are</Text>
        <Text style={[styles.bmiInfoValue, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { colors } = useTheme();
  const { user, token, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1: Gender
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  
  // Step 2: Birthday
  const currentYear = new Date().getFullYear();
  const [birthDay, setBirthDay] = useState(15);
  const [birthMonth, setBirthMonth] = useState(6);
  const [birthYear, setBirthYear] = useState(1995);

  // Step 3: Height
  const [height, setHeight] = useState(170);

  // Step 4: Weight
  const [weight, setWeight] = useState(70);

  // Step 5: Fitness Goals
  const [fitnessGoal, setFitnessGoal] = useState<'weight_loss' | 'muscle_gain' | 'maintenance' | ''>('');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | ''>('');

  const totalSteps = 5;

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 80 }, (_, i) => String(currentYear - 80 + i));

  const animateSlide = (direction: 'next' | 'back') => {
    const toValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      animateSlide('next');
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      animateSlide('back');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigation.replace('Home');
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    setIsLoading(true);
    try {
      const dateOfBirth = `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
      
      const bodyData: any = {
        gender: gender || undefined,
        dateOfBirth,
        height,
        weight,
        fitnessGoal: fitnessGoal || undefined,
        activityLevel: activityLevel || undefined,
      };

      // Remove undefined values
      Object.keys(bodyData).forEach(key => {
        if (bodyData[key] === undefined) delete bodyData[key];
      });

      if (Object.keys(bodyData).length > 0) {
        const response = await userService.updateBodyInformation(bodyData, token);
        
        if (response.data && user) {
          updateUser({ ...user, ...response.data });
        }
        
        Alert.alert('Success', 'Profile completed successfully!', [
          { text: 'OK', onPress: () => navigation.replace('Home') }
        ]);
      } else {
        navigation.replace('Home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
        <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>{currentStep}/{totalSteps}</Text>
    </View>
  );

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What's Your Gender</Text>

      <View style={styles.genderContainer}>
        {/* Male Option */}
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setGender('male')}
        >
          <View style={[
            styles.genderIconCircle,
            { borderColor: colors.divider },
            gender === 'male' && styles.genderIconCircleActive,
          ]}>
            <Ionicons name="male" size={50} color={gender === 'male' ? '#FFFFFF' : colors.text} />
          </View>
          <Text style={[styles.genderText, { color: colors.text }]}>Male</Text>
        </TouchableOpacity>

        {/* Female Option */}
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setGender('female')}
        >
          <View style={[
            styles.genderIconCircle,
            { borderColor: colors.divider },
            gender === 'female' && styles.genderIconCircleActive,
          ]}>
            <Ionicons name="female" size={50} color={gender === 'female' ? '#FFFFFF' : colors.text} />
          </View>
          <Text style={[styles.genderText, { color: colors.text }]}>Female</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What's your Birthday?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Your birthday helps us customize your experience based on your age</Text>

      <View style={[styles.datePickerContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
        <DatePickerWheel
          items={days}
          selectedIndex={birthDay - 1}
          onSelect={(index) => setBirthDay(index + 1)}
          width={70}
        />
        <DatePickerWheel
          items={months}
          selectedIndex={birthMonth}
          onSelect={setBirthMonth}
          width={80}
        />
        <DatePickerWheel
          items={years}
          selectedIndex={birthYear - (currentYear - 80)}
          onSelect={(index) => setBirthYear(currentYear - 80 + index)}
          width={90}
        />
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Your Height</Text>

      {/* Height Display - Professional Layout */}
      <View style={styles.heightScreenContainer}>
        {/* Main content area with person and ruler */}
        <View style={styles.heightMainContent}>
          {/* Fitness person image - based on selected gender */}
          <View style={styles.heightImageWrapper}>
            <Image 
              source={gender === 'female' 
                ? require('../../assets/height-female.png') 
                : require('../../assets/height-male.png')
              } 
              style={gender === 'female' ? styles.heightPersonImageFemale : styles.heightPersonImageMale}
              resizeMode="contain"
            />
            {/* Height line indicator */}
            <View style={styles.heightLineIndicator} />
          </View>

          {/* Vertical Ruler on the right */}
          <View style={styles.heightRulerSide}>
            <HeightRuler value={height} onChange={setHeight} />
          </View>
        </View>

        {/* Height value display at bottom */}
        <View style={[styles.heightValueDisplay, { backgroundColor: colors.surface }]}>
          <Text style={styles.heightValue}>{height}</Text>
          <Text style={[styles.heightUnit, { color: colors.textSecondary }]}>cm</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Your Current Weight</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>We use your weight to tailor your fitness goals and track your progress</Text>

      <WeightGauge value={weight} onChange={setWeight} height={height} />
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Fitness Goals</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>What do you want to achieve?</Text>

      <View style={styles.goalsContainer}>
        {[
          { id: 'weight_loss', label: 'Lose Weight', icon: 'trending-down' },
          { id: 'muscle_gain', label: 'Build Muscle', icon: 'fitness' },
          { id: 'maintenance', label: 'Stay Fit', icon: 'heart' },
        ].map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              { backgroundColor: colors.surface, borderColor: colors.divider },
              fitnessGoal === goal.id && styles.goalCardActive,
            ]}
            onPress={() => setFitnessGoal(goal.id as any)}
          >
            <Ionicons 
              name={goal.icon as any} 
              size={28} 
              color={fitnessGoal === goal.id ? '#FFFFFF' : ONBOARDING_COLORS.primary} 
            />
            <Text style={[styles.goalText, { color: colors.text }, fitnessGoal === goal.id && styles.goalTextActive]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 24, color: colors.text }]}>Activity Level</Text>
      <View style={styles.activityContainer}>
        {[
          { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
          { id: 'lightly_active', label: 'Light', desc: '1-3 days/week' },
          { id: 'moderately_active', label: 'Moderate', desc: '3-5 days/week' },
          { id: 'very_active', label: 'Active', desc: '6-7 days/week' },
        ].map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.activityCard,
              { backgroundColor: colors.surface, borderColor: colors.divider },
              activityLevel === level.id && styles.activityCardActive,
            ]}
            onPress={() => setActivityLevel(level.id as any)}
          >
            <Text style={[styles.activityLabel, { color: colors.text }, activityLevel === level.id && styles.activityLabelActive]}>
              {level.label}
            </Text>
            <Text style={[styles.activityDesc, { color: colors.textSecondary }, activityLevel === level.id && styles.activityDescActive]}>
              {level.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        {currentStep > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={ONBOARDING_COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        
        <TouchableOpacity onPress={handleSkip} style={styles.headerButton}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: ONBOARDING_COLORS.primary }]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Get Started' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerButton: {
    width: 70,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: ONBOARDING_COLORS.primary,
    fontWeight: '500',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Gender styles
  genderContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 30,
  },
  genderOption: {
    alignItems: 'center',
  },
  genderIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  genderIconCircleActive: {
    backgroundColor: ONBOARDING_COLORS.primary,
    borderColor: ONBOARDING_COLORS.primary,
  },
  genderIconCircleInactive: {
    backgroundColor: 'transparent',
  },
  genderText: {
    fontSize: 20,
    fontWeight: '600',
  },
  // Date picker styles
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderWidth: 1,
  },
  pickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 50,
    marginTop: -25,
    backgroundColor: ONBOARDING_COLORS.primaryLight,
    borderRadius: 10,
    zIndex: -1,
  },
  pickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 20,
  },
  pickerItemTextSelected: {
    fontSize: 24,
    fontWeight: '700',
  },
  // Height styles - Professional Layout
  heightScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  heightMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heightImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heightPersonImageMale: {
    width: 280,
    height: 400,
  },
  heightPersonImageFemale: {
    width: 240,
    height: 380,
  },
  heightLineIndicator: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: -10,
    height: 2,
    backgroundColor: ONBOARDING_COLORS.primary,
  },
  heightRulerSide: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  heightValueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  heightValue: {
    fontSize: 64,
    fontWeight: '700',
    color: ONBOARDING_COLORS.primary,
  },
  heightUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  personSilhouette: {
    opacity: 0.6,
  },
  // Vertical ruler styles
  verticalRulerWrapper: {
    height: 320,
    width: 100,
    position: 'relative',
  },
  verticalRulerIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ONBOARDING_COLORS.primary,
    zIndex: 10,
    marginTop: -1.5,
  },
  verticalRulerScroll: {
    flex: 1,
  },
  verticalTickContainer: {
    height: 20,
    justifyContent: 'center',
    overflow: 'visible',
  },
  verticalTickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  verticalTick: {
    width: 20,
    height: 1,
  },
  verticalTickMajor: {
    width: 35,
    height: 2,
  },
  verticalTickMid: {
    width: 28,
    height: 1.5,
  },
  verticalTickLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 30,
    textAlign: 'right',
  },
  verticalTickLabelSpacer: {
    width: 38,
  },
  // Weight styles
  weightGaugeContainer: {
    alignItems: 'center',
  },
  bmiCategories: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  bmiCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bmiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiLabel: {
    fontSize: 14,
  },
  bmiLabelActive: {
    fontWeight: '600',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  weightValue: {
    fontSize: 72,
    fontWeight: '700',
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '500',
    marginLeft: 8,
  },
  weightRulerContainer: {
    height: 60,
    width: '100%',
  },
  weightIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 40,
    backgroundColor: ONBOARDING_COLORS.primary,
    zIndex: 10,
  },
  weightTickContainer: {
    alignItems: 'center',
  },
  weightTick: {
    width: 1,
    height: 20,
  },
  weightTickMajor: {
    height: 35,
    width: 2,
  },
  bmiInfoBox: {
    marginTop: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bmiInfoLabel: {
    fontSize: 14,
  },
  bmiInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  // Goals styles
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  goalsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  goalCardActive: {
    backgroundColor: ONBOARDING_COLORS.primary,
    borderColor: ONBOARDING_COLORS.primary,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  goalTextActive: {
    color: '#FFFFFF',
  },
  activityContainer: {
    gap: 10,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  activityCardActive: {
    backgroundColor: ONBOARDING_COLORS.primary,
    borderColor: ONBOARDING_COLORS.primary,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityLabelActive: {
    color: '#FFFFFF',
  },
  activityDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  activityDescActive: {
    color: 'rgba(0,0,0,0.6)',
  },
  // Bottom button
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});