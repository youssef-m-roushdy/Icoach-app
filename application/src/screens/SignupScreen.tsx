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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../types';
import { CustomButton, GoogleButton } from '../components/common';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';
import { useAuth } from '../context';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../utils/toast';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SignInScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignIn'
>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { theme, colors } = useTheme();
  const { login } = useAuth();
  const { systemBottomInset } = useSystemNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        message: t('passwordMinLengthError'),
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: t('passwordUppercaseError'),
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: t('passwordLowercaseError'),
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: t('passwordNumberError'),
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

    if (strength <= 2) return { text: t('passwordWeak'), color: COLORS.error };
    if (strength === 3) return { text: t('passwordFair'), color: '#f59e0b' };
    return { text: t('passwordStrong'), color: COLORS.success };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSignUp = async () => {
    // Validation
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      showErrorToast({
        title: t('missingFields'),
        message: t('fillAllFields'),
      });
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast({
        title: t('passwordMismatch'),
        message: t('passwordsDoNotMatch'),
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      showErrorToast({
        title: t('weakPassword'),
        message:
          passwordValidation.message || t('chooseStrongerPassword'),
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showErrorToast({
        title: t('invalidEmailTitle'),
        message: t('invalidEmailMessage'),
      });
      return;
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      showErrorToast({
        title: t('invalidUsernameTitle'),
        message: t('invalidUsernameMessage'),
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        await login(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );

        showSuccessToast({
          title: t('accountCreatedTitle'),
          message: t('accountCreatedMessage'),
        });
      } else {
        showErrorToast({
          title: t('registrationFailedTitle'),
          message: t('registrationFailedMessage'),
        });
      }
    } catch (error: unknown) {
      const rawMessage = getErrorMessage(error);
      let displayMessage = rawMessage;

      if (
        rawMessage.toLowerCase().includes('email already exists') ||
        rawMessage.toLowerCase().includes('email already registered')
      ) {
        displayMessage = t('emailAlreadyExists');
      } else if (
        rawMessage.toLowerCase().includes('username already exists') ||
        rawMessage.toLowerCase().includes('username taken')
      ) {
        displayMessage = t('usernameAlreadyExists');
      }

      showErrorToast({
        title: t('registrationFailedTitle'),
        message: displayMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInputWrapperStyle = (fieldName: string) => [
    styles.inputWrapper,
    {
      backgroundColor: colors.authInputBg,
      borderColor: focusedField === fieldName 
        ? colors.authInputBorderFocused 
        : colors.authInputBorder,
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
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Decorative Circles */}
        <View style={[styles.decorativeCircle1, { 
          backgroundColor: colors.authCircle1 
        }]} />
        <View style={[styles.decorativeCircle2, { 
          backgroundColor: colors.authCircle2
        }]} />
        <View style={[styles.decorativeCircle3, { 
          backgroundColor: colors.authCircle3
        }]} />
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

          <View
            style={[
              styles.formContainer,
              {
                backgroundColor: colors.authCardBg,
                borderColor: colors.authCardBorder,
                shadowColor: isDarkMode ? '#000' : '#000',
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: isDarkMode ? 10 : 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDarkMode ? 8 : 4,
              }
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              {t('createAccountTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('joinCommunity')}
            </Text>

            <View style={styles.nameContainer}>
              <View style={styles.nameInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t('firstName')}
                </Text>
                <View style={getInputWrapperStyle('firstName')}>
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t('firstNamePlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.nameInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t('lastName')}
                </Text>
                <View style={getInputWrapperStyle('lastName')}>
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t('lastNamePlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('usernameLabel')}
              </Text>
              <View style={getInputWrapperStyle('username')}>
                <MaterialIcons
                  name="alternate-email"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('usernamePlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('emailLabel')}
              </Text>
              <View style={getInputWrapperStyle('email')}>
                <MaterialIcons
                  name="email"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('passwordLabel')}
              </Text>
              <View style={getInputWrapperStyle('password')}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('createPasswordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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
                  <Text
                    style={[styles.strengthLabel, { color: colors.textSecondary }]}
                  >
                    {t('strengthLabel')}:
                  </Text>
                  <Text
                    style={[styles.strengthText, { color: passwordStrength.color }]}
                  >
                    {passwordStrength.text}
                  </Text>
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${
                            passwordStrength.text === t('passwordWeak')
                              ? 33
                              : passwordStrength.text === t('passwordFair')
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

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('confirmPasswordLabel')}
              </Text>
              <View style={getInputWrapperStyle('confirmPassword')}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
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

              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={[styles.errorText, { color: COLORS.error }]}>
                  {t('passwordsDoNotMatch')}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.requirementsContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                {t('passwordRequirements')}
              </Text>

              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    password.length >= 8
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={18}
                  color={
                    password.length >= 8 ? COLORS.success : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {t('minLength')}
                </Text>
              </View>

              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    /[A-Z]/.test(password)
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={18}
                  color={
                    /[A-Z]/.test(password)
                      ? COLORS.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {t('oneUppercase')}
                </Text>
              </View>

              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    /[a-z]/.test(password)
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={18}
                  color={
                    /[a-z]/.test(password)
                      ? COLORS.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {t('oneLowercase')}
                </Text>
              </View>

              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    /[0-9]/.test(password)
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={18}
                  color={
                    /[0-9]/.test(password)
                      ? COLORS.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {t('oneNumber')}
                </Text>
              </View>

              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={
                    hasSpecialChar(password)
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={18}
                  color={
                    hasSpecialChar(password)
                      ? COLORS.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[styles.requirementText, { color: colors.textSecondary }]}
                >
                  {t('oneSpecial')}
                </Text>
              </View>

              <View style={styles.noteContainer}>
                <MaterialIcons name="info" size={14} color={COLORS.primary} />
                <Text style={styles.noteText}>
                  {t('specialCharNote')}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.signUpButton]}
                    onPress={handleSignUp}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      style={styles.signInGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.signInButtonText, { color: '#FFFFFF' }]}>{t('createAccount')}</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t('orSignUpWith')}
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>

                  <GoogleButton mode="signup" />
                </>
              )}
            </View>

            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                {t('alreadyHaveAccount')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  {t('logIn')}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '90%',
    padding: SIZES.xl,
    borderRadius: 32,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 20,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
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
  buttonContainer: {
    width: '100%',
  },
  signUpButton: {
    marginBottom: SIZES.lg,
    width: '100%',
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
    borderRadius: 16,
    gap: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
});