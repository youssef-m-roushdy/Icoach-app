import React, { useMemo, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useColorScheme, Image } from 'react-native';
import { useAuth } from '../context';
import { useTheme } from '../context/ThemeContext';

import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignupScreen';
import SignInScreen from '../screens/SignInScreen';
import HomeScreen from '../screens/HomeScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditBodyInfoScreen from '../screens/EditBodyInfoScreen';
import FoodsScreen from '../screens/FoodsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import LiveWorkoutScreen from '../screens/LiveWorkoutScreen';
import SavedWorkoutsScreen from '../screens/SavedWorkoutsScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';

import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  BackHandler,
  Animated,
  Easing,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';
import { createToastConfig } from '../constants/toastConfig';
import GymProgressScreen from '@/screens/GymProgressScreen';
import WorkoutSessionScreen from '@/screens/WorkoutSessionScreen';

// Type definition temporarily added to fix 'Messages' error
export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Login: undefined;
  AuthCallback: undefined;
  Onboarding: undefined;
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EditBodyInfo: undefined;
  Foods: undefined;
  Messages: undefined;
  Workouts: undefined;
  LiveWorkout: undefined;
  SavedWorkouts: undefined;
  WorkoutHistory: undefined;
  WorkoutSession: { 
    workoutId: number; 
    workoutName: string; 
    workoutImage?: string;
  };
  GymProgress: undefined;
  EmailVerification: undefined;
  ChangePassword: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string; resetToken?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Drawer Menu Component
interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

function DrawerMenu({ visible, onClose, navigation }: DrawerMenuProps) {
  const { logout, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = (screen: keyof RootStackParamList) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleProfilePress = () => {
    onClose();
    navigation.navigate('Profile');
  };

  // Avatar resolution logic
  const rawAvatar = user?.photoURL || user?.avatar;
  const avatarSource =
    rawAvatar && typeof rawAvatar === 'string' && rawAvatar.startsWith('http')
      ? { uri: rawAvatar }
      : null;

  const getUserFullName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.username) {
      return user.username;
    }
    return 'User';
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  };

  // Group menu items by category - removed MAIN section
  const workoutMenuItems = [
    { icon: 'home', label: 'Home', screen: 'Home' as const },
    { icon: 'restaurant', label: 'Foods', screen: 'Foods' as const },
    { icon: 'fitness-center', label: 'Workouts', screen: 'Workouts' as const },
    { icon: 'bookmark', label: 'My Workouts', screen: 'SavedWorkouts' as const },
    { icon: 'history', label: 'Workout History', screen: 'WorkoutHistory' as const },
    { icon: 'trending-up', label: 'My Progress', screen: 'GymProgress' as const },
    { icon: 'videocam', label: 'AI Workout', screen: 'LiveWorkout' as const },
    { icon: 'message', label: 'Messages', screen: 'Messages' as const },
  ];

  const renderMenuItem = (item: { icon: any; label: string; screen: keyof RootStackParamList }) => (
    <TouchableOpacity
      key={item.screen}
      style={styles.menuItem}
      onPress={() => handleNavigate(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.primary + '15' }]}>
        <MaterialIcons name={item.icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.menuText, { color: colors.text }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.background,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header with user info - clickable to profile */}
        <TouchableOpacity 
          style={[styles.drawerHeader, { borderBottomColor: 'transparent' }]} 
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.userProfileContainer}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {getUserInitials()}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {getUserFullName()}
              </Text>
              <Text style={[styles.userEmail, { color: colors.subtleText }]}>
                {user?.email || ''}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
          </View>
        </TouchableOpacity>

        {/* Scrollable menu items - no section headers */}
        <ScrollView 
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
        >
          {workoutMenuItems.map(renderMenuItem)}
        </ScrollView>

        {/* Logout button fixed at bottom */}
        <View style={[styles.logoutSection, { borderTopColor: 'transparent' }]}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.logoutIconContainer, { backgroundColor: '#ef444415' }]}>
              <MaterialIcons name="logout" size={22} color="#ef4444" />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState<any>(null);

  const toastConfig = useMemo(() => createToastConfig(!!isDark), [isDark]);

  if (isLoading) {
    return (
      <View style={[stylesGlobal.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Check if user needs onboarding (no body information filled)
  const needsOnboarding =
    isAuthenticated && user && !hasCompletedBodyInformation(user);

  return (
    <>
      <NavigationContainer ref={(nav) => setNavigationRef(nav)}>
        <Stack.Navigator
          screenOptions={({ navigation }) => ({
            headerShown: isAuthenticated,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerLeft: isAuthenticated
              ? () => (
                  <TouchableOpacity
                    style={{ marginLeft: 15 }}
                    onPress={() => setDrawerVisible(true)}
                  >
                    <MaterialIcons
                      name="menu"
                      size={28}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )
              : undefined,
          })}
        >
          {!isAuthenticated ? (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SignUp"
                component={SignUpScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SignIn"
                component={SignInScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Login"
                component={SignInScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AuthCallback"
                component={AuthCallbackScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : needsOnboarding ? (
            <>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={({ navigation }) => ({
                  title: 'ICoach',
                  headerRight: () => (
                    <TouchableOpacity
                      style={{ marginRight: 15 }}
                      onPress={() => navigation.navigate('Messages' as never)}
                    >
                      <MaterialIcons
                        name="message"
                        size={28}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  ),
                })}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
              />
              <Stack.Screen
                name="Foods"
                component={FoodsScreen}
                options={{ title: 'Foods' }}
              />
              <Stack.Screen
                name="Workouts"
                component={WorkoutsScreen}
                options={{ title: 'Workouts' }}
              />
              <Stack.Screen
                name="SavedWorkouts"
                component={SavedWorkoutsScreen}
                options={{ title: 'My Workouts' }}
              />
              <Stack.Screen
                name="WorkoutHistory"
                component={WorkoutHistoryScreen}
                options={{ title: 'Workout History' }}
              />
              <Stack.Screen
                name="WorkoutSession"
                component={WorkoutSessionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LiveWorkout"
                component={LiveWorkoutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ title: 'Edit Profile' }}
              />
              <Stack.Screen
                name="EditBodyInfo"
                component={EditBodyInfoScreen}
                options={{ title: 'Edit Body Info' }}
              />
              <Stack.Screen
                name="Messages"
                component={MessagesScreen}
                options={{ title: 'Messages' }}
              />
              <Stack.Screen
                name="EmailVerification"
                component={EmailVerificationScreen}
                options={{ title: 'Verify Email' }}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ title: 'Change Password' }}
              />
              <Stack.Screen name="GymProgress" component={GymProgressScreen} options={{ title: 'My Progress' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <Toast
        config={toastConfig}
        position="top"
        topOffset={55}
        visibilityTime={3000}
        autoHide
      />

      {isAuthenticated && navigationRef && (
        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigationRef}
        />
      )}
    </>
  );
};

// Helper function to check if user has completed body information
const hasCompletedBodyInformation = (user: any): boolean => {
  return !!(
    user.gender ||
    user.dateOfBirth ||
    user.height ||
    user.weight ||
    user.fitnessGoal ||
    user.activityLevel ||
    user.bodyFatPercentage
  );
};

const styles = StyleSheet.create({
  // Drawer styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
  },
});

const stylesGlobal = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});