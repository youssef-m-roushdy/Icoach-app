import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { userService } from '../services';
import { useAuth } from '../context';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../utils/toast';

type ChangePasswordNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChangePassword'
>;

export default function ChangePasswordScreen() {
  const navigation = useNavigation<ChangePasswordNavigationProp>();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const { token, logout } = useAuth();
  const isDarkMode = theme === 'dark';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string): boolean => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showErrorToast({
        title: 'Missing Fields',
        message: 'Please fill in all fields',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast({
        title: 'Password Mismatch',
        message: 'New passwords do not match',
      });
      return;
    }

    if (currentPassword === newPassword) {
      showErrorToast({
        title: 'Invalid Password',
        message: 'New password must be different from current password',
      });
      return;
    }

    if (!validatePassword(newPassword)) {
      showErrorToast({
        title: 'Weak Password',
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      });
      return;
    }

    if (!token) {
      showErrorToast({
        title: 'Authentication Error',
        message: 'No authentication token found',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await userService.changePassword(
        currentPassword.trim(),
        newPassword.trim(),
        token
      );

      console.log('✅ Password changed successfully:', response);

      showSuccessToast({
        title: 'Password Changed',
        message: 'Your password has been updated successfully. Please sign in again.',
      });

      setTimeout(async () => {
        await logout();
      }, 1200);
    } catch (error: unknown) {
      console.error('❌ Change Password Error:', error);

      const rawMessage = getErrorMessage(error);
      let displayMessage = rawMessage;

      if (
        rawMessage.toLowerCase().includes('current password') ||
        rawMessage.toLowerCase().includes('incorrect password') ||
        rawMessage.toLowerCase().includes('old password')
      ) {
        displayMessage =
          'The current password you entered is incorrect. Please try again.';
      }

      showErrorToast({
        title: 'Change Password Failed',
        message: displayMessage || 'Failed to change password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (
    password: string
  ): { text: string; color: string } => {
    if (!password) return { text: '', color: COLORS.gray };

    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    const strength = [
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
    ].filter(Boolean).length;

    if (strength <= 2) return { text: 'Weak', color: COLORS.error };
    if (strength === 3) return { text: 'Fair', color: '#f59e0b' };
    return { text: 'Strong', color: COLORS.success };
  };

  // SPECIAL CASE: Check if password contains special characters (EXCLUDING underscore)
  const hasSpecialChar = (password: string): boolean => {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const getInputWrapperStyle = (fieldName: string) => [
    styles.inputWrapper,
    {
      backgroundColor: (colors as any).authInputBg || colors.inputBg,
      borderColor: focusedField === fieldName 
        ? (colors as any).authInputBorderFocused || colors.primary
        : (colors as any).authInputBorder || colors.inputBorder,
      borderWidth: 1,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: focusedField === fieldName ? 0.3 : 0,
      shadowRadius: focusedField === fieldName ? 8 : 0,
      elevation: focusedField === fieldName ? 4 : 0,
    },
  ];

  return (
    <View style={[styles.background, { backgroundColor: colors.background }]}>
      {/* Animated Gradient Background */}
      <LinearGradient
        colors={(colors as any).authBgGradient || [colors.background, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: (colors as any).authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: (colors as any).authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: (colors as any).authCircle3 }]} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { 
              paddingTop: Math.max(40, insets.top + 20),
              paddingBottom: Math.max(40, systemBottomInset + 20) 
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Back
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.formContainer,
              {
                backgroundColor: (colors as any).authCardBg || colors.card,
                borderColor: (colors as any).authCardBorder || colors.border,
                shadowColor: isDarkMode ? '#000' : '#000',
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: isDarkMode ? 10 : 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDarkMode ? 8 : 4,
                borderWidth: (colors as any).authCardBorder ? 1 : 0,
              }
            ]}
          >
            {/* Header Icon */}
            <View
              style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}
            >
              <MaterialIcons
                name="lock-reset"
                size={60}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Change Password
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enter your current password and choose a new secure password
            </Text>

            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Current Password
              </Text>
              <View style={getInputWrapperStyle('currentPassword')}>
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={focusedField === 'currentPassword' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  onFocus={() => setFocusedField('currentPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <MaterialIcons
                    name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                New Password
              </Text>
              <View style={getInputWrapperStyle('newPassword')}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={focusedField === 'newPassword' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <MaterialIcons
                    name={showNewPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  Password Strength: {passwordStrength.text}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Confirm New Password
              </Text>
              <View style={getInputWrapperStyle('confirmPassword')}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={focusedField === 'confirmPassword' ? colors.primary : colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
          <View
            style={[
              styles.requirementsContainer,
              { backgroundColor: colors.statBg },
            ]}
          >
            <Text style={[styles.requirementsTitle, { color: colors.text }]}>
              Password Requirements:
            </Text>

            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  newPassword.length >= 8
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  newPassword.length >= 8 ? COLORS.success : colors.textSecondary
                }
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                At least 8 characters
              </Text>
            </View>

            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[A-Z]/.test(newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  /[A-Z]/.test(newPassword)
                    ? COLORS.success
                    : colors.textSecondary
                }
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One uppercase letter
              </Text>
            </View>

            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[a-z]/.test(newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  /[a-z]/.test(newPassword)
                    ? COLORS.success
                    : colors.textSecondary
                }
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One lowercase letter
              </Text>
            </View>

            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[0-9]/.test(newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  /[0-9]/.test(newPassword)
                    ? COLORS.success
                    : colors.textSecondary
                }
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One number
              </Text>
            </View>

            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  hasSpecialChar(newPassword)
                    ? 'check-circle'
                    : 'radio-button-unchecked'
                }
                size={16}
                color={
                  hasSpecialChar(newPassword)
                    ? COLORS.success
                    : colors.textSecondary
                }
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One special character (optional)
              </Text>
            </View>

            <View style={styles.noteContainer}>
              <MaterialIcons name="info" size={14} color={COLORS.primary} />
              <Text style={styles.noteText}>
                Note: special characters like (!, @, #, $, %, ^, &, *, _).
              </Text>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, (colors as any).secondary || colors.primary]}
              style={styles.signInGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={'#FFFFFF'} />
              ) : (
                <Text style={[styles.signInButtonText, { color: '#FFFFFF' }]}>Change Password</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border || colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    paddingHorizontal: SIZES.md,
    height: SIZES.inputHeight,
    gap: SIZES.sm,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
  },
  strengthText: {
    fontSize: SIZES.small,
    marginTop: SIZES.xs,
    fontWeight: '600',
  },
  errorText: {
    fontSize: SIZES.small,
    color: COLORS.error,
    marginTop: SIZES.xs,
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginTop: SIZES.sm,
    padding: SIZES.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.radiusSmall,
  },
  noteText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle3: {
    position: 'absolute',
    top: '30%',
    left: '-20%',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  background: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 40,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    width: '90%',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    marginTop: 40,
    alignItems: 'stretch',
    alignSelf: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});