import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import ar from '../../i18n/locales/ar.json';

type AuthCallbackRouteProp = RouteProp<RootStackParamList, 'AuthCallback'>;

const AuthCallbackScreen: React.FC = () => {
  const route = useRoute<AuthCallbackRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuthState } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { token, refreshToken, user } = route.params || {};

        if (token && user) {
          const userData = typeof user === 'string' ? JSON.parse(user) : user;
          await setAuthState(token, userData, refreshToken);
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' as never }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'SignIn' as never }],
          });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' as never }],
        });
      }
    };

    handleCallback();
  }, [route.params, navigation, setAuthState]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {ar.completingAuth}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default AuthCallbackScreen;