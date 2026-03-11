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
import type { RootStackParamList } from '../types';
import { CustomButton, GoogleButton } from '../components/common';
import { AuthHeader } from '../components/auth';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';
import { useAuth } from '../context';

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { theme, colors } = useTheme();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // SPECIAL CASE: Check if password contains special characters (EXCLUDING underscore)
  const hasSpecialChar = (password: string): boolean => {
    // EXCLUDE underscore from special character check
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
  };

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    // At least 8 characters
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    return { isValid: true };
  };

  const getPasswordStrength = (password: string): { text: string; color: string } => {
    if (!password) return { text: '', color: '#999999' };
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const strength = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber].filter(Boolean).length;
    
    if (strength <= 2) return { text: 'Weak', color: COLORS.error };
    if (strength === 3) return { text: 'Fair', color: '#f59e0b' };
    return { text: 'Strong', color: COLORS.success };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSignUp = async () => {
    // Validation
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('Weak Password', passwordValidation.message);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Username validation (alphanumeric, underscores, hyphens, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      Alert.alert('Error', 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.register({
        firstName,
        lastName,
        username,
        email,
        password,
      });

      if (response.success && response.data) {
        await login(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.background, { backgroundColor: colors.background }]}>
      {theme === 'dark' && (
        <ImageBackground
          source={require('../../assets/home.jpeg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
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
            activeTab="SignIn"
            onTabPress={(tab) => tab === 'Login' && navigation.navigate('Login')}
          />

          <View style={[styles.formContainer, { backgroundColor: theme === 'dark' ? colors.background + 'CC' : colors.card, shadowColor: colors.shadow, borderColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join our community today
            </Text>

            <View style={styles.nameContainer}>
              <View style={styles.nameInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>First Name</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <MaterialIcons name="person-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="John"
                    placeholderTextColor={colors.textSecondary}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={styles.nameInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <MaterialIcons name="person-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Doe"
                    placeholderTextColor={colors.textSecondary}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <MaterialIcons name="alternate-email" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="johndoe123"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <MaterialIcons name="email" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="john@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
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
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <Text style={[styles.strengthLabel, { color: colors.textSecondary }]}>
                    Strength:
                  </Text>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                  <View style={[styles.strengthBar, { backgroundColor: colors.textSecondary + '20' }]}>
                    <View style={[
                      styles.strengthFill, 
                      { 
                        width: `${(passwordStrength.text === 'Weak' ? 33 : passwordStrength.text === 'Fair' ? 66 : 100)}%`,
                        backgroundColor: passwordStrength.color 
                      }
                    ]} />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.visibilityButton}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={[styles.errorText, { color: COLORS.error }]}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Password Requirements - Collapsible */}
            <View style={[styles.requirementsContainer, { backgroundColor: colors.statBg }]}>
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                Password Requirements
              </Text>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={password.length >= 8 ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={password.length >= 8 ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[A-Z]/.test(password) ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={/[A-Z]/.test(password) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[a-z]/.test(password) ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={/[a-z]/.test(password) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One lowercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[0-9]/.test(password) ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={/[0-9]/.test(password) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One number
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={hasSpecialChar(password) ? 'check-circle' : 'radio-button-unchecked'}
                  size={18}
                  color={hasSpecialChar(password) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  Special character (optional)
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <CustomButton 
                    title="Create Account" 
                    variant="primary" 
                    onPress={handleSignUp}
                    buttonStyle={styles.signUpButton}
                  />
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
                  </View>
                  <GoogleButton mode="signup" />
                </>
              )}
            </View>

            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    marginHorizontal: SIZES.lg,
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLarge,
    marginTop: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.body,
    marginBottom: SIZES.xl,
    textAlign: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  nameInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  inputLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    marginBottom: SIZES.xs,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.xs,
    gap: SIZES.xs,
  },
  strengthLabel: {
    fontSize: SIZES.small,
    fontWeight: '500',
  },
  strengthText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: SIZES.small,
    color: COLORS.error,
    marginTop: SIZES.xs,
    marginLeft: SIZES.xs,
  },
  requirementsContainer: {
    padding: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.xl,
  },
  requirementsTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  requirementText: {
    fontSize: SIZES.small,
  },
  buttonContainer: {
    width: '100%',
  },
  signUpButton: {
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
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.xl,
    gap: SIZES.xs,
  },
  loginText: {
    fontSize: SIZES.body,
  },
  loginLink: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
});