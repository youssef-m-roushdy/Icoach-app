import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

type EmailVerificationNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EmailVerification'
>;

export default function EmailVerificationScreen() {
  const navigation = useNavigation<EmailVerificationNavigationProp>();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const { user, token, updateUser } = useAuth();
  const isDarkMode = theme === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendVerificationEmail = async () => {
    if (!token) {
      showErrorToast({
        title: 'Authentication Error',
        message: 'No authentication token found',
      });
      return;
    }

    if (!user?.email) {
      showErrorToast({
        title: 'Missing Email',
        message: 'No email found for this user',
      });
      return;
    }

    if (user?.isEmailVerified) {
      showInfoToast({
        title: 'Already Verified',
        message: 'Your email is already verified',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await userService.resendEmailVerification(user.email, token);
      console.log('✅ Verification email sent:', response);

      setEmailSent(true);

      showSuccessToast({
        title: 'Verification Email Sent',
        message:
          'A verification link has been sent to your email address. Please check your inbox and spam folder.',
      });
    } catch (error: unknown) {
      console.error('❌ Resend Verification Error:', error);

      showErrorToast({
        title: 'Send Failed',
        message: getErrorMessage(error) || 'Failed to resend verification email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: use if this screen is opened with a verification token flow
  const handleVerifyEmail = async (verifyToken: string) => {
    if (!token) {
      showErrorToast({
        title: 'Authentication Error',
        message: 'No authentication token found',
      });
      return;
    }

    if (!verifyToken.trim()) {
      showErrorToast({
        title: 'Missing Token',
        message: 'Verification token is required',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await userService.verifyEmail(verifyToken.trim(), token);
      console.log('✅ Email verified:', response);

      if (user) {
        updateUser({
          ...user,
          isEmailVerified: true,
        });
      }

      showSuccessToast({
        title: 'Email Verified',
        message: 'Your email has been verified successfully!',
      });

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error: unknown) {
      console.error('❌ Email Verification Error:', error);

      showErrorToast({
        title: 'Verification Failed',
        message: getErrorMessage(error) || 'Failed to verify email',
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: Math.max(40, insets.top + 20),
            paddingBottom: Math.max(40, systemBottomInset + 20) 
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.content,
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
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
            <MaterialIcons
              name={user?.isEmailVerified ? 'verified' : 'email'}
              size={80}
              color={user?.isEmailVerified ? COLORS.success : colors.primary}
            />
          </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {user?.isEmailVerified ? 'Email Verified' : 'Verify Your Email'}
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {user?.isEmailVerified
            ? 'Your email is already verified. You now have full access to all features.'
            : emailSent
            ? "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account."
            : 'Your email address is not verified yet. Please verify it to secure your account and unlock all features.'}
        </Text>

        {/* Email Display */}
        {user?.email && (
          <View
            style={[
              styles.emailBox,
              {
                backgroundColor: (colors as any).authInputBg || colors.inputBg,
                borderColor: (colors as any).authInputBorder || colors.inputBorder,
              },
            ]}
          >
            <MaterialIcons
              name="email"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={[styles.emailText, { color: colors.text }]}>
              {user.email}
            </Text>
          </View>
        )}

        {/* Verified Badge */}
        {user?.isEmailVerified && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons
              name="verified"
              size={20}
              color={COLORS.success}
            />
            <Text style={styles.verifiedText}>Email Verified</Text>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            Why verify your email?
          </Text>

          <View style={styles.benefitItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Secure your account and enable password recovery
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Receive important notifications and updates
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Access all premium features
            </Text>
          </View>
        </View>

        {/* Only show send button if not verified */}
        {!user?.isEmailVerified && (
          <>
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.buttonDisabled]}
              onPress={handleSendVerificationEmail}
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
                <ActivityIndicator size="small" color={isDarkMode ? '#1A1A1A' : '#FFFFFF'} />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color={'#FFFFFF'} />
                  <Text style={[styles.signInButtonText, { color: '#FFFFFF' }]}>
                    {emailSent
                      ? 'Resend Verification Email'
                      : 'Send Verification Email'}
                  </Text>
                </>
              )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Didn&apos;t receive the email? Check your spam folder or request a new one.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.backButton,
            { borderColor: (colors as any).authInputBorder || colors.inputBorder },
            user?.isEmailVerified && styles.verifiedBackButton,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color: user?.isEmailVerified ? '#FFFFFF' : colors.text,
              },
            ]}
          >
            {user?.isEmailVerified ? 'Continue' : 'Back to Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 24,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    marginBottom: SIZES.md,
    width: '100%',
  },
  emailText: {
    fontSize: SIZES.body,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: SIZES.xl,
  },
  verifiedText: {
    fontSize: SIZES.body,
    color: COLORS.success,
    fontWeight: '600',
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: SIZES.xl,
  },
  benefitsTitle: {
    fontSize: SIZES.h3,
    fontWeight: '600',
    marginBottom: SIZES.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  benefitText: {
    fontSize: SIZES.body,
    flex: 1,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    borderRadius: SIZES.radiusSmall,
    width: '100%',
    marginBottom: SIZES.md,
  },
  buttonDisabled: {
    opacity: 0.6,
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
    width: '100%',
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
  helpText: {
    fontSize: SIZES.small,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  backButton: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    width: '100%',
  },
  verifiedBackButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  backButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});