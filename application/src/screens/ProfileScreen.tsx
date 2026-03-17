import React, { useState, useEffect } from 'react';
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
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ImagePicker from 'react-native-image-crop-picker';
import { COLORS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { userService } from '../services';
import { useAuth } from '../context';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Gesture vs button nav detection ─────────────────────────────────────────
function getNavBarInfo(): { height: number; isGestureMode: boolean } {
  if (Platform.OS !== 'android') return { height: 0, isGestureMode: false };
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const sbH = StatusBar.currentHeight ?? 0;
  const height = Math.max(screenH - windowH - sbH, 0);
  // Button nav ≈ 48dp, gesture nav ≈ 24dp — threshold 30dp separates them
  const isGestureMode = height <= 30;
  return { height, isGestureMode };
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { user: authUser, token, logout, updateUser } = useAuth();
  const [userData, setUserData] = useState<any>(authUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const { height: navBarHeight, isGestureMode } = getNavBarInfo();
  const modalSheetBg = theme === 'dark' ? '#1C1C1E' : '#FFFFFF';

  useEffect(() => {
    if (authUser) setUserData(authUser);
  }, [authUser]);

  const loadProfile = async () => {
    if (!token) { Alert.alert('Error', 'No authentication token found'); return; }
    setIsLoading(true);
    try {
      const response = await userService.getProfile(token);
      if (response.data) { setUserData(response.data); updateUser(response.data); }
    } catch (error: any) {
      Alert.alert('Info', 'Using cached profile data');
    } finally { setIsLoading(false); }
  };

  const handleTakePhoto = async () => {
    setShowImageOptions(false);
    try {
      const image = await ImagePicker.openCamera({
        width: 400, height: 400, cropping: true, cropperCircleOverlay: true,
        compressImageMaxWidth: 1000, compressImageMaxHeight: 1000,
        compressImageQuality: 0.8, includeBase64: false, mediaType: 'photo',
      });
      if (image?.path) await uploadProfilePicture(image.path);
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseFromGallery = async () => {
    setShowImageOptions(false);
    try {
      const image = await ImagePicker.openPicker({
        width: 400, height: 400, cropping: true, cropperCircleOverlay: true,
        compressImageMaxWidth: 1000, compressImageMaxHeight: 1000,
        compressImageQuality: 0.8, includeBase64: false, mediaType: 'photo',
      });
      if (image?.path) await uploadProfilePicture(image.path);
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') Alert.alert('Error', 'Failed to choose photo');
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    if (!token) { Alert.alert('Error', 'No authentication token found'); return; }
    setIsLoading(true);
    try {
      const response = await userService.updateProfilePicture(uri, token);
      if (response.data?.avatar) {
        const updated = { ...userData, avatar: response.data.avatar };
        setUserData(updated); updateUser(updated);
      }
      Alert.alert('Success', 'Profile picture updated successfully');
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally { setIsLoading(false); }
  };

  const handleDeleteProfilePicture = () => {
    setShowImageOptions(false);
    Alert.alert('Delete Profile Picture', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!token) { Alert.alert('Error', 'No authentication token found'); return; }
          setIsLoading(true);
          try {
            await userService.deleteProfilePicture(token);
            const updated = { ...userData, avatar: null };
            setUserData(updated); updateUser(updated);
            Alert.alert('Success', 'Profile picture deleted successfully');
            await loadProfile();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete profile picture');
          } finally { setIsLoading(false); }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try { if (token) await logout(); navigation.replace('Welcome'); }
          catch (error) { console.error('Logout error:', error); }
        },
      },
    ]);
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
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load profile</Text>
        <TouchableOpacity onPress={loadProfile} style={[styles.retryButton, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bmiCategory = userData.bmi
    ? userData.bmi < 18.5 ? 'Underweight'
    : userData.bmi < 25   ? 'Normal'
    : userData.bmi < 30   ? 'Overweight'
    : 'Obese'
    : null;

  const getBMIColor = () => {
    if (!userData.bmi)       return colors.textSecondary;
    if (userData.bmi < 18.5) return '#F59E0B';
    if (userData.bmi < 25)   return '#10B981';
    if (userData.bmi < 30)   return '#F97316';
    return COLORS.error;
  };

  const isLight = theme === 'light';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => setShowImageOptions(true)} activeOpacity={0.8}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '40', shadowColor: colors.shadow }]}>
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[colors.primary, isLight ? '#D4AF37' : '#FFD700']} style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{userData.firstName?.[0]}{userData.lastName?.[0]}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="camera" size={13} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.text }]}>{userData.firstName} {userData.lastName}</Text>
          <Text style={[styles.profileUsername, { color: colors.subtleText }]}>@{userData.username}</Text>

          <View style={styles.quickStatsRow}>
            <View style={[styles.quickChip, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
              <MaterialIcons name="height" size={15} color={colors.primary} />
              <Text style={[styles.quickChipText, { color: colors.text }]}>{userData.height ? `${userData.height} cm` : '-- cm'}</Text>
            </View>
            <View style={[styles.quickChip, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
              <MaterialIcons name="monitor-weight" size={15} color={colors.primary} />
              <Text style={[styles.quickChipText, { color: colors.text }]}>{userData.weight ? `${userData.weight} kg` : '-- kg'}</Text>
            </View>
            {userData.bmi ? (
              <View style={[styles.quickChip, { backgroundColor: getBMIColor() + '12', borderColor: getBMIColor() + '30' }]}>
                <MaterialIcons name="analytics" size={15} color={getBMIColor()} />
                <Text style={[styles.quickChipText, { color: getBMIColor() }]}>BMI {userData.bmi}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Verification Banner ── */}
        {userData && !userData.isEmailVerified && (
          <View style={[styles.verifyBanner, { backgroundColor: COLORS.error + '08', borderColor: COLORS.error + '20' }]}>
            <View style={styles.verifyRow}>
              <View style={[styles.verifyIcon, { backgroundColor: COLORS.error + '15' }]}>
                <Ionicons name="warning" size={18} color={COLORS.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifyTitle, { color: COLORS.error }]}>Email Not Verified</Text>
                <Text style={[styles.verifyMsg, { color: colors.textSecondary }]}>Verify to unlock all features</Text>
              </View>
              <TouchableOpacity style={[styles.verifyAction, { backgroundColor: COLORS.error }]} onPress={() => navigation.navigate('EmailVerification')}>
                <Text style={styles.verifyActionText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Personal Information ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={[styles.editPill, { backgroundColor: colors.iconBg }]}>
              <Feather name="edit-2" size={13} color={colors.primary} />
              <Text style={[styles.editPillText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {[
              { icon: 'mail',     label: 'Email',    value: userData.email },
              { icon: 'phone',    label: 'Phone',    value: userData.phone || 'Not provided' },
              { icon: 'info',     label: 'Bio',      value: userData.bio || 'Not provided' },
              { icon: 'calendar', label: 'Birthday', value: userData.dateOfBirth || 'Not provided' },
              { icon: 'user',     label: 'Gender',   value: userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : 'Not provided' },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: colors.iconBg }]}>
                    <Feather name={row.icon as any} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.subtleText }]}>{row.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{row.value}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Body & Fitness ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Body & Fitness</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditBodyInfo')} style={[styles.editPill, { backgroundColor: colors.iconBg }]}>
              <Feather name="edit-2" size={13} color={colors.primary} />
              <Text style={[styles.editPillText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {[
              { icon: 'height',         label: 'Height', value: userData.height || '--', unit: 'cm' },
              { icon: 'monitor-weight', label: 'Weight', value: userData.weight || '--', unit: 'kg' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={[styles.statIconBox, { backgroundColor: colors.iconBg }]}>
                  <MaterialIcons name={s.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statVal, { color: colors.text }]}>{s.value}</Text>
                <Text style={[styles.statUnit, { color: colors.subtleText }]}>{s.unit}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.wideCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.wideCardLeft}>
              <View style={[styles.statIconBox, { backgroundColor: getBMIColor() + '15' }]}>
                <MaterialIcons name="analytics" size={20} color={getBMIColor()} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.wideCardValue, { color: colors.text }]}>{userData.bmi || '--'}</Text>
                <Text style={[styles.wideCardLabel, { color: colors.textSecondary }]}>BMI Index</Text>
              </View>
            </View>
            {bmiCategory && (
              <View style={[styles.bmiBadge, { backgroundColor: getBMIColor() + '15' }]}>
                <Text style={[styles.bmiBadgeText, { color: getBMIColor() }]}>{bmiCategory}</Text>
              </View>
            )}
          </View>

          <View style={[styles.wideCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 10 }]}>
            <View style={styles.wideCardLeft}>
              <View style={[styles.statIconBox, { backgroundColor: colors.iconBg }]}>
                <MaterialIcons name="fitness-center" size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.wideCardValue, { color: colors.text }]}>{userData.bodyFatPercentage ? `${userData.bodyFatPercentage}%` : '--'}</Text>
                <Text style={[styles.wideCardLabel, { color: colors.textSecondary }]}>Body Fat</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 10 }]}>
            <View style={styles.goalRow}>
              <View style={[styles.goalDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Fitness Goal</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {userData.fitnessGoal ? userData.fitnessGoal.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not set'}
                </Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.goalRow}>
              <View style={[styles.goalDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Activity Level</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {userData.activityLevel ? userData.activityLevel.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Not set'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}><Feather name="lock" size={17} color={colors.primary} /></View>
              <Text style={[styles.menuText, { color: colors.text }]}>Change Password</Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}><Feather name="bell" size={17} color={colors.primary} /></View>
              <Text style={[styles.menuText, { color: colors.text }]}>Notifications</Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.iconBg }]}><Feather name="shield" size={17} color={colors.primary} /></View>
              <Text style={[styles.menuText, { color: colors.text }]}>Privacy</Text>
              <Feather name="chevron-right" size={18} color={colors.subtleText} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: COLORS.error + '0A', borderColor: COLORS.error + '25' }]} onPress={handleLogout}>
            <Feather name="log-out" size={17} color={COLORS.error} />
            <Text style={[styles.logoutText, { color: COLORS.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: colors.subtleText }]}>Version 1.0.0</Text>
      </ScrollView>

      {/* ── Image Options Modal ── */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowImageOptions(false)} />

          <View style={styles.sheetWrapper}>
            <Pressable
              style={[styles.modalSheet, { backgroundColor: modalSheetBg }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.divider ?? '#C0C0C0' }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Picture</Text>

              <TouchableOpacity style={styles.modalOpt} onPress={handleTakePhoto}>
                <View style={[styles.modalOptIcon, { backgroundColor: colors.iconBg }]}>
                  <Feather name="camera" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.modalOptText, { color: colors.text }]}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalOpt} onPress={handleChooseFromGallery}>
                <View style={[styles.modalOptIcon, { backgroundColor: colors.iconBg }]}>
                  <Feather name="image" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.modalOptText, { color: colors.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>

              {userData.avatar && (
                <TouchableOpacity style={styles.modalOpt} onPress={handleDeleteProfilePicture}>
                  <View style={[styles.modalOptIcon, { backgroundColor: COLORS.error + '12' }]}>
                    <Feather name="trash-2" size={20} color={COLORS.error} />
                  </View>
                  <Text style={[styles.modalOptText, { color: COLORS.error }]}>Delete Photo</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.modalDivider, { backgroundColor: colors.divider ?? '#E0E0E0' }]} />
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowImageOptions(false)}>
                <Text style={[styles.modalCancelText, { color: colors.subtleText }]}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>

            {/* Button nav: solid black filler. Gesture nav: not rendered (transparent) */}
            {!isGestureMode && (
              <View style={{ width: '100%', height: navBarHeight, backgroundColor: '#000000' }} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  profileHeader: { alignItems: 'center', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 2.5, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: '#FFF' },
  cameraBtn: { position: 'absolute', bottom: 0, right: -2, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5 },
  profileName: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  profileUsername: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  quickStatsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 5 },
  quickChipText: { fontSize: 12, fontWeight: '600' },

  verifyBanner: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 14 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  verifyTitle: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  verifyMsg: { fontSize: 12 },
  verifyAction: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  verifyActionText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  editPillText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  rowDivider: { height: 1, marginLeft: 62 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 12, fontWeight: '500', marginTop: -2, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },

  wideCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1 },
  wideCardLeft: { flexDirection: 'row', alignItems: 'center' },
  wideCardValue: { fontSize: 18, fontWeight: '800' },
  wideCardLabel: { fontSize: 12, fontWeight: '500' },
  bmiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bmiBadgeText: { fontSize: 12, fontWeight: '700' },

  goalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontWeight: '600' },
  versionText: { fontSize: 12, textAlign: 'center', marginBottom: 20 },

  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalSheet: { width: '100%', paddingTop: 12, paddingBottom: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  modalOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  modalOptIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalOptText: { fontSize: 15, fontWeight: '500' },
  modalDivider: { height: 1, marginTop: 8 },
  modalCancel: { paddingVertical: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '500' },
});