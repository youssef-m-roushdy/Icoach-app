import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { CustomButton, GoogleButton } from '../components/common';
import { AuthHeader } from '../components/auth';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';
import { useAuth } from '../context';

// FIX: Change 'SignIn' to 'Login' - because in your navigation stack,
// this screen is registered as 'Login', not 'SignIn'
type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function SignInScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { colors } = useTheme();
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ emailOrUsername, password });
      
      console.log('🔐 Login Response:', JSON.stringify(response, null, 2));
      console.log('✅ Success:', response.success);
      console.log('📦 Data:', response.data);
      console.log('👤 User:', response.data?.user);
      console.log('🎫 Access Token:', response.data?.accessToken);
      console.log('🔄 Refresh Token:', response.data?.refreshToken);

      if (response.success && response.data) {
        await login(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );
        Alert.alert('Success', 'Logged in successfully!');
      }
    } catch (error: any) {
      console.error('❌ Login Error:', error);
      console.error('❌ Error Message:', error.message);
      console.error('❌ Error Stack:', error.stack);
      
      // Special case: Check for specific error messages
      const errorMessage = error.message || 'Invalid credentials';
      let displayMessage = errorMessage;
      
      if (errorMessage.toLowerCase().includes('invalid credentials') || 
          errorMessage.toLowerCase().includes('incorrect password') ||
          errorMessage.toLowerCase().includes('user not found')) {
        displayMessage = 'Invalid email/username or password. Please try again.';
      } else if (errorMessage.toLowerCase().includes('email not verified')) {
        displayMessage = 'Please verify your email address before logging in.';
      }
      
      Alert.alert('Login Failed', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/home.jpeg')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            activeTab="Login"
            onTabPress={(tab) => {
              if (tab === 'SignIn') {
                navigation.navigate('SignIn'); // This navigates to SignUpScreen
              }
            }}
          />

          <View style={[styles.formContainer, { backgroundColor: colors.background + 'CC' }]}>
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your journey
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email or Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                <MaterialIcons name="person" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email or username"
                  placeholderTextColor={colors.textSecondary}
                  value={emailOrUsername}
                  onChangeText={setEmailOrUsername}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                <TouchableOpacity 
                  style={styles.forgotPasswordButton}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.visibilityButton}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <CustomButton 
                    title="Sign In" 
                    variant="primary" 
                    onPress={handleLogin}
                    buttonStyle={styles.signInButton}
                  />
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
                  </View>
                  <GoogleButton mode="signin" />
                </>
              )}
            </View>

            <View style={styles.signUpLinkContainer}>
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={[styles.signUpLink, { color: colors.primary }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    backgroundColor: COLORS.overlay,
    marginHorizontal: SIZES.lg,
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLarge,
    marginTop: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.body,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  inputLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    marginBottom: SIZES.xs,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  forgotPasswordButton: {
    paddingVertical: SIZES.xs,
  },
  forgotPasswordText: {
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    paddingHorizontal: SIZES.md,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    paddingHorizontal: SIZES.sm,
    height: 56,
  },
  visibilityButton: {
    padding: SIZES.xs,
  },
  buttonContainer: {
    width: '100%',
  },
  signInButton: {
    marginBottom: SIZES.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    marginHorizontal: SIZES.md,
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.xl,
    gap: SIZES.xs,
  },
  signUpText: {
    fontSize: SIZES.body,
  },
  signUpLink: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
});