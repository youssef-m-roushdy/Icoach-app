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
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
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
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
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
              style={[
                styles.button,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSendVerificationEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {emailSent
                      ? 'Resend Verification Email'
                      : 'Send Verification Email'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Didn&apos;t receive the email? Check your spam folder or request a new one.
            </Text>
          </>
        )}

        {/* Back / Continue Button */}
        <TouchableOpacity
          style={[
            styles.backButton,
            { borderColor: colors.inputBorder },
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: '#FFFFFF',
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