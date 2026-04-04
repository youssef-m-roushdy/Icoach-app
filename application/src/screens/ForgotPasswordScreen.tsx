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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

type ForgotPasswordNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      showErrorToast({
        title: 'Missing Email',
        message: 'Please enter your email address',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showErrorToast({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email.trim());

      if (response.data) {
        setResetToken(response.data);
      }

      setEmailSent(true);

      showSuccessToast({
        title: 'Reset Link Sent',
        message:
          'If an account exists with this email, password reset instructions have been sent.',
      });

      if (response.data) {
        showInfoToast({
          title: 'Development Mode',
          message: 'A reset token is available below for testing.',
        });
      }
    } catch (error: unknown) {
      console.error('❌ Forgot Password Error:', error);

      const rawMessage = getErrorMessage(error);

      if (rawMessage.toLowerCase().includes('not found')) {
        setEmailSent(true);

        showSuccessToast({
          title: 'Reset Link Sent',
          message:
            'If an account exists with this email, password reset instructions have been sent.',
        });
      } else {
        showErrorToast({
          title: 'Request Failed',
          message: rawMessage || 'Failed to send reset email',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInputWrapperStyle = (fieldName: string) => [
    styles.inputWrapper,
    {
      backgroundColor: focusedField === fieldName 
        ? colors.authInputBgFocused
        : colors.authInputBg,
      borderColor: focusedField === fieldName 
        ? colors.authInputBorderFocused 
        : colors.authInputBorder,
      borderWidth: focusedField === fieldName ? 2 : 1,
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
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { top: Math.max(insets.top + 10, 40) }]}
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
                backgroundColor: colors.authCardBg,
                borderColor: colors.authCardBorder,
                shadowColor: isDarkMode ? '#000' : '#000',
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: isDarkMode ? 10 : 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDarkMode ? 8 : 4,
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
                  color={colors.primary}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {emailSent ? 'Check Your Email' : 'Forgot Password'}
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {emailSent
                  ? "We've sent password reset instructions to your email address."
                  : 'Enter your email address to reset your password'}
              </Text>
            </View>

            {!emailSent ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Email Address
                  </Text>

                  <View style={getInputWrapperStyle('email')}>
                    <MaterialIcons
                      name="email"
                      size={20}
                      color={focusedField === 'email' ? colors.primary : colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter your email address"
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={styles.noteContainer}>
                  <MaterialIcons name="info" size={16} color={COLORS.primary} />
                  <Text
                    style={[styles.noteText, { color: colors.textSecondary }]}
                  >
                    You will receive a password reset link in your email inbox.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled, { overflow: 'hidden' }]}
                  onPress={handleSendResetLink}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, (colors as any).secondary || colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <MaterialIcons
                    name="mark-email-read"
                    size={60}
                    color={COLORS.success}
                  />

                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Email Sent Successfully
                  </Text>

                  <Text style={[styles.successText, { color: colors.textSecondary }]}>
                    We've sent password reset instructions to:{'\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>

                  <View
                    style={[
                      styles.instructionsContainer,
                      { backgroundColor: colors.statBg },
                    ]}
                  >
                    <Text
                      style={[styles.instructionsTitle, { color: colors.text }]}
                    >
                      What to do next:
                    </Text>

                    <View style={styles.instructionItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.instructionText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Check your email inbox
                      </Text>
                    </View>

                    <View style={styles.instructionItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.instructionText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Open the password reset email
                      </Text>
                    </View>

                    <View style={styles.instructionItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.instructionText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Click the reset link or use the token provided
                      </Text>
                    </View>

                    <View style={styles.instructionItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.instructionText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Create a new secure password
                      </Text>
                    </View>
                  </View>

                  {/* Development Mode: Show token if available */}
                  {resetToken && (
                    <View style={styles.tokenContainer}>
                      <Text style={[styles.tokenLabel, { color: colors.text }]}>
                        Development Token (for testing):
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.tokenBox,
                          { backgroundColor: colors.inputBg },
                        ]}
                        onPress={() => {
                          // optional: add clipboard functionality later
                        }}
                      >
                        <Text style={styles.tokenText}>{resetToken}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, styles.resetButton]}
                        onPress={() =>
                          navigation.navigate('ResetPassword', {
                            email,
                            resetToken,
                          })
                        }
                      >
                        <Text style={styles.buttonText}>Reset Password Now</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      { borderColor: colors.textSecondary },
                    ]}
                    onPress={() => setEmailSent(false)}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.text },
                      ]}
                    >
                      Try Another Email
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.resendButton]}
                    onPress={handleSendResetLink}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.secondary}
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="refresh"
                          size={18}
                          color={COLORS.secondary}
                        />
                        <Text style={styles.buttonText}>Resend Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    padding: SIZES.lg,
  },
  backButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginLeft: 4,
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginBottom: SIZES.xl,
    padding: SIZES.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.radiusSmall,
  },
  noteText: {
    fontSize: SIZES.small,
    flex: 1,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: SIZES.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  successTitle: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  successText: {
    fontSize: SIZES.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.xl,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  instructionsContainer: {
    width: '100%',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.xl,
  },
  instructionsTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  instructionText: {
    fontSize: SIZES.small,
    flex: 1,
  },
  tokenContainer: {
    width: '100%',
    marginBottom: SIZES.xl,
  },
  tokenLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    marginBottom: SIZES.xs,
    textAlign: 'center',
  },
  tokenBox: {
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SIZES.md,
  },
  tokenText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetButton: {
    marginBottom: 0,
  },
  actionButtons: {
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginBottom: 0,
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