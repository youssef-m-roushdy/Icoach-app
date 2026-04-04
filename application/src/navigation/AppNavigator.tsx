import React, { useMemo, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme, Image, Platform } from 'react-native';
import { useAuth } from '../context';
import { useTheme } from '../context/ThemeContext';
import { useSystemNavigation } from '../context/SystemNavigationContext';

// Screen imports
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
import ChatbotScreen from '../screens/ChatbotScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import GymProgressScreen from '../screens/GymProgressScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';

import { SystemNavigationBarProtector } from '../components/SystemNavigationBarProtector';

import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
} from 'react-native';

import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';


// Type definitions
export type RootStackParamList = {
  // Auth screens
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Login: undefined;
  AuthCallback: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string; resetToken?: string };
  
  // Main tabs
  MainTabs: undefined;
  
  // Profile and settings
  Profile: undefined;
  EditProfile: undefined;
  EditBodyInfo: undefined;
  ChangePassword: undefined;
  
  // Workout screens
  SavedWorkouts: undefined;
  WorkoutHistory: undefined;
  WorkoutSession: { 
    workoutId: number; 
    workoutName: string; 
    workoutImage?: string;
  };
  
  // Messages
  Messages: undefined;
  
  // Onboarding
  Onboarding: undefined;
  
  // Email verification
  EmailVerification: undefined;
  
  // Other screens
  GymProgress: undefined;
  LiveWorkout: undefined;
  Foods: undefined;
  Workouts: undefined;
  Home: undefined;
  
  // NEW SCREENS - Add these
  Chatbot: undefined;
  Notifications: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Nutrition: undefined;
  Workouts: undefined;
  Progress: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Header Component with Profile Picture and Menu
interface CustomHeaderProps {
  title?: string;
  onProfilePress: () => void;
  onMenuPress: () => void;
  colors: any;
  userImage?: any;
  showBack?: boolean;
  onBackPress?: () => void;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ 
  title,
  onProfilePress, 
  onMenuPress,
  colors,
  userImage,
  showBack = false,
  onBackPress
}) => {
  const [profilePressed, setProfilePressed] = useState(false);
  const [menuPressed, setMenuPressed] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      stylesGlobal.headerContainer,
      { 
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }
    ]}>
      
      <View style={stylesGlobal.headerContent}>
        {/* Left Section - Menu Button or Back Button */}
        <View style={stylesGlobal.leftSection}>
          {showBack ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={[
                stylesGlobal.headerButton,
                menuPressed && { backgroundColor: colors.primary + '10' }
              ]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onMenuPress}
              onPressIn={() => setMenuPressed(true)}
              onPressOut={() => setMenuPressed(false)}
              activeOpacity={0.7}
              style={[
                stylesGlobal.headerButton,
                menuPressed && { backgroundColor: colors.primary + '10' }
              ]}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section - Title or Logo */}
        <View style={stylesGlobal.centerSection}>
          {title ? (
            <Text style={[stylesGlobal.headerTitle, { color: colors.text }]}>
              {title}
            </Text>
          ) : (
            <Text style={[stylesGlobal.logoText, { color: colors.primary }]}>
              ICoach
            </Text>
          )}
        </View>

        {/* Right Section - Profile Picture */}
        <View style={stylesGlobal.rightSection}>
          <TouchableOpacity
            onPress={onProfilePress}
            onPressIn={() => setProfilePressed(true)}
            onPressOut={() => setProfilePressed(false)}
            activeOpacity={0.7}
            style={[
              stylesGlobal.profileButton,
              profilePressed && { backgroundColor: colors.primary + '10' }
            ]}
          >
            <Image 
              source={userImage || { uri: 'https://ui-avatars.com/api/?name=User&background=FFD700&color=000&bold=true' }} 
              style={stylesGlobal.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Custom Tab Bar Component with Modern Design - Floating Capsule
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();

  const threeButtonInset = Math.max(40, 0);
  const geastureSwapInset = Math.max(0, 5);
  // Detect if using 3-button phone navigation (Android 3-buttons usually have an inset > 24px)
  const isThreeButtonNav = systemBottomInset > 24;

  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key].options;
  if (currentOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[
      styles.tabBarWrapper,
      {
        bottom: isThreeButtonNav ? threeButtonInset : geastureSwapInset,
      }
    ]}>
      <View style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.authCardBg || colors.surface,
          borderColor: colors.authCardBorder || colors.border,
          paddingBottom: Platform.OS === 'android' ? 16 : 20, // Internal padding only
        }
      ]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

          const isFocused = state.index === index;

          // ... (keep the rest unchanged)

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get icon based on route name
          const renderIcon = () => {
            const iconColor = isFocused ? colors.primary : colors.subtleText;
            const iconSize = 22;

            switch (route.name) {
              case 'Home':
                return <Ionicons name={isFocused ? "home" : "home-outline"} size={iconSize} color={iconColor} />;
              case 'Workouts':
                return <Ionicons name={isFocused ? "barbell" : "barbell-outline"} size={iconSize} color={iconColor} />;
              case 'Progress':
                return <Ionicons name={isFocused ? "trending-up" : "trending-up-outline"} size={iconSize} color={iconColor} />;
              case 'Nutrition':
                return <Ionicons name={isFocused ? "restaurant" : "restaurant-outline"} size={iconSize} color={iconColor} />;
              case 'Profile':
                return <Ionicons name={isFocused ? "person" : "person-outline"} size={iconSize} color={iconColor} />;
              default:
                return <Ionicons name="help-outline" size={iconSize} color={iconColor} />;
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabBarItem}
              activeOpacity={0.7}
            >
              <View style={[
                styles.tabIconContainer,
                isFocused && { transform: [{ scale: 1.05 }] }
              ]}>
                {renderIcon()}
              </View>
              <Text style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.primary : colors.subtleText,
                  fontWeight: isFocused ? '600' : '400',
                  marginTop: -2,
                }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Bottom Tab Navigator (Floating Navigation)
