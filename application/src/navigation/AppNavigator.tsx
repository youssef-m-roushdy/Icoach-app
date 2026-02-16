import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import { 
  ActivityIndicator, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  Modal,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants';

// Type definition temporarily added to fix 'Messages' error
export type RootStackParamList = {
  Welcome: undefined;
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
  EmailVerification: undefined;
  ChangePassword: undefined;
  ForgotPassword: undefined; // Add this line
  ResetPassword: { email?: string; resetToken?: string }; // Add this line
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
  const { logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={drawerStyles.overlay}>
        {/* Place drawer first so it is fixed on the left */}
        <View style={[drawerStyles.drawer, { backgroundColor: colors.background }]}> 
          <View style={[drawerStyles.header, { paddingTop: insets.top + 20, borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              style={drawerStyles.closeButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={drawerStyles.menuItems}>
            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('Home')}
            >
              <MaterialIcons name="home" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('Profile')}
            >
              <MaterialIcons name="person" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('Foods')}
            >
              <MaterialIcons name="restaurant" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>Foods</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('Workouts')}
            >
              <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>Workouts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('SavedWorkouts')}
            >
              <MaterialIcons name="bookmark" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>My Workouts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('LiveWorkout')}
            >
              <MaterialIcons name="videocam" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>AI Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={drawerStyles.menuItem}
              onPress={() => handleNavigate('Messages')}
            >
              <MaterialIcons name="message" size={24} color={colors.primary} />
              <Text style={[drawerStyles.menuText, { color: colors.text }]}>Messages</Text>
            </TouchableOpacity>
          </View>

          <View style={[drawerStyles.footer, { paddingBottom: insets.bottom + 20, borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={drawerStyles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={24} color="#ef4444" />
              <Text style={drawerStyles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* This covers the rest of the screen and closes the drawer when pressed */}
        <TouchableOpacity 
          style={drawerStyles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState<any>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Check if user needs onboarding (no body information filled)
  const needsOnboarding = isAuthenticated && user && !hasCompletedBodyInformation(user);

  return (
    <>
      <NavigationContainer
        ref={(nav) => setNavigationRef(nav)}
      >
        <Stack.Navigator 
          screenOptions={({ navigation, route }) => ({
            headerShown: isAuthenticated,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerLeft: isAuthenticated ? () => (
              <TouchableOpacity
                style={{ marginLeft: 15 }}
                onPress={() => setDrawerVisible(true)}
              >
                <MaterialIcons name="menu" size={28} color={colors.primary} />
              </TouchableOpacity>
            ) : undefined,
          })}
        >
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SignIn" component={SignUpScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Login" component={SignInScreen} options={{ headerShown: false }} />
              {/* Add Forgot Password screens here - they're for non-authenticated users */}
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
            </>
          ) : needsOnboarding ? (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={({ navigation }) => ({ 
                  title: 'ICoach',
                  headerRight: () => (
                    <TouchableOpacity
                      style={{ marginRight: 15 }}
                      onPress={() => navigation.navigate('Messages' as any)}
                    >
                      <MaterialIcons name="message" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                  ),
                })} 
              />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
              <Stack.Screen name="Foods" component={FoodsScreen} options={{ title: 'Foods' }} />
              <Stack.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
              <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} options={{ title: 'My Workouts' }} />
              <Stack.Screen name="LiveWorkout" component={LiveWorkoutScreen} options={{ headerShown: false }} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
              <Stack.Screen name="EditBodyInfo" component={EditBodyInfoScreen} options={{ title: 'Edit Body Info' }} />
              <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Verify Email' }} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
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
                      onPress={() => navigation.navigate('Messages' as any)}
                    >
                      <MaterialIcons name="message" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                  ),
                })} 
              />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
              <Stack.Screen name="Foods" component={FoodsScreen} options={{ title: 'Foods' }} />
              <Stack.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
              <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} options={{ title: 'My Workouts' }} />
              <Stack.Screen name="LiveWorkout" component={LiveWorkoutScreen} options={{ headerShown: false }} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
              <Stack.Screen name="EditBodyInfo" component={EditBodyInfoScreen} options={{ title: 'Edit Body Info' }} />
              <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Verify Email' }} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
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

// Styles
const drawerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // Use row direction so the drawer appears from the left
    flexDirection: 'row', 
  },
  overlayTouchable: {
    // This will take the remaining space on the right
    flex: 1,
  },
  drawer: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: COLORS.background,
    // Fix the drawer to the left
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10, // ensure it's above the overlayTouchable
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SIZES.lg,
    // paddingTop is now set dynamically using insets
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  menuItems: {
    flex: 1,
    paddingTop: SIZES.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    gap: SIZES.md,
  },
  menuText: {
    fontSize: SIZES.h3,
    color: COLORS.white,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    padding: SIZES.lg,
    // paddingBottom is now set dynamically using insets
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
  },
  logoutText: {
    fontSize: SIZES.body,
    color: '#ef4444',
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});