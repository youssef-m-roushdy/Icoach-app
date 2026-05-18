import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { Feather, Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../types";
import { COLORS, SIZES } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { userService } from "../services";
import { useAuth } from "../context";
import { useSystemNavigation } from "../context/SystemNavigationContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from "../utils/toast";
import { useTranslation } from 'react-i18next';

type EditProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditProfile"
>;

const C = {
  primary: "#C5981B",
  primaryLight: "rgba(197,152,27,0.12)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

// ─── SectionCard ──────────────────────────────────────────────────────────────
interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children }) => {
  const { colors, theme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.authCardBg,
          borderColor: colors.authCardBorder,
          shadowColor: isDarkMode ? "#000" : "#000",
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionIcon, { backgroundColor: C.primary + "15" }]}
        >
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

// ─── ProfileInput ─────────────────────────────────────────────────────────────
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
  onFocus?: () => void;
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
  onFocus: externalOnFocus,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputLabelContainer}>
        <View style={[styles.inputIcon, { backgroundColor: C.primary + "15" }]}>
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
            backgroundColor: colors.authInputBg,
            borderColor: isFocused
              ? colors.authInputBorderFocused
              : colors.authInputBorder,
            borderWidth: 1,
            opacity: editable ? 1 : 0.7,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isFocused ? 0.3 : 0,
            shadowRadius: isFocused ? 8 : 0,
            elevation: isFocused ? 4 : 0,
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
          onFocus={() => {
            setIsFocused(true);
            if (externalOnFocus) externalOnFocus();
          }}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />
      </View>
    </View>
  );
};

// ─── EditProfileScreen ────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === "dark";
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setUsername(user.username || "");
    }
  }, [user]);

  // ─── handleSave ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!token) {
      showErrorToast({
        title: t('authenticationError'),
        message: t('authenticationTokenNotFound'),
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      showErrorToast({
        title: t('missingRequiredFields'),
        message: t('firstNameAndLastNameRequired'),
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData: any = {};

      if (firstName.trim() !== (user?.firstName || "")) {
        updateData.firstName = firstName.trim();
      }
      if (lastName.trim() !== (user?.lastName || "")) {
        updateData.lastName = lastName.trim();
      }
      if (phone.trim() !== (user?.phone || "")) {
        updateData.phone = phone.trim() || null;
      }
      if (bio.trim() !== (user?.bio || "")) {
        updateData.bio = bio.trim() || null;
      }
      if (username.trim() !== (user?.username || "")) {
        updateData.username = username.trim() || null;
      }

      if (Object.keys(updateData).length === 0) {
        showInfoToast({
          title: t('noChanges'),
          message: t('noChangesToSave'),
        });
        return;
      }

      const response = await userService.updateProfile(updateData, token);

      if (response.data) {
        updateUser(response.data);
      }

      showSuccessToast({
        title: t('profileUpdated'),
        message: t('profileUpdatedSuccessfully'),
      });

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error: unknown) {
      showErrorToast({
        title: t('updateFailed'),
        message: getErrorMessage(error) || t('failedToUpdateProfile'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Decorative Circles */}
        <View
          style={[
            styles.decorativeCircle1,
            { backgroundColor: colors.authCircle1 },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle2,
            { backgroundColor: colors.authCircle2 },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle3,
            { backgroundColor: colors.authCircle3 },
          ]}
        />
      </LinearGradient>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.divider,
            paddingTop: Math.max(insets.top + 16, 16),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('editProfile')}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {t('updateYourPersonalInformation')}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets={true}
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 24, 40) + keyboardHeight,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Information */}
          <SectionCard
            title={t('personalInformation')}
            icon={<Feather name="user" size={20} color={C.primary} />}
          >
            <ProfileInput
              label={t('firstName')}
              value={firstName}
              onChangeText={setFirstName}
              icon={<Feather name="user" size={18} color={C.primary} />}
              placeholder={t('john')}
            />
            <View style={styles.inputSpacer} />
            <ProfileInput
              label={t('lastName')}
              value={lastName}
              onChangeText={setLastName}
              icon={<Feather name="user" size={18} color={C.primary} />}
              placeholder={t('doe')}
            />
          </SectionCard>

          {/* Account Details (read-only) */}
          <SectionCard
            title={t('accountDetails')}
            icon={<Feather name="settings" size={20} color={C.primary} />}
          >
            <ProfileInput
              label={t('username')}
              value={username}
              onChangeText={setUsername}
              icon={<Feather name="at-sign" size={18} color={C.primary} />}
              note={t('usernameCannotBeChanged')}
            />
            <View style={styles.inputSpacer} />
            <ProfileInput
              label={t('email')}
              value={user?.email || ""}
              onChangeText={() => {}}
              icon={<Feather name="mail" size={18} color={C.primary} />}
              editable={false}
              note={t('emailCannotBeChanged')}
            />
          </SectionCard>

          {/* Contact & Bio */}
          <SectionCard
            title={t('contactAndBio')}
            icon={<Feather name="phone" size={20} color={C.primary} />}
          >
            <ProfileInput
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              icon={<Feather name="phone" size={18} color={C.primary} />}
              placeholder={t('phonePlaceholder')}
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollTo({ y: 450, animated: true }),
                  150,
                )
              }
            />
            <View style={styles.inputSpacer} />
            <ProfileInput
              label={t('bio')}
              value={bio}
              onChangeText={setBio}
              icon={<Feather name="info" size={18} color={C.primary} />}
              placeholder={t('tellUsAboutYourself')}
              multiline
              numberOfLines={4}
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollTo({ y: 550, animated: true }),
                  150,
                )
              }
            />
          </SectionCard>

          {/* Info note */}
          <View style={[styles.infoNote, { backgroundColor: colors.iconBg }]}>
            <Feather name="info" size={16} color={colors.textSecondary} />
            <Text
              style={[styles.infoNoteText, { color: colors.textSecondary }]}
            >
              {t('editProfileInfoNote')}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: colors.authCardBg,
                      borderColor: colors.authCardBorder,
                    },
                  ]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.cancelButtonText, { color: colors.text }]}
                  >
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.saveButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={[styles.saveButtonText, { color: "#FFFFFF" }]}>
                      {t('saveChanges')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  content: { flex: 1 },
  scrollContent: { padding: 20 },

  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  sectionContent: { marginLeft: 48 },

  inputContainer: { marginBottom: 8 },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  inputLabel: { fontSize: 14, fontWeight: "500", marginRight: 8 },
  inputNote: { fontSize: 11, fontWeight: "400", fontStyle: "italic" },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: { fontSize: 16, padding: 12 },
  multilineInput: { minHeight: 100, textAlignVertical: "top" },
  inputSpacer: { height: 16 },

  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: { fontSize: 16, fontWeight: "700" },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle3: {
    position: "absolute",
    top: "30%",
    left: "-20%",
    width: 150,
    height: 150,
    borderRadius: 75,
  },
});