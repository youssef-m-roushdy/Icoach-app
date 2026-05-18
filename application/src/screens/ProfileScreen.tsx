import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable,
  StatusBar,
  Switch,
  Platform,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { userService } from '../services';
import { useAuth } from '../context';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SuccessModal from '../components/common/SuccessModal';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { colors, theme, toggleTheme } = useTheme();
  const { user: authUser, token, logout, updateUser } = useAuth();
  const { systemBottomInset } = useSystemNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;
  
  const [userData, setUserData] = useState<any>(authUser);
  const [isLoading, setIsLoading] = useState(false);

  const imageOptionsSheetRef = React.useRef<BottomSheetModal>(null);
  const settingsSheetRef = React.useRef<BottomSheetModal>(null);
  const imageOptionsSnapPoints = React.useMemo(() => ['30%'], []);
  const settingsSnapPoints = React.useMemo(() => ['65%', '85%'], []);

  const modalSheetBg = theme === 'dark' ? '#1C1C1E' : '#FFFFFF';
  
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showDeletePicConfirm, setShowDeletePicConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Track modal open states for back button handling
  const [isImageOptionsModalOpen, setIsImageOptionsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const sheetBackground = React.useMemo(
    () => ({ backgroundColor: modalSheetBg }),
    [modalSheetBg]
  );
  
  const handleIndicatorStyle = React.useMemo(
    () => ({ backgroundColor: colors.divider ?? '#C0C0C0', width: 40, height: 4 }),
    [colors.divider]
  );
  
  const handleImageOptionsSheetChange = useCallback((index: number) => {
    setIsImageOptionsModalOpen(index >= 0);
  }, []);

  const handleSettingsSheetChange = useCallback((index: number) => {
    setIsSettingsModalOpen(index >= 0);
  }, []);

  const openImageOptionsSheet = useCallback(() => { 
    setIsImageOptionsModalOpen(true);
    imageOptionsSheetRef.current?.present(); 
  }, []);

  const closeImageOptionsSheet = useCallback(() => { 
    setIsImageOptionsModalOpen(false);
    imageOptionsSheetRef.current?.dismiss(); 
  }, []);
  
  const openSettingsSheet = useCallback(() => {
    setIsSettingsModalOpen(true);
    settingsSheetRef.current?.present();
  }, []);

  const closeSettingsSheet = useCallback(() => { 
    setIsSettingsModalOpen(false);
    settingsSheetRef.current?.dismiss(); 
  }, []);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      if (isImageOptionsModalOpen) {
        closeImageOptionsSheet();
        return true;
      }
      if (isSettingsModalOpen) {
        closeSettingsSheet();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [isImageOptionsModalOpen, isSettingsModalOpen, closeImageOptionsSheet, closeSettingsSheet]);

  useEffect(() => {
    if (authUser) setUserData(authUser);
  }, [authUser]);

  const loadProfile = useCallback(async () => {
    if (!token) {
      showErrorToast({
        title: t('authenticationError'),
        message: t('authenticationTokenNotFound'),
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.getProfile(token);
      if (response?.data) {
        setUserData(response.data);
        updateUser(response.data);
      } else {
        showInfoToast({
          title: t('usingCachedData'),
          message: t('noFreshProfileDataReturned'),
        });
      }
    } catch (error: unknown) {
      console.error('❌ Profile Error:', error);
      showInfoToast({
        title: t('usingCachedData'),
        message: t('unableToRefreshProfile'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, updateUser, t]);

  const uploadProfilePicture = useCallback(
    async (uri: string) => {
      if (!token) {
        showErrorToast({
          title: t('authenticationError'),
          message: t('authenticationTokenNotFound'),
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await userService.updateProfilePicture(uri, token);
        console.log('✅ Profile picture updated:', response);

        if (response?.data?.avatar) {
          const updatedUserData = { ...userData, avatar: response.data.avatar };
          setUserData(updatedUserData);
          updateUser(updatedUserData);
        }

        showSuccessToast({
          title: t('profilePictureUpdated'),
          message: t('profilePictureUpdatedMessage'),
        });

        await loadProfile();
      } catch (error: unknown) {
        console.error('❌ Upload Error:', error);
        showErrorToast({
          title: t('uploadFailed'),
          message: getErrorMessage(error) || t('failedToUpdateProfilePicture'),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [token, userData, updateUser, loadProfile, t]
  );

  const handleTakePhoto = async () => {
    closeImageOptionsSheet();
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

      if (image?.path) {
        await uploadProfilePicture(image.path);
      } else {
        showInfoToast({
          title: t('noPhotoCaptured'),
          message: t('captureValidImage'),
        });
      }
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.error('Error taking photo:', error);
        showErrorToast({
          title: t('cameraError'),
          message: getErrorMessage(error) || t('failedToTakePhoto'),
        });
      }
    }
  };

  const handleChooseFromGallery = async () => {
    closeImageOptionsSheet();
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

      if (image?.path) {
        await uploadProfilePicture(image.path);
      } else {
        showInfoToast({
          title: t('noImageSelected'),
          message: t('chooseValidImage'),
        });
      }
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.error('Error choosing photo:', error);
        showErrorToast({
          title: t('galleryError'),
          message: getErrorMessage(error) || t('failedToChoosePhoto'),
        });
      }
    }
  };

  const confirmDeleteProfilePicture = () => {
    closeImageOptionsSheet();
    setShowDeletePicConfirm(true);
  };

  const proceedDeleteProfilePicture = async () => {
    setShowDeletePicConfirm(false);
    if (!token) {
      showErrorToast({
        title: t('authenticationError'),
        message: t('authenticationTokenNotFound'),
      });
      return;
    }

    setIsLoading(true);
    try {
      await userService.deleteProfilePicture(token);
      console.log('✅ Profile picture deleted');

      const updatedUserData = { ...userData, avatar: null };
      setUserData(updatedUserData);
      updateUser(updatedUserData);

      showSuccessToast({
        title: t('profilePictureDeleted'),
        message: t('profilePictureDeletedMessage'),
      });

      await loadProfile();
    } catch (error: unknown) {
      console.error('❌ Delete Error:', error);
      showErrorToast({
        title: t('deleteFailed'),
        message: getErrorMessage(error) || t('failedToDeleteProfilePicture'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const proceedLogout = () => {
    setShowLogoutConfirm(false);
    closeSettingsSheet();
    setTimeout(() => {
      logout();
    }, 100);
  };

  const renderImageOptionsModal = () => {
    return (
      <BottomSheetModal
        ref={imageOptionsSheetRef}
        index={0}
        enableDynamicSizing={true}
        onChange={handleImageOptionsSheetChange}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        enablePanDownToClose
      >
        <BottomSheetView style={[styles.modalContent, { paddingBottom: Math.max(30, systemBottomInset + 4) }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t('profilePicture')}</Text>

          <TouchableOpacity style={styles.modalOpt} onPress={handleTakePhoto}>
            <View style={[styles.modalOptIcon, { backgroundColor: colors.iconBg }]}>
              <Feather name="camera" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.modalOptText, { color: colors.text }]}>{t('takePhoto')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOpt} onPress={handleChooseFromGallery}>
            <View style={[styles.modalOptIcon, { backgroundColor: colors.iconBg }]}>
              <Feather name="image" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.modalOptText, { color: colors.text }]}>{t('chooseFromGallery')}</Text>
          </TouchableOpacity>

          {userData?.avatar && (
            <TouchableOpacity style={styles.modalOpt} onPress={confirmDeleteProfilePicture}>
              <View style={[styles.modalOptIcon, { backgroundColor: COLORS.error + '12' }]}>
                <Feather name="trash-2" size={20} color={COLORS.error} />
              </View>
              <Text style={[styles.modalOptText, { color: COLORS.error }]}>{t('deletePhoto')}</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.modalDivider, { backgroundColor: colors.divider ?? '#E0E0E0' }]} />
          <TouchableOpacity style={styles.modalCancel} onPress={closeImageOptionsSheet}>
            <Text style={[styles.modalCancelText, { color: colors.subtleText }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  };

  // Settings Modal with Professional Theme Switcher
  const renderSettingsModal = () => {
    return (
      <BottomSheetModal
        ref={settingsSheetRef}
        snapPoints={settingsSnapPoints}
        onChange={handleSettingsSheetChange}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20, marginTop: 10 }]}>{t('settingsAndAccount')}</Text>
          
          <View style={styles.settingsGroup}>
            <Text style={[styles.settingsGroupTitle, { color: colors.primary }]}>{t('account')}</Text>
            <TouchableOpacity style={styles.settingsItem} onPress={() => { closeSettingsSheet(); navigation.navigate('EditProfile'); }}>
              <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                <Feather name="user" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('editProfile')}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={() => { closeSettingsSheet(); navigation.navigate('EditBodyInfo'); }}>
              <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                <MaterialIcons name="monitor-weight" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('editBodyInfo')}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={() => { closeSettingsSheet(); navigation.navigate('ChangePassword'); }}>
              <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                <Feather name="lock" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('changePassword')}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsGroup}>
            <Text style={[styles.settingsGroupTitle, { color: colors.primary }]}>{t('preferences')}</Text>
            
            {/* Professional Theme Switcher */}
            <View style={styles.themeSwitcherContainer}>
              <View style={styles.themeSwitcherHeader}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                  {theme === 'light' ? (
                    <Feather name="sun" size={18} color={colors.primary} />
                  ) : (
                    <Feather name="moon" size={18} color={colors.primary} />
                  )}
                </View>
                <View style={styles.themeSwitcherTextContainer}>
                  <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('theme')}</Text>
                  <Text style={[styles.themeSwitcherSubtext, { color: colors.textSecondary }]}>
                    {theme === 'light' ? t('lightMode') : t('darkMode')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleTheme}
                  activeOpacity={0.8}
                  style={styles.themeToggleButton}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary || colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.themeToggleGradient,
                      { opacity: 0.9 }
                    ]}
                  >
                    <View style={styles.themeToggleContent}>
                      {theme === 'light' ? (
                        <>
                          <Feather name="sun" size={14} color="#FFF" />
                          <Text style={styles.themeToggleText}>{t('light')}</Text>
                        </>
                      ) : (
                        <>
                          <Feather name="moon" size={14} color="#FFF" />
                          <Text style={styles.themeToggleText}>{t('dark')}</Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.settingsItem} onPress={() => { closeSettingsSheet(); showInfoToast({title: t('privacyTitle'), message: t('privacyPolicyComingSoon')}) }}>
              <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                <Feather name="shield" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('privacyPolicy')}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem} onPress={() => { closeSettingsSheet(); showInfoToast({title: t('about'), message: t('aboutDescription')}) }}>
              <View style={[styles.settingsIconContainer, { backgroundColor: colors.iconBg }]}>
                <Feather name="info" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('about')}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutSettingBtn} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={COLORS.error} style={{ marginRight: 10 }} />
            <Text style={{ color: COLORS.error, fontSize: 16, fontWeight: '600' }}>{t('logout')}</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return t('underweight');
    if (bmi < 25) return t('normal');
    if (bmi < 30) return t('overweight');
    return t('obese');
  };

  const getBMIColor = (bmi: number | null | undefined): string => {
    if (!bmi) return colors.textSecondary;
    if (bmi < 18.5) return '#F59E0B';
    if (bmi < 25) return '#10B981';
    if (bmi < 30) return '#F97316';
    return COLORS.error;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {t('failedToLoadProfile')}
        </Text>
        <TouchableOpacity
          onPress={loadProfile}
          style={[styles.retryButton, { backgroundColor: COLORS.primary }]}
        >
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bmiValue = userData.bmi;
  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : null;
  const bmiColor = getBMIColor(bmiValue);
  const isLight = theme === 'light';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />

      <LinearGradient
        colors={colors.authBgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: colors.authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: colors.authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: colors.authCircle3 }]} />
      </LinearGradient>

      <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: dynamicPaddingBottom }]}
        >
          <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: insets.top + 10 }}>
            <TouchableOpacity 
              onPress={openSettingsSheet}
              style={{
                width: 40, height: 40, borderRadius: 20, 
                backgroundColor: colors.surface, 
                justifyContent: 'center', alignItems: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3
              }}
            >
              <Feather name="settings" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={openImageOptionsSheet}
              activeOpacity={0.8}
            >
            <View
              style={[
                styles.avatarRing,
                { borderColor: colors.primary + '40', shadowColor: colors.shadow },
              ]}
            >
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[colors.primary, isLight ? '#D4AF37' : '#FFD700']}
                  style={styles.avatarFallback}
                >
                  <Text style={styles.avatarInitials}>
                    {userData.firstName?.[0] || ''}
                    {userData.lastName?.[0] || ''}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View
              style={[
                styles.cameraBtn,
                { backgroundColor: colors.primary, borderColor: colors.background },
              ]}
            >
              <Feather name="camera" size={13} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.text }]}>
            {userData.firstName} {userData.lastName}
          </Text>
          <Text style={[styles.profileUsername, { color: colors.subtleText }]}>
            @{userData.username}
          </Text>

          <View style={styles.quickStatsRow}>
            <View
              style={[
                styles.quickChip,
                { backgroundColor: colors.statBg, borderColor: colors.statBorder },
              ]}
            >
              <MaterialIcons name="height" size={15} color={colors.primary} />
              <Text style={[styles.quickChipText, { color: colors.text }]}>
                {userData.height ? `${userData.height} cm` : t('notAvailableCm')}
              </Text>
            </View>

            <View
              style={[
                styles.quickChip,
                { backgroundColor: colors.statBg, borderColor: colors.statBorder },
              ]}
            >
              <MaterialIcons name="monitor-weight" size={15} color={colors.primary} />
              <Text style={[styles.quickChipText, { color: colors.text }]}>
                {userData.weight ? `${userData.weight} kg` : t('notAvailableKg')}
              </Text>
            </View>

            {userData.bmi ? (
              <View
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: bmiColor + '12',
                    borderColor: bmiColor + '30',
                  },
                ]}
              >
                <MaterialIcons name="analytics" size={15} color={bmiColor} />
                <Text style={[styles.quickChipText, { color: bmiColor }]}>
                  BMI {userData.bmi}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Verification Banner */}
        {userData && !userData.isEmailVerified && (
          <View
            style={[
              styles.verifyBanner,
              {
                backgroundColor: COLORS.error + '08',
                borderColor: COLORS.error + '20',
              },
            ]}
          >
            <View style={styles.verifyRow}>
              <View style={[styles.verifyIcon, { backgroundColor: COLORS.error + '15' }]}>
                <Ionicons name="warning" size={18} color={COLORS.error} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.verifyTitle, { color: COLORS.error }]}>
                  {t('emailNotVerifiedTitle')}
                </Text>
                <Text style={[styles.verifyMsg, { color: colors.textSecondary }]}>
                  {t('verifyToUnlockFeatures')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.verifyAction, { backgroundColor: COLORS.error }]}
                onPress={() => navigation.navigate('EmailVerification')}
              >
                <Text style={styles.verifyActionText}>{t('verify')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('personalInformation')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              style={[styles.editPill, { backgroundColor: colors.iconBg }]}
            >
              <Feather name="edit-2" size={13} color={colors.primary} />
              <Text style={[styles.editPillText, { color: colors.primary }]}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.authInputBg ?? colors.surface, borderColor: colors.authInputBorder ?? colors.cardBorder },
            ]}
          >
            {[
              { icon: 'mail',     label: t('emailLabel'),    value: userData.email },
              { icon: 'phone',    label: t('phone'),    value: userData.phone || t('notProvided') },
              { icon: 'info',     label: t('bio'),      value: userData.bio || t('notProvided') },
              { icon: 'calendar', label: t('birthday'), value: userData.dateOfBirth || t('notProvided') },
              {
                icon: 'user',
                label: t('gender'),
                value: userData.gender
                  ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1)
                  : t('notProvided'),
              },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: colors.iconBg }]}>
                    <Feather name={row.icon as any} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.subtleText }]}>
                      {row.label}
                    </Text>
                    <Text
                      style={[styles.infoValue, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {row.value}
                    </Text>
                  </View>
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Body & Fitness */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('bodyAndFitness')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('EditBodyInfo')}
              style={[styles.editPill, { backgroundColor: colors.iconBg }]}
            >
              <Feather name="edit-2" size={13} color={colors.primary} />
              <Text style={[styles.editPillText, { color: colors.primary }]}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {[
              { icon: 'height',         label: t('height'), value: userData.height || '--', unit: 'cm' },
              { icon: 'monitor-weight', label: t('weight'), value: userData.weight || '--', unit: 'kg' },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  { backgroundColor: colors.authInputBg ?? colors.surface, borderColor: colors.authInputBorder ?? colors.cardBorder },
                ]}
              >
                <View style={[styles.statIconBox, { backgroundColor: colors.iconBg }]}>
                  <MaterialIcons name={s.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statVal, { color: colors.text }]}>{s.value}</Text>
                <Text style={[styles.statUnit, { color: colors.subtleText }]}>{s.unit}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.wideCard,
              { backgroundColor: colors.authInputBg ?? colors.surface, borderColor: colors.authInputBorder ?? colors.cardBorder },
            ]}
          >
            <View style={styles.wideCardLeft}>
              <View style={[styles.statIconBox, { backgroundColor: bmiColor + '15' }]}>
                <MaterialIcons name="analytics" size={20} color={bmiColor} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.wideCardValue, { color: colors.text }]}>
                  {userData.bmi || '--'}
                </Text>
                <Text style={[styles.wideCardLabel, { color: colors.textSecondary }]}>
                  {t('bmiIndexLabel')}
                </Text>
              </View>
            </View>

            {bmiCategory && (
              <View style={[styles.bmiBadge, { backgroundColor: bmiColor + '15' }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>
                  {bmiCategory}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.wideCard,
              {
                backgroundColor: colors.authInputBg ?? colors.surface,
                borderColor: colors.authInputBorder ?? colors.cardBorder,
                marginTop: 10,
              },
            ]}
          >
            <View style={styles.wideCardLeft}>
              <View style={[styles.statIconBox, { backgroundColor: colors.iconBg }]}>
                <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.wideCardValue, { color: colors.text }]}>
                  {userData.bodyFatPercentage ? `${userData.bodyFatPercentage}%` : '--'}
                </Text>
                <Text style={[styles.wideCardLabel, { color: colors.textSecondary }]}>
                  {t('bodyFat')}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.authInputBg ?? colors.surface,
                borderColor: colors.authInputBorder ?? colors.cardBorder,
                marginTop: 10,
              },
            ]}
          >
            <View style={styles.goalRow}>
              <View style={[styles.goalDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.subtleText }]}>
                  {t('fitnessGoal')}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {userData.fitnessGoal
                    ? userData.fitnessGoal
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())
                    : t('notSet')}
                </Text>
              </View>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.goalRow}>
              <View style={[styles.goalDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.subtleText }]}>
                  {t('activityLevel')}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {userData.activityLevel
                    ? userData.activityLevel
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())
                    : t('notSet')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workout Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('workoutData')}</Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.authInputBg ?? colors.surface, borderColor: colors.authInputBorder ?? colors.cardBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('SavedWorkouts')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}>
                <Feather name="bookmark" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('savedWorkouts')}</Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('WorkoutHistory')}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}>
                <Feather name="clock" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('workoutHistory')}</Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* AI Coach Camera Assistant */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LiveWorkout')}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}>
                <MaterialIcons name="videocam" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('aiCoachCamera')}</Text>
              <Text style={[styles.menuBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                {t('cameraAssistant')}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* AI Coach Chat Assistant */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Chatbot')}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}>
                <Feather name="message-circle" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{t('aiCoachChat')}</Text>
              <Text style={[styles.menuBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                {t('textAssistant')}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.versionText, { color: colors.subtleText }]}>{t('versionNumber')}</Text>
      </ScrollView>

      {renderImageOptionsModal()}
      {renderSettingsModal()}

      <SuccessModal
        visible={showDeletePicConfirm}
        title={t('deleteProfilePictureTitle')}
        message={t('deleteProfilePictureMessage')}
        primaryButtonText={t('delete')}
        onPrimaryPress={proceedDeleteProfilePicture}
        secondaryButtonText={t('cancel')}
        onSecondaryPress={() => setShowDeletePicConfirm(false)}
        iconName="trash-outline"
      />

      <SuccessModal
        visible={showLogoutConfirm}
        title={t('logout')}
        message={t('logoutConfirmationMessage')}
        primaryButtonText={t('logout')}
        onPrimaryPress={proceedLogout}
        secondaryButtonText={t('cancel')}
        onSecondaryPress={() => setShowLogoutConfirm(false)}
        iconName="log-out-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {},
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: '#FFF' },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  profileName: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  profileUsername: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  quickStatsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  quickChipText: { fontSize: 12, fontWeight: '600' },

  verifyBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  verifyTitle: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  verifyMsg: { fontSize: 12 },
  verifyAction: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  verifyActionText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  editPillText: { fontSize: 12, fontWeight: '600' },

  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 12,
  },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: { fontSize: 14, fontWeight: '600' },
  rowDivider: { height: 1, marginLeft: 56 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statVal: { fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 12, fontWeight: '500', marginTop: -2, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },

  wideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  wideCardLeft: { flexDirection: 'row', alignItems: 'center' },
  wideCardValue: { fontSize: 18, fontWeight: '800' },
  wideCardLabel: { fontSize: 12, fontWeight: '500' },
  bmiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bmiBadgeText: { fontSize: 12, fontWeight: '700' },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 12,
  },
  goalDot: { width: 8, height: 8, borderRadius: 4 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 12,
  },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500' },
  menuBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    overflow: 'hidden',
  },
  versionText: { fontSize: 12, textAlign: 'center', marginBottom: 20 },

  // Modal styles
  modalContent: {
    width: '100%',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  settingsGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#33333333',
  },
  settingsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  modalOptIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalDivider: {
    height: 1,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutSettingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: COLORS.error + '10',
    justifyContent: 'center',
  },
  // Professional Theme Switcher Styles
  themeSwitcherContainer: {
    marginBottom: 8,
  },
  themeSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  themeSwitcherTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  themeSwitcherSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  themeToggleButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  themeToggleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeToggleText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});