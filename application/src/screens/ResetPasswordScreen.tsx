import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../utils/toast';
import ar from '../../i18n/locales/ar.json';

type ResetPasswordNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;
type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

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
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
  };

  const validatePassword = (
    password: string
  ): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return {
        isValid: false,
        message: ar.passwordMinLengthError,
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: ar.passwordUppercaseError,
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: ar.passwordLowercaseError,
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: ar.passwordNumberError,
      };
    }

    return { isValid: true };
  };

  const getPasswordStrength = (
    password: string
  ): { text: string; color: string } => {
    if (!password) return { text: '', color: '#999999' };

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

    if (strength <= 2) return { text: ar.passwordWeak, color: COLORS.error };
    if (strength === 3) return { text: ar.passwordFair, color: '#f59e0b' };
    return { text: ar.passwordStrong, color: COLORS.success };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleResetPassword = async () => {
    if (!token.trim()) {
      showErrorToast({
        title: ar.missingToken,
        message: ar.enterResetTokenMessage,
      });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      showErrorToast({
        title: ar.missingFields,
        message: ar.fillAllPasswordFields,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast({
        title: ar.passwordMismatch,
        message: ar.passwordsDoNotMatch,
      });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      showErrorToast({
        title: ar.weakPassword,
        message:
          passwordValidation.message || ar.chooseStrongerPassword,
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token.trim(), newPassword.trim());

      setPasswordReset(true);

      showSuccessToast({
        title: ar.passwordResetSuccessTitle,
        message: ar.passwordResetSuccessMessage,
      });
    } catch (error: unknown) {
      console.error('❌ Reset Password Error:', error);

      const rawMessage = getErrorMessage(error);
      let displayMessage = rawMessage;

      if (
        rawMessage.toLowerCase().includes('invalid') ||
        rawMessage.toLowerCase().includes('expired') ||
        rawMessage.toLowerCase().includes('token')
      ) {
        displayMessage = ar.invalidOrExpiredToken;
      }

      showErrorToast({
        title: ar.resetFailedTitle,
        message: displayMessage || ar.resetFailedMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <View style={[styles.background, { backgroundColor: colors.background }]}>
        {theme === 'dark' && (
          <ImageBackground
            source={require('../../assets/home.jpeg')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        <View style={styles.container}>
          <View
            style={[
              styles.formContainer,
              {
                backgroundColor:
                  theme === 'dark'
                    ? colors.background + 'CC'
                    : colors.card,
                shadowColor: colors.shadow,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.successContainer}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.iconBg },
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={60}
                  color={COLORS.success}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {ar.passwordResetSuccessTitle}
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {ar.passwordResetSuccessMessage}
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.buttonText}>{ar.signInNow}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

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
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { paddingTop: Math.max(insets.top + 10, 40) }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              {ar.back}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.formContainer,
              {
                backgroundColor:
                  theme === 'dark'
                    ? colors.background + 'CC'
                    : colors.card,
                shadowColor: colors.shadow,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.headerContainer}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.iconBg },
                ]}
              >
                <MaterialIcons
                  name="lock-reset"
                  size={50}
                  color={COLORS.primary}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {ar.resetPasswordTitle}
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {email
                  ? `${ar.resetPasswordFor} ${email}`
                  : ar.enterResetTokenAndPassword}
              </Text>
            </View>

            {/* Token Input (only show if not passed from params) */}
            {!initialToken && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {ar.resetToken}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.authInputBg || colors.inputBg,
                      borderColor: colors.authInputBorder || colors.inputBorder,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="vpn-key"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={ar.enterResetToken}
                    placeholderTextColor={colors.textSecondary}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.noteContainer}>
                  <MaterialIcons name="info" size={14} color={COLORS.primary} />
                  <Text
                    style={[styles.noteText, { color: colors.textSecondary }]}
                  >
                    {ar.checkEmailForToken}
                  </Text>
                </View>
              </View>
            )}

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {ar.newPassword}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: (colors as any).authInputBg || colors.inputBg,
                    borderColor: (colors as any).authInputBorder || colors.inputBorder,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={ar.enterNewPassword}
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
                  <Text
                    style={[styles.strengthLabel, { color: colors.textSecondary }]}
                  >
                    {ar.strengthLabel}:
                  </Text>
                  <Text
                    style={[styles.strengthText, { color: passwordStrength.color }]}
                  >
                    {passwordStrength.text}
                  </Text>
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: colors.textSecondary + '20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${
                            passwordStrength.text === ar.passwordWeak
                              ? 33
                              : passwordStrength.text === ar.passwordFair
                              ? 66
                              : 100
                          }%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {ar.confirmNewPassword}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: (colors as any).authInputBg || colors.inputBg,
                    borderColor: (colors as any).authInputBorder || colors.inputBorder,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={ar.confirmPasswordPlaceholder}
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
                    name={
                      showConfirmPassword ? 'visibility' : 'visibility-off'
                    }
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={[styles.errorText, { color: COLORS.error }]}>
                  {ar.passwordsDoNotMatch}
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
                {ar.passwordRequirements}
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
                    newPassword.length >= 8
                      ? COLORS.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {ar.minLength}
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
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {ar.oneUppercase}
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
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {ar.oneLowercase}
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
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {ar.oneNumber}
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
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {ar.oneSpecial}
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{ar.resetPasswordTitle}</Text>
              )}
            </TouchableOpacity>

            {/* Back to Forgot Password */}
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotLinkText, { color: colors.primary }]}>
                {ar.needNewToken}
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.loginLinkText, { color: colors.primary }]}>
                {ar.backToSignIn}
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
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  backButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  formContainer: {
    marginHorizontal: SIZES.lg,
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLarge,
    marginTop: 60,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    color: '#FFFFFF',
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