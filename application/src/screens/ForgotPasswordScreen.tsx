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
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services';

type ForgotPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetLink = async () => {
    // Validation
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      
      // Based on Swagger, response contains resetToken in development
      if (response.data) {
        setResetToken(response.data);
      }
      
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'If an account exists with this email, you will receive password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => {
              // If we have a reset token (development mode), navigate to reset screen
              if (response.data) {
                navigation.navigate('ResetPassword', { 
                  email,
                  resetToken: response.data 
                });
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Forgot Password Error:', error);
      
      // Special case: User not found (404)
      if (error.message?.toLowerCase().includes('not found')) {
        Alert.alert(
          'Email Sent',
          'If an account exists with this email, you will receive password reset instructions.',
          [{ text: 'OK' }]
        );
        setEmailSent(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to send reset email');
      }
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
              <Text style={[styles.title, { color: colors.text }]}>
                {emailSent ? 'Check Your Email' : 'Forgot Password'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {emailSent 
                  ? 'We\'ve sent password reset instructions to your email address.'
                  : 'Enter your email address to reset your password'
                }
              </Text>
            </View>

            {!emailSent ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
                    <MaterialIcons name="email" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter your email address"
                      placeholderTextColor={colors.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={styles.noteContainer}>
                  <MaterialIcons name="info" size={16} color={COLORS.primary} />
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                    You will receive a password reset link in your email inbox.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendResetLink}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <MaterialIcons name="mark-email-read" size={60} color={COLORS.success} />
                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Email Sent Successfully
                  </Text>
                  <Text style={[styles.successText, { color: colors.textSecondary }]}>
                    We've sent password reset instructions to:{'\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>
                  
                  <View style={styles.instructionsContainer}>
                    <Text style={[styles.instructionsTitle, { color: colors.text }]}>
                      What to do next:
                    </Text>
                    <View style={styles.instructionItem}>
                      <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                      <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Check your email inbox
                      </Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                      <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Open the password reset email
                      </Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                      <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Click the reset link or use the token provided
                      </Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                      <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
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
                        style={styles.tokenBox}
                        onPress={() => {
                          // Copy token to clipboard
                          // You can implement clipboard functionality if needed
                        }}
                      >
                        <Text style={styles.tokenText}>{resetToken}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.resetButton]}
                        onPress={() => navigation.navigate('ResetPassword', { 
                          email, 
                          resetToken 
                        })}
                      >
                        <Text style={styles.buttonText}>Reset Password Now</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.textSecondary }]}
                    onPress={() => setEmailSent(false)}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      Try Another Email
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.resendButton]}
                    onPress={handleSendResetLink}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.secondary} />
                    ) : (
                      <>
                        <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
                        <Text style={styles.buttonText}>Resend Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

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
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.secondary,
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
    backgroundColor: COLORS.inputBackground,
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
    backgroundColor: COLORS.inputBackground,
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
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  resendButton: {
    marginBottom: 0,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
});