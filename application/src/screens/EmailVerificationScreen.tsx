import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';

type EmailVerificationNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;

export default function EmailVerificationScreen() {
  const navigation = useNavigation<EmailVerificationNavigationProp>();
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendVerificationEmail = async () => {
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'No email found for this user');
      return;
    }

    setIsLoading(true);
    try {
      // Pass both email and token as required by the API
      const response = await userService.resendEmailVerification(user.email, token);
      console.log('✅ Verification email sent:', response);
      
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'A verification link has been sent to your email address. Please check your inbox and spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Resend Verification Error:', error);
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle email verification (if you're opening this screen from a verification link)
  const handleVerifyEmail = async (verifyToken: string) => {
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.verifyEmail(verifyToken, token);
      console.log('✅ Email verified:', response);
      
      Alert.alert(
        'Success',
        'Your email has been verified successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Email Verification Error:', error);
      Alert.alert('Error', error.message || 'Failed to verify email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="email" size={80} color={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Verify Your Email
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {emailSent 
            ? 'We\'ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.'
            : 'Your email address is not verified. Please verify your email to access all features and ensure account security.'
          }
        </Text>

        {/* Email Display */}
        {user?.email && (
          <View style={styles.emailBox}>
            <MaterialIcons name="email" size={20} color={colors.textSecondary} />
            <Text style={[styles.emailText, { color: colors.text }]}>{user.email}</Text>
          </View>
        )}

        {/* Status Indicator */}
        {user?.isEmailVerified && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={20} color={COLORS.success} />
            <Text style={styles.verifiedText}>Email Verified</Text>
          </View>
        )}

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            Why verify your email?
          </Text>
          
          <View style={styles.benefitItem}>
            <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Secure your account and enable password recovery
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Receive important notifications and updates
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Access all premium features
            </Text>
          </View>
        </View>

        {/* Only show send button if email is not verified */}
        {!user?.isEmailVerified && (
          <>
            {/* Send Verification Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSendVerificationEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.secondary} />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color={COLORS.secondary} />
                  <Text style={styles.buttonText}>
                    {emailSent ? 'Resend Verification Email' : 'Send Verification Email'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Help Text */}
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Didn't receive the email? Check your spam folder or request a new one.
            </Text>
          </>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, user?.isEmailVerified && styles.verifiedBackButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>
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
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 24,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    marginBottom: SIZES.md,
    width: '100%',
  },
  emailText: {
    fontSize: SIZES.body,
    color: COLORS.white,
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
    color: COLORS.white,
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
    color: COLORS.gray,
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
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  helpText: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  backButton: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    width: '100%',
  },
  verifiedBackButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  backButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
});