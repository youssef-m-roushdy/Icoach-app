import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../types';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

type EditProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EditProfile'
>;

const C = {
  primary: '#C5981B',
  primaryLight: 'rgba(197,152,27,0.12)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: C.primary + '15' }]}>
          {icon}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

interface ProfileInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  note?: string;
}

const ProfileInput: React.FC<ProfileInputProps> = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  multiline,
  numberOfLines,
  editable = true,
  note,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputLabelContainer}>
        <View style={[styles.inputIcon, { backgroundColor: C.primary + '15' }]}>
          {icon}
        </View>
        <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
        {note && (
          <Text style={[styles.inputNote, { color: colors.textSecondary }]}>
            {note}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: editable ? colors.background : colors.iconBg,
            borderColor: isFocused ? C.primary : colors.divider,
            opacity: editable ? 1 : 0.7,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />
      </View>
    </View>
  );
};

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { colors } = useTheme();
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!token) {
      showErrorToast({
        title: 'Authentication Error',
        message: 'Authentication token not found',
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      showErrorToast({
        title: 'Missing Required Fields',
        message: 'First name and last name are required',
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData: any = {};

      if (firstName.trim() !== (user?.firstName || '')) {
        updateData.firstName = firstName.trim();
      }

      if (lastName.trim() !== (user?.lastName || '')) {
        updateData.lastName = lastName.trim();
      }

      if (phone.trim() !== (user?.phone || '')) {
        updateData.phone = phone.trim() || null;
      }

      if (bio.trim() !== (user?.bio || '')) {
        updateData.bio = bio.trim() || null;
      }

      if (Object.keys(updateData).length === 0) {
        showInfoToast({
          title: 'No Changes',
          message: 'There are no changes to save',
        });
        return;
      }

      const response = await userService.updateProfile(updateData, token);

      if (response.data) {
        updateUser(response.data);
      }

      showSuccessToast({
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully',
      });

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error: unknown) {
      showErrorToast({
        title: 'Update Failed',
        message: getErrorMessage(error) || 'Failed to update profile',
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.log(error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Update your personal information
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information Section */}
        <SectionCard
          title="Personal Information"
          icon={<Feather name="user" size={20} color={C.primary} />}
        >
          <ProfileInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            icon={<Feather name="user" size={18} color={C.primary} />}
            placeholder="John"
          />

          <View style={styles.inputSpacer} />

          <ProfileInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            icon={<Feather name="user" size={18} color={C.primary} />}
            placeholder="Doe"
          />
        </SectionCard>

        {/* Read-Only Information Section */}
        <SectionCard
          title="Account Details"
          icon={<Feather name="settings" size={20} color={C.primary} />}
        >
          <ProfileInput
            label="Username"
            value={user?.username || ''}
            onChangeText={() => {}}
            icon={<Feather name="at-sign" size={18} color={C.primary} />}
            editable={false}
            note="Username cannot be changed"
          />

          <View style={styles.inputSpacer} />

          <ProfileInput
            label="Email"
            value={user?.email || ''}
            onChangeText={() => {}}
            icon={<Feather name="mail" size={18} color={C.primary} />}
            editable={false}
            note="Email cannot be changed"
          />
        </SectionCard>

        {/* Contact & Bio Section */}
        <SectionCard
          title="Contact & Bio"
          icon={<Feather name="phone" size={20} color={C.primary} />}
        >
          <ProfileInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            icon={<Feather name="phone" size={18} color={C.primary} />}
            placeholder="+1234567890"
          />

          <View style={styles.inputSpacer} />

          <ProfileInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            icon={<Feather name="info" size={18} color={C.primary} />}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
          />
        </SectionCard>

        {/* Info Note */}
        <View style={[styles.infoNote, { backgroundColor: colors.iconBg }]}>
          <Feather name="info" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
            Only your name, phone, and bio can be edited. Username and email are permanent.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={C.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.divider }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: C.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Feather name="check" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    marginLeft: 48,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  inputNote: {
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    fontSize: 16,
    padding: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputSpacer: {
    height: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});