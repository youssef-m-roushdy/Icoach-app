import React, { useState } from 'react';
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
import { useAuth } from '../../context';
import { useTheme } from '../../context/ThemeContext';
import { AntDesign } from '@expo/vector-icons';
import {
  showSuccessToast,
  showErrorToast,
  getErrorMessage,
} from '../../utils/toast';

// Configure once at module level - not inside component
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  profileImageSize: 120,
});

interface GoogleButtonProps {
  mode?: 'signin' | 'signup';
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({ mode = 'signin' }) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const { setAuthState } = useAuth();
  const { theme, colors } = useTheme();
  const isDarkMode = theme === 'dark';

  const buttonText = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google';

  const handleGoogleLogin = async () => {
    if (isInProgress) return;
    setIsInProgress(true);

    try {
      console.log('🔵 Starting native Google Sign-In...');

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        console.log('✅ Got user info from Google:', response.data);

        const { idToken } = response.data;

        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        console.log('🔄 Sending idToken to server...');

        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const serverResponse = await fetch(`${apiUrl}/v1/auth/google/mobile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({ idToken }),
        });

        const data = await serverResponse.json();

        if (!serverResponse.ok || !data.success) {
          throw new Error(data.message || 'Server authentication failed');
        }

        await AsyncStorage.setItem('token', data.data.accessToken);
        if (data.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        }

        await setAuthState(
          data.data.accessToken,
          data.data.user,
          data.data.refreshToken
        );

        showSuccessToast({
          title: 'Login Successful',
          message: `Welcome back, ${data.data.user.firstName || data.data.user.username}!`,
        });
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);

      let errorMessage = 'Failed to sign in with Google. Please try again.';

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            errorMessage = 'Sign-in was cancelled';
            break;
          case statusCodes.IN_PROGRESS:
            errorMessage = 'Sign-in is already in progress';
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            errorMessage = 'Google Play Services not available';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }

      showErrorToast({
        title: 'Login Failed',
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
        isInProgress && styles.buttonDisabled,
      ]}
      onPress={handleGoogleLogin}
      disabled={isInProgress}
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