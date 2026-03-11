import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../types';
import { CustomInput, CustomButton } from '../components/common';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';

type EditProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { colors } = useTheme();
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {};
      
      if (firstName !== user?.firstName) updateData.firstName = firstName.trim();
      if (lastName !== user?.lastName) updateData.lastName = lastName.trim();
      if (username !== user?.username) updateData.username = username.trim();
      if (email !== user?.email) updateData.email = email.trim();
      if (phone !== user?.phone) updateData.phone = phone.trim();
      if (bio !== user?.bio) updateData.bio = bio.trim();

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No changes to save');
        return;
      }

      const response = await userService.updateProfile(updateData, token);
      
      if (response.data) {
        updateUser(response.data);
      }
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.label, { color: colors.text }]}>First Name *</Text>
        <CustomInput
          placeholder="John"
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Last Name *</Text>
        <CustomInput
          placeholder="Doe"
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Username</Text>
        <CustomInput
          placeholder="johndoe"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <CustomInput
          placeholder="john@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
        <CustomInput
          placeholder="+1234567890"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
        <CustomInput
          placeholder="Tell us about yourself..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />

        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
              />
              <CustomButton
                title="Save Changes"
                variant="secondary"
                onPress={handleSave}
                style={styles.saveButton}
              />
            </>
          )}
        </View>
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
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
  },
  label: {
    fontSize: SIZES.body,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.xl,
    gap: SIZES.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