function BottomTabNavigator() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' }
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: 'Home' }}
        />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{ tabBarLabel: 'Workouts' }}
      />
      <Tab.Screen
        name="Progress"
        component={GymProgressScreen}
        options={{ tabBarLabel: 'Progress' }}
      />
      <Tab.Screen
        name="Nutrition"
        component={FoodsScreen}
        options={{ tabBarLabel: 'Nutrition' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
    </View>
  );
}

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

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      logout();
    }, 100);
  };

  const handleNavigate = (screen: keyof RootStackParamList, params?: any) => {
    onClose();
    // Small delay to allow drawer animation to complete
    setTimeout(() => {
      navigation.navigate(screen, params);
    }, 150);
  };

  const handleProfilePress = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate('Profile');
    }, 150);
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

  // Menu items
  const menuSections = [
    {
      title: 'MAIN',
      items: [
        { icon: 'home', label: 'Home', screen: 'MainTabs' as const, params: { screen: 'Home' } },
        { icon: 'person', label: 'My Profile', screen: 'Profile' as const },
        { icon: 'restaurant', label: 'Nutrition', screen: 'MainTabs' as const, params: { screen: 'Nutrition' } },
        { icon: 'fitness-center', label: 'Workouts', screen: 'MainTabs' as const, params: { screen: 'Workouts' } },
        { icon: 'bookmark', label: 'Saved Workouts', screen: 'SavedWorkouts' as const },
        { icon: 'history', label: 'Workout History', screen: 'WorkoutHistory' as const },
        { icon: 'trending-up', label: 'My Progress', screen: 'MainTabs' as const, params: { screen: 'Progress' } },
        { icon: 'videocam', label: 'AI Coach', screen: 'LiveWorkout' as const },
        { icon: 'chat', label: 'AI Coach', screen: 'Chatbot' as const },
        { icon: 'notifications', label: 'Notifications', screen: 'Notifications' as const },
      ]
    },
    {
      title: 'SOCIAL',
      items: [
        { icon: 'message', label: 'Messages', screen: 'Messages' as const },
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { icon: 'settings', label: 'Settings', screen: 'EditProfile' as const },
        { icon: 'help', label: 'Help & Support', screen: 'Messages' as const },
        { icon: 'info', label: 'About', screen: 'Messages' as const },
      ]
    }
  ];

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.label}
      style={styles.menuItem}
      onPress={() => {
        if (item.params) {
          handleNavigate(item.screen, item.params);
        } else {
          handleNavigate(item.screen);
        }
      }}
      activeOpacity={0.6}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.primary + '08' }]}>
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
        {/* Header with user info */}
        <TouchableOpacity 
          style={styles.drawerHeader} 
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.userProfileContainer}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary + '12' }]}>
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

        {/* Scrollable menu items */}
        <ScrollView 
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
        >
          {menuSections.map((section, index) => (
            <View key={section.title} style={styles.menuSection}>
              {index > 0 && <View style={[styles.sectionDivider, { backgroundColor: colors.border + '20' }]} />}
              <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>
                {section.title}
              </Text>
              {section.items.map(renderMenuItem)}
            </View>
          ))}
        </ScrollView>

        {/* Logout button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <View style={[styles.logoutIconContainer, { backgroundColor: '#ef444408' }]}>
              <MaterialIcons name="logout" size={22} color="#ef4444" />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// Main App Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState<any>(null);

  // Close drawer when navigation state changes (user navigates to a different screen)
  useEffect(() => {
    if (!navigationRef) return;

    const unsubscribe = navigationRef.addListener('state', () => {
      // Close drawer whenever navigation occurs
      if (drawerVisible) {
        setDrawerVisible(false);
      }
    });

    return unsubscribe;
  }, [navigationRef, drawerVisible]);

  // Also close drawer when screen is blurred (when navigating away)
  useEffect(() => {
    if (!navigationRef) return;

    const unsubscribeBlur = navigationRef.addListener('blur', () => {
      if (drawerVisible) {
        setDrawerVisible(false);
      }
    });

    return unsubscribeBlur;
  }, [navigationRef, drawerVisible]);

  // Close drawer on back button press on Android
  useEffect(() => {
    if (!navigationRef) return;

    const unsubscribeBack = navigationRef.addListener('beforeRemove', (e: any) => {
      if (drawerVisible) {
        e.preventDefault();
        setDrawerVisible(false);
      }
    });

    return unsubscribeBack;
  }, [navigationRef, drawerVisible]);

  // Avatar resolution logic for header
  const rawAvatar = user?.photoURL || user?.avatar;
  const userImage = rawAvatar && typeof rawAvatar === 'string' && rawAvatar.startsWith('http')
    ? { uri: rawAvatar }
    : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || user?.username || 'U')}&background=FFD700&color=000&bold=true` };

  const needsOnboarding =
    isAuthenticated && user && !hasCompletedBodyInformation(user);

  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={[stylesGlobal.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={(nav) => setNavigationRef(nav)}>
        <Stack.Navigator>
          {!isAuthenticated ? (
            // Auth Stack
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
            // Onboarding Stack
            <>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            // Main App Stack
            <Stack.Group screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen
                name="MainTabs"
                component={BottomTabNavigator}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
              />
              <Stack.Screen
                name="SavedWorkouts"
                component={SavedWorkoutsScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Saved Workouts"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="WorkoutHistory"
                component={WorkoutHistoryScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Workout History"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="Foods"
                component={FoodsScreen}
              />
              <Stack.Screen
                name="Workouts"
                component={WorkoutsScreen}
              />
              <Stack.Screen
                name="GymProgress"
                component={GymProgressScreen}
              />
              <Stack.Screen
                name="LiveWorkout"
                component={LiveWorkoutScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="AI Coach"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="Messages"
                component={MessagesScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Messages"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Edit Profile"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="EditBodyInfo"
                component={EditBodyInfoScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Edit Body Info"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Change Password"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="WorkoutSession"
                component={WorkoutSessionScreen}
                options={{ contentStyle: { paddingTop: 0, backgroundColor: colors.background } }}
              />
              <Stack.Screen
                name="EmailVerification"
                component={EmailVerificationScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Verify Email"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              <Stack.Screen
                name="Chatbot"
                component={ChatbotScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="AI Coach"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
              
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={({ navigation }) => ({
                  header: () => (
                    <CustomHeader
                      title="Notifications"
                      onProfilePress={() => {}}
                      onMenuPress={() => {}}
                      colors={colors}
                      showBack={true}
                      onBackPress={() => navigation.goBack()}
                    />
                  ),
                })}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <SystemNavigationBarProtector />

      {isAuthenticated && navigationRef && false /* Explicitly disabled custom DrawerMenu completely per user request */ && (
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
    user?.gender ||
    user?.dateOfBirth ||
    user?.height ||
    user?.weight ||
    user?.fitnessGoal ||
    user?.activityLevel ||
    user?.bodyFatPercentage ||
    user?.onboardingSkipped
  );
};

const styles = StyleSheet.create({
  // Tab Bar Styles - Floating Capsule
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 12,
    justifyContent: 'space-evenly',
    borderRadius: 50, // Fully rounded all sides
    borderWidth: 1, // Full border
    marginHorizontal: 4, // Optional: gives a tiny bit of breathing room so the rounded sides look like a true pill
    marginBottom: 8, // Lifts the pill slightly off the absolute bottom
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabIconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20, // To give a pill-shaped background when active
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 0,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    alignSelf: 'center',
  },
  
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
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuSection: {
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutSection: {
    padding: 20,
    paddingTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 44,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});