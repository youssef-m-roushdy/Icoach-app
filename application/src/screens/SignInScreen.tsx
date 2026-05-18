import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import ar from '../../i18n/locales/ar.json';

const { width, height } = Dimensions.get('window');

type SignInScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

export default function SignInScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { theme, colors } = useTheme();
  const { login } = useAuth();
  const { systemBottomInset } = useSystemNavigation();
  const insets = useSafeAreaInsets();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      showErrorToast({
        title: ar.missingFields,
        message: ar.fillAllFields,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        emailOrUsername: emailOrUsername.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        await login(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );

        showSuccessToast({
          title: ar.loginSuccessTitle,
          message: ar.loginSuccessMessage,
        });
      } else {
        showErrorToast({
          title: ar.loginFailedTitle,
          message: ar.loginFailedMessage,
        });
      }
    } catch (error: unknown) {
      const rawMessage = getErrorMessage(error);
      let displayMessage = rawMessage;

      if (
        rawMessage.toLowerCase().includes('invalid credentials') ||
        rawMessage.toLowerCase().includes('incorrect password') ||
        rawMessage.toLowerCase().includes('user not found')
      ) {
        displayMessage = ar.invalidCredentials;
      } else if (rawMessage.toLowerCase().includes('email not verified')) {
        displayMessage = ar.emailNotVerified;
      }

      showErrorToast({
        title: ar.loginFailedTitle,
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Gradient Background */}
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
        style={styles.keyboardView}
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
          {/* Main Form Card */}
          <View
            style={[
              styles.formCard,
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
            <View style={styles.headerContainer}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                {ar.welcomeBack}
              </Text>
              <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                {ar.signInSubtitle}
              </Text>
            </View>

            <View style={styles.form}>
              {/* Email/Username Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {ar.emailOrUsername}
                </Text>
                <View style={getInputWrapperStyle('emailOrUsername')}>
                  <Feather
                    name="user"
                    size={20}
                    color={focusedField === 'emailOrUsername' ? colors.primary : colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={ar.enterEmailOrUsername}
                    placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    value={emailOrUsername}
                    onChangeText={setEmailOrUsername}
                    onFocus={() => setFocusedField('emailOrUsername')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {ar.passwordLabel}
                  </Text>
                  <TouchableOpacity
                    style={styles.forgotButton}
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    <Text style={[styles.forgotText, { color: colors.primary }]}>
                      {ar.forgotPasswordQuestion}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={getInputWrapperStyle('password')}>
                  <Feather
                    name="lock"
                    size={20}
                    color={focusedField === 'password' ? colors.primary : colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={ar.enterPassword}
                    placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.visibilityButton}
                  >
                    <Feather
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me */}
              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.rememberMe}>
                  <View style={[styles.checkbox, { borderColor: isDarkMode ? 'rgba(255, 215, 0, 0.6)' : 'rgba(197, 152, 27, 0.5)' }]} />
                  <Text style={[styles.rememberText, { color: colors.textSecondary }]}>
                    {ar.rememberMe}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <View style={styles.buttonContainer}>
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.signInButton]}
                      onPress={handleLogin}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        style={styles.signInGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={[styles.signInButtonText, { color: '#FFFFFF' }]}>{ar.logIn}</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                        {ar.orContinueWith}
                      </Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    <GoogleButton mode="signin" />
                  </>
                )}
              </View>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                {ar.newToICoach}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.signUpLink, { color: colors.primary }]}>
                  {ar.createAccount}
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
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '90%',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotButton: {
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
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
    padding: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
  },
  rememberText: {
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
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