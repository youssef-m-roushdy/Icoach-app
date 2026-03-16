import React, { useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';
import { AntDesign } from '@expo/vector-icons';

interface GoogleButtonProps {
  mode?: 'signin' | 'signup';
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({ mode = 'signin' }) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const navigation = useNavigation();
  const { setAuthState } = useAuth();
  const { colors } = useTheme();

  const buttonText = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google';

  const handleGoogleLogin = async () => {
    if (isInProgress) return;
    
    setIsInProgress(true);
    try {
      console.log('🔵 Starting native Google Sign-In...');
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in and get user info
      const response = await GoogleSignin.signIn();
      
      if (isSuccessResponse(response)) {
        console.log('✅ Got user info from Google:', response.data);
        const { idToken, user } = response.data;
        
        console.log('📧 Email:', user.email);
        console.log('👤 Name:', user.name);
        console.log('🖼️ Photo:', user.photo);
        console.log('🆔 ID Token:', idToken);

        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        console.log('🔄 Sending idToken to server...');

        // Send idToken to your server to register/login user
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
          throw new Error(data.message || 'Server authentication failed');
        }

        console.log('✅ Server authentication successful');
        console.log('📦 Full Server Response:', JSON.stringify(data, null, 2));
        console.log('👤 User Data:', data.data.user);
        console.log('🔑 Access Token:', data.data.accessToken);
        console.log('🔄 Refresh Token:', data.data.refreshToken);

        // Store access token
        await AsyncStorage.setItem('token', data.data.accessToken);
        
        // Store complete user data for UI
        const userData = {
          ...data.data.user,
          photo: user.photo,
          googleId: user.id,
        };
        await AsyncStorage.setItem('googleUser', JSON.stringify(userData));
        
        // Update auth context with server data (including refresh token!)
        await setAuthState(data.data.accessToken, data.data.user, data.data.refreshToken);

        Alert.alert('Success', `Welcome ${data.data.user.firstName}!\n\nEmail: ${data.data.user.email}\nRole: ${data.data.user.role}`);
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          errorMessage = 'Sign-in was cancelled';
        } else if (error.code === statusCodes.IN_PROGRESS) {
          errorMessage = 'Sign-in is already in progress';
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          errorMessage = 'Google Play Services not available';
        }
      }
      
      Alert.alert('Login Failed', error.message || errorMessage);
    } finally {
      setIsInProgress(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: colors.card, borderColor: colors.border },
        isInProgress && styles.buttonDisabled
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
          <Text style={[styles.buttonText, { color: colors.text }]}>{buttonText}</Text>
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
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    marginTop: 16,
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
