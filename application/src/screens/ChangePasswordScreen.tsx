import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';

type ChangePasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChangePassword'>;

export default function ChangePasswordScreen() {
  const navigation = useNavigation<ChangePasswordNavigationProp>();
  const { colors } = useTheme();
  const { token, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number'
      );
      return;
    }

    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.changePassword(currentPassword, newPassword, token);
      console.log('✅ Password changed successfully:', response);
      
      Alert.alert(
        'Success',
        'Your password has been changed successfully. Please login again with your new password.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
              navigation.replace('Login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Change Password Error:', error);
      
      // SPECIAL CASE: Check if error is due to incorrect current password
      const errorMessage = error.message || 'Failed to change password';
      
      if (errorMessage.toLowerCase().includes('current password') || 
          errorMessage.toLowerCase().includes('incorrect password') ||
          errorMessage.toLowerCase().includes('old password')) {
        
        Alert.alert(
          'Incorrect Password',
          'The current password you entered is incorrect. Please try again.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { text: string; color: string } => {
    if (!password) return { text: '', color: COLORS.gray };
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const strength = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber].filter(Boolean).length;
    
    if (strength <= 2) return { text: 'Weak', color: COLORS.error };
    if (strength === 3) return { text: 'Fair', color: '#f59e0b' };
    return { text: 'Strong', color: COLORS.success };
  };

  // SPECIAL CASE: Check if password contains special characters (EXCLUDING underscore)
  const hasSpecialChar = (password: string): boolean => {
    // EXCLUDE underscore from special character check
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(password);
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="lock-reset" size={60} color={COLORS.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Enter your current password and choose a new secure password
          </Text>

          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
              <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter current password"
                placeholderTextColor={colors.textSecondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <MaterialIcons
                  name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
              <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <MaterialIcons
                  name={showNewPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && (
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                Password Strength: {passwordStrength.text}
              </Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.darkGray }]}>
              <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={[styles.errorText, { color: COLORS.error }]}>
                Passwords do not match
              </Text>
            )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={[styles.requirementsTitle, { color: colors.text }]}>
              Password Requirements:
            </Text>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={newPassword.length >= 8 ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={newPassword.length >= 8 ? COLORS.success : colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={/[A-Z]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={/[A-Z]/.test(newPassword) ? COLORS.success : colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One uppercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={/[a-z]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={/[a-z]/.test(newPassword) ? COLORS.success : colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One lowercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={/[0-9]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={/[0-9]/.test(newPassword) ? COLORS.success : colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One number
              </Text>
            </View>
            {/* SPECIAL CASE: Optional special character requirement (excluding underscore) */}
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={hasSpecialChar(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={hasSpecialChar(newPassword) ? COLORS.success : colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                One special character (optional)
              </Text>
            </View>
            {/* SPECIAL CASE NOTE: Explain underscore is not considered special */}
            <View style={styles.noteContainer}>
              <MaterialIcons name="info" size={14} color={COLORS.primary} />
              <Text style={styles.noteText}>
                Note: Your server does not consider underscore (_) as a special character
              </Text>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.secondary} />
            ) : (
              <Text style={styles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  iconContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SIZES.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    paddingHorizontal: SIZES.md,
    height: SIZES.inputHeight,
    gap: SIZES.sm,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  strengthText: {
    fontSize: SIZES.small,
    marginTop: SIZES.xs,
    fontWeight: '600',
  },
  errorText: {
    fontSize: SIZES.small,
    color: COLORS.error,
    marginTop: SIZES.xs,
  },
  requirementsContainer: {
    backgroundColor: COLORS.inputBackground,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    marginBottom: SIZES.xl,
  },
  requirementsTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SIZES.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  requirementText: {
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginTop: SIZES.sm,
    padding: SIZES.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.radiusSmall,
  },
  noteText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  cancelButton: {
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.white,
  },
});