import React, { useState, useEffect, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { userService } from '../services';
import { useAuth } from '../context';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user: authUser, token, logout, updateUser } = useAuth();
  const [userData, setUserData] = useState<any>(authUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  useEffect(() => {
    // Use auth user data from context
    if (authUser) {
      setUserData(authUser);
    }
  }, [authUser]);

  const loadProfile = async () => {
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    console.log('🔍 ProfileScreen - Loading profile...');

    setIsLoading(true);
    try {
      const response = await userService.getProfile(token);
      console.log('✅ Profile Response:', JSON.stringify(response, null, 2));
      
      // Use API response data, which has all the body info
      if (response.data) {
        setUserData(response.data);
        // Update global auth state so changes persist across screens
        updateUser(response.data);
      }
    } catch (error: any) {
      console.error('❌ Profile Error:', error);
      console.error('❌ Error Message:', error.message);
      
      // Keep using context user data on error
      Alert.alert('Info', 'Using cached profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    // react-native-image-picker handles permissions automatically
    return {
      camera: true,
      media: true,
    };
  };

  const handleTakePhoto = async () => {
    setShowImageOptions(false);

    try {
      const image = await ImagePicker.openCamera({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageMaxWidth: 1000,
        compressImageMaxHeight: 1000,
        compressImageQuality: 0.8,
        includeBase64: false,
        mediaType: 'photo',
      });

      if (image && image.path) {
        await uploadProfilePicture(image.path);
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const handleChooseFromGallery = async () => {
    setShowImageOptions(false);

    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageMaxWidth: 1000,
        compressImageMaxHeight: 1000,
        compressImageQuality: 0.8,
        includeBase64: false,
        mediaType: 'photo',
      });

      if (image && image.path) {
        await uploadProfilePicture(image.path);
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error choosing photo:', error);
        Alert.alert('Error', 'Failed to choose photo');
      }
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    if (!token) {
      Alert.alert('Error', 'No authentication token found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.updateProfilePicture(uri, token);
      console.log('✅ Profile picture updated:', response);
      
      // Update local state with new avatar
      if (response.data?.avatar) {
        const updatedUserData = {
          ...userData,
          avatar: response.data.avatar,
        };
        setUserData(updatedUserData);
        // Update global auth state so avatar persists across screens
        updateUser(updatedUserData);
      }
      
      Alert.alert('Success', 'Profile picture updated successfully');
      // Reload profile to get the latest data
      await loadProfile();
    } catch (error: any) {
      console.error('❌ Upload Error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfilePicture = () => {
    setShowImageOptions(false);
    
    Alert.alert(
      'Delete Profile Picture',
      'Are you sure you want to delete your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              Alert.alert('Error', 'No authentication token found');
              return;
            }

            setIsLoading(true);
            try {
              await userService.deleteProfilePicture(token);
              console.log('✅ Profile picture deleted');
              
              // Update local state to remove avatar
              const updatedUserData = {
                ...userData,
                avatar: null,
              };
              setUserData(updatedUserData);
              // Update global auth state so avatar removal persists across screens
              updateUser(updatedUserData);
              
              Alert.alert('Success', 'Profile picture deleted successfully');
              // Reload profile to get the latest data
              await loadProfile();
            } catch (error: any) {
              console.error('❌ Delete Error:', error);
              Alert.alert('Error', error.message || 'Failed to delete profile picture');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (token) {
                await logout();
              }
              navigation.replace('Welcome');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load profile</Text>
        <TouchableOpacity onPress={loadProfile} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bmiCategory = userData.bmi 
    ? userData.bmi < 18.5 ? 'Underweight'
      : userData.bmi < 25 ? 'Normal'
      : userData.bmi < 30 ? 'Overweight'
      : 'Obese'
    : null;

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        {/* Header with Avatar */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowImageOptions(true)}
          >
            {userData.avatar ? (
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <MaterialIcons name="person" size={60} color={colors.primary} />
              </View>
            )}
            {/* Edit Icon Overlay */}
            <View style={styles.editIconContainer}>
              <MaterialIcons name="camera-alt" size={20} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>
            {userData.firstName} {userData.lastName}
          </Text>
          <Text style={styles.username}>@{userData.username}</Text>
        </View>

        {userData && !userData.isEmailVerified && (
  <View style={styles.verificationBanner}>
    <View style={styles.verificationContent}>
      <MaterialIcons name="warning" size={24} color="#ef4444" />
      <View style={styles.verificationTextContainer}>
        <Text style={styles.verificationTitle}>Account Not Activated</Text>
        <Text style={styles.verificationMessage}>
          Your email address is not verified. Please verify your email to access all features.
        </Text>
      </View>
    </View>
    <TouchableOpacity
      style={styles.verifyButton}
      onPress={() => navigation.navigate('EmailVerification')}
    >
      <Text style={styles.verifyButtonText}>Activate Account</Text>
      <MaterialIcons name="arrow-forward" size={18} color={COLORS.secondary} />
    </TouchableOpacity>
  </View>
)}

        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              style={styles.editButton}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="email" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{userData.email}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="phone" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, !userData.phone && styles.notProvided, { color: colors.text }]}>
                {userData.phone || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="info" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Bio</Text>
              <Text style={[styles.infoValue, !userData.bio && styles.notProvided, { color: colors.text }]}>
                {userData.bio || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="cake" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
              <Text style={[styles.infoValue, !userData.dateOfBirth && styles.notProvided, { color: colors.text }]}>
                {userData.dateOfBirth || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="person" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Gender</Text>
              <Text style={[styles.infoValue, !userData.gender && styles.notProvided, { color: colors.text }]}>
                {userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Body Information Section */}
        <View style={[styles.section, { backgroundColor: COLORS.inputBackground }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Body & Fitness</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditBodyInfo')}
              style={styles.editButton}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="height" size={24} color={colors.primary} />
              <Text style={[styles.statValue, !userData.height && styles.notProvided, { color: colors.text }]}>
                {userData.height ? `${userData.height} cm` : 'Not provided'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Height</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="monitor-weight" size={24} color={colors.primary} />
              <Text style={[styles.statValue, !userData.weight && styles.notProvided, { color: colors.text }]}>
                {userData.weight ? `${userData.weight} kg` : 'Not provided'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weight</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.statValue, !userData.bmi && styles.notProvided, { color: colors.text }]}>
                {userData.bmi || 'Not provided'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>BMI</Text>
              {bmiCategory && (
                <Text style={[styles.statSubLabel, { color: colors.primary }]}>{bmiCategory}</Text>
              )}
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
              <Text style={[styles.statValue, !userData.bodyFatPercentage && styles.notProvided, { color: colors.text }]}>
                {userData.bodyFatPercentage ? `${userData.bodyFatPercentage}%` : 'Not provided'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Body Fat</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="flag" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fitness Goal</Text>
              <Text style={[styles.infoValue, !userData.fitnessGoal && styles.notProvided, { color: colors.text }]}>
                {userData.fitnessGoal ? userData.fitnessGoal.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <MaterialIcons name="directions-run" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Activity Level</Text>
              <Text style={[styles.infoValue, !userData.activityLevel && styles.notProvided, { color: colors.text }]}>
                {userData.activityLevel ? userData.activityLevel.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <MaterialIcons name="lock" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <MaterialIcons name="notifications" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <MaterialIcons name="privacy-tip" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Privacy</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
            <MaterialIcons name="chevron-right" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowImageOptions(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: COLORS.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleTakePhoto}
            >
              <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleChooseFromGallery}
            >
              <MaterialIcons name="photo-library" size={24} color={colors.primary} />
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            {userData.avatar && (
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleDeleteProfilePicture}
              >
                <MaterialIcons name="delete" size={24} color="#ef4444" />
                <Text style={[styles.modalOptionText, { color: '#ef4444' }]}>Delete Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.modalOption, styles.modalCancelOption]}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SIZES.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    marginBottom: SIZES.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSmall,
  },
  retryText: {
    color: COLORS.secondary,
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  avatarContainer: {
    marginBottom: SIZES.md,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  name: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.xs,
  },
  username: {
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  section: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  editText: {
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: SIZES.xs,
  },
  infoValue: {
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  notProvided: {
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.inputBackground,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  statValue: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: SIZES.xs,
  },
  statSubLabel: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    marginTop: SIZES.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  menuText: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.modalBackground,
    borderTopLeftRadius: SIZES.radiusLarge,
    borderTopRightRadius: SIZES.radiusLarge,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
    paddingBottom: SIZES.xl + 20,
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    gap: SIZES.md,
  },
  modalOptionText: {
    fontSize: SIZES.body,
    color: COLORS.white,
    fontWeight: '500',
  },
  modalCancelOption: {
    marginTop: SIZES.sm,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    paddingTop: SIZES.lg,
  },
  modalCancelText: {
    fontSize: SIZES.body,
    color: COLORS.gray,
    fontWeight: '500',
  },
  verificationBanner: {
    backgroundColor: COLORS.errorBackground,
    borderLeftWidth: SIZES.borderThick,
    borderLeftColor: COLORS.error,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    borderRadius: SIZES.radiusSmall,
  },
  verificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SIZES.xs,
  },
  verificationMessage: {
    fontSize: SIZES.small,
    color: COLORS.errorLight,
    lineHeight: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    backgroundColor: COLORS.error,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusSmall,
  },
  verifyButtonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});