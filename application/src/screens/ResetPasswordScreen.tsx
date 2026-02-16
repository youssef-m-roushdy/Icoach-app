import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';

type ResetPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { colors } = useTheme();
  
  const { email, resetToken: initialToken } = route.params || {};
  const [token, setToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

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
    if (!password) return { text: '', color: COLORS.gray };
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const strength = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber].filter(Boolean).length;
    
    if (strength <= 2) return { text: 'Weak', color: COLORS.error };
    if (strength === 3) return { text: 'Fair', color: '#f59e0b' };
    return { text: 'Strong', color: COLORS.success };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleResetPassword = async () => {
    // Validation
    if (!token) {
      Alert.alert('Error', 'Please enter the reset token');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Weak Password', passwordValidation.message);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      
      setPasswordReset(true);
      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Reset Password Error:', error);
      
      // Special cases based on API response
      const errorMessage = error.message || 'Password reset failed';
      let displayMessage = errorMessage;
      
      if (errorMessage.toLowerCase().includes('invalid') || 
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('token')) {
        displayMessage = 'Invalid or expired reset token. Please request a new one.';
      }
      
      Alert.alert('Error', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <ImageBackground
        source={require('../../assets/home.jpeg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.container}>
          <View style={[styles.formContainer, { backgroundColor: colors.background + 'CC' }]}>
            <View style={styles.successContainer}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="check-circle" size={60} color={COLORS.success} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Password Reset Successfully!
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your password has been updated successfully. You can now sign in with your new password.
              </Text>
              
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.buttonText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    );
  }

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
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.formContainer, { backgroundColor: colors.background + 'CC' }]}>
            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="lock-reset" size={50} color={COLORS.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {email ? `Reset password for ${email}` : 'Enter reset token and new password'}
              </Text>
            </View>

            {/* Token Input (only show if not passed from params) */}
            {!initialToken && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Reset Token</Text>
                <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                  <MaterialIcons name="vpn-key" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter the reset token from email"
                    placeholderTextColor={colors.textSecondary}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
                <View style={styles.noteContainer}>
                  <MaterialIcons name="info" size={14} color={COLORS.primary} />
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                    Check your email for the reset token sent to you
                  </Text>
                </View>
              </View>
            )}

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.visibilityButton}
                >
                  <MaterialIcons
                    name={showNewPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {newPassword.length > 0 && (
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
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
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={[styles.errorText, { color: COLORS.error }]}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                Password Requirements:
              </Text>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={newPassword.length >= 8 ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={newPassword.length >= 8 ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[A-Z]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={/[A-Z]/.test(newPassword) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[a-z]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={/[a-z]/.test(newPassword) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One lowercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[0-9]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={/[0-9]/.test(newPassword) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  One number
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={hasSpecialChar(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={hasSpecialChar(newPassword) ? COLORS.success : colors.textSecondary}
                />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  Special character (optional)
                </Text>
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.secondary} />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            {/* Back to Forgot Password */}
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotLinkText, { color: colors.primary }]}>
                Need a new reset token?
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.loginLinkText, { color: colors.primary }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
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
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    paddingTop: SIZES.xl,
  },
  backButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  formContainer: {
    backgroundColor: COLORS.overlay,
    marginHorizontal: SIZES.lg,
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLarge,
    marginTop: 60,
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
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.body,
    textAlign: 'center',
    lineHeight: 22,
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginTop: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.radiusSmall,
  },
  noteText: {
    fontSize: SIZES.small,
    flex: 1,
    lineHeight: 16,
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
    backgroundColor: COLORS.inputBackground,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  forgotLink: {
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  forgotLinkText: {
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    padding: SIZES.xl,
  },
});