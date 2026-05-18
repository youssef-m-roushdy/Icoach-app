import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AntDesign } from '@expo/vector-icons';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../../utils/toast';

interface GoogleButtonProps {
  mode?: 'signin' | 'signup';
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({ mode = 'signin' }) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const navigation = useNavigation();
  const { setAuthState } = useAuth();
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const isDarkMode = theme === 'dark';

  const buttonText = mode === 'signup' ? t('signUpWithGoogle') : t('signInWithGoogle');

  // Configure Google Sign-In once when component mounts
  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        await GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          profileImageSize: 120,
        });
        setIsConfigured(true);
        console.log('✅ Google Sign-In configured successfully');
      } catch (error) {
        console.error('❌ Failed to configure Google Sign-In:', error);
      }
    };

    configureGoogleSignIn();
  }, []);

  const handleGoogleLogin = async () => {
    if (isInProgress || !isConfigured) return;

    setIsInProgress(true);

    try {
      console.log('🔵 Starting native Google Sign-In...');

      // Check if Google Play Services are available (Android only)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true, // This shows a native dialog if needed
      });

      // This opens the NATIVE account picker modal - NO BROWSER!
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        console.log('✅ Got user info from Google:', response.data);

        const { idToken, user } = response.data;

        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        console.log('🔄 Sending idToken to server...');

        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
        const serverResponse = await fetch(`${apiUrl}/v1/auth/google/mobile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });

        const data = await serverResponse.json();

        if (!serverResponse.ok || !data.success) {
          throw new Error(data.message || t('serverAuthenticationFailed'));
        }

        // Store tokens locally
        await AsyncStorage.setItem('token', data.data.accessToken);
        if (data.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        }

        // Set auth state in context
        await setAuthState(
          data.data.accessToken,
          data.data.user,
          data.data.refreshToken
        );

        const welcomeMessage = mode === 'signup' 
          ? t('welcomeGoogleUser').replace('{name}', data.data.user.firstName || data.data.user.username)
          : t('welcomeBackGoogleUser').replace('{name}', data.data.user.firstName || data.data.user.username);

        showSuccessToast({
          title: mode === 'signup' ? t('signUpSuccess') : t('loginSuccessTitle'),
          message: welcomeMessage,
        });
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);

      let errorMessage = t('googleSignInFailed');

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            errorMessage = t('signInCancelled');
            break;
          case statusCodes.IN_PROGRESS:
            errorMessage = t('signInInProgress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            errorMessage = t('playServicesNotAvailable');
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }

      showErrorToast({
        title: mode === 'signup' ? t('signUpFailed') : t('loginFailedTitle'),
        message: getErrorMessage(error) || errorMessage,
      });
    } finally {
      setIsInProgress(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
        },
        (isInProgress || !isConfigured) && styles.buttonDisabled,
      ]}
      onPress={handleGoogleLogin}
      disabled={isInProgress || !isConfigured}
      activeOpacity={0.8}
    >
      {isInProgress ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <AntDesign name="google" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {buttonText}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});