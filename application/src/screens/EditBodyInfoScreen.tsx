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
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { RootStackParamList } from "../types";
import { COLORS, SIZES } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { userService } from "../services";
import { useAuth } from "../context";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from "../utils/toast";
import { useTranslation } from 'react-i18next';

type EditBodyInfoNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditBodyInfo"
>;

const C = {
  primary: "#C5981B",
  primaryLight: "rgba(197,152,27,0.12)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  male: "#3B82F6",
  female: "#EC4899",
};

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

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: React.ReactNode;
}

const OptionChip: React.FC<OptionChipProps> = ({
  label,
  selected,
  onPress,
  color = C.primary,
  icon,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.optionChip,
        {
          backgroundColor: selected ? color : colors.authInputBg,
          borderColor: selected ? color : colors.authInputBorder,
        },
      ]}
    >
      {icon && <View style={styles.optionIcon}>{icon}</View>}
      <Text
        style={[
          styles.optionChipText,
          { color: selected ? "#FFF" : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface MeasurementInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  icon: React.ReactNode;
  placeholder?: string;
  onFocus?: () => void;
}

const MeasurementInput: React.FC<MeasurementInputProps> = ({
  label,
  value,
  onChangeText,
  unit,
  icon,
  placeholder,
  onFocus: externalOnFocus,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.measurementInputContainer}>
      <View style={styles.measurementLabelContainer}>
        <View
          style={[
            styles.measurementIcon,
            { backgroundColor: C.primary + "15" },
          ]}
        >
          {icon}
        </View>
        <Text style={[styles.measurementLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>

      <View
        style={[
          styles.measurementInputWrapper,
          {
            backgroundColor: colors.authInputBg,
            borderColor: isFocused
              ? colors.authInputBorderFocused
              : colors.authInputBorder,
            borderWidth: 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isFocused ? 0.3 : 0,
            shadowRadius: isFocused ? 8 : 0,
            elevation: isFocused ? 4 : 0,
          },
        ]}
      >
        <TextInput
          style={[styles.measurementInput, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => {
            setIsFocused(true);
            if (externalOnFocus) externalOnFocus();
          }}
          onBlur={() => setIsFocused(false)}
        />
        <View style={[styles.unitBadge, { backgroundColor: colors.iconBg }]}>
          <Text
            style={[styles.measurementUnit, { color: colors.textSecondary }]}
          >
            {unit}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface DateInputProps {
  value: string;
  onChange: (date: Date) => void;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (value) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(1990, 0, 1);
  });

  const handleDateChange = (event: any, date?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      onChange(date);
    }
  };

  return (
    <View style={styles.dateInputContainer}>
      <View
        style={[
          styles.dateIconContainer,
          { backgroundColor: C.primary + "15" },
        ]}
      >
        <Feather name="calendar" size={18} color={C.primary} />
      </View>

      <TouchableOpacity
        style={[
          styles.dateInputWrapper,
          {
            backgroundColor: colors.authInputBg,
            borderColor: colors.authInputBorder,
            borderWidth: 1,
          },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dateInputText,
            { color: value ? colors.text : colors.textSecondary },
          ]}
        >
          {value || t('selectDate')}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </View>
  );
};

export default function EditBodyInfoScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<EditBodyInfoNavigationProp>();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === "dark";
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyFatPercentage, setBodyFatPercentage] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState<
    "weight_loss" | "muscle_gain" | "maintenance" | ""
  >("");
  const [activityLevel, setActivityLevel] = useState<
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extra_active"
    | ""
  >("");

  useEffect(() => {
    if (user) {
      const userGender = user.gender;
      if (userGender === "male" || userGender === "female") {
        setGender(userGender);
      } else {
        setGender("");
      }

      setDateOfBirth(user.dateOfBirth || "");
      setHeight(user.height?.toString() || "");
      setWeight(user.weight?.toString() || "");
      setBodyFatPercentage(user.bodyFatPercentage?.toString() || "");
      setFitnessGoal(user.fitnessGoal || "");
      setActivityLevel(user.activityLevel || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!token) {
      showErrorToast({
        title: t('authenticationError'),
        message: t('authenticationTokenNotFound'),
      });
      return;
    }

    if (height && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
      showErrorToast({
        title: t('invalidHeight'),
        message: t('enterValidHeight'),
      });
      return;
    }

    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      showErrorToast({
        title: t('invalidWeight'),
        message: t('enterValidWeight'),
      });
      return;
    }

    if (
      bodyFatPercentage &&
      (isNaN(parseFloat(bodyFatPercentage)) ||
        parseFloat(bodyFatPercentage) < 0 ||
        parseFloat(bodyFatPercentage) > 100)
    ) {
      showErrorToast({
        title: t('invalidBodyFat'),
        message: t('bodyFatPercentageRange'),
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData: any = {};

      if (gender && gender !== user?.gender) updateData.gender = gender;
      if (dateOfBirth && dateOfBirth !== user?.dateOfBirth) {
        updateData.dateOfBirth = dateOfBirth;
      }
      if (height && parseFloat(height) !== user?.height) {
        updateData.height = parseFloat(height);
      }
      if (weight && parseFloat(weight) !== user?.weight) {
        updateData.weight = parseFloat(weight);
      }
      if (
        bodyFatPercentage &&
        parseFloat(bodyFatPercentage) !== user?.bodyFatPercentage
      ) {
        updateData.bodyFatPercentage = parseFloat(bodyFatPercentage);
      }
      if (fitnessGoal && fitnessGoal !== user?.fitnessGoal) {
        updateData.fitnessGoal = fitnessGoal;
      }
      if (activityLevel && activityLevel !== user?.activityLevel) {
        updateData.activityLevel = activityLevel;
      }

      if (Object.keys(updateData).length === 0) {
        showInfoToast({
          title: t('noChanges'),
          message: t('noChangesToSave'),
        });
        return;
      }

      const response = await userService.updateBodyInformation(
        updateData,
        token,
      );

      if (response.data && user) {
        updateUser({ ...user, ...response.data });
      }

      showSuccessToast({
        title: t('bodyInfoUpdated'),
        message: t('bodyInfoUpdatedSuccessfully'),
      });

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error: unknown) {
      showErrorToast({
        title: t('updateFailed'),
        message: getErrorMessage(error) || t('failedToUpdateBodyInfo'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBMICategory = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;

    const bmi = w / Math.pow(h / 100, 2);
    if (bmi < 18.5) return { label: t('underweight'), color: C.warning };
    if (bmi < 25) return { label: t('normal'), color: C.success };
    if (bmi < 30) return { label: t('overweight'), color: C.warning };
    return { label: t('obese'), color: C.error };
  };

  const bmiCategory = getBMICategory();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={(colors as any).authBgGradient || colors.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Decorative Circles */}
        <View
          style={[
            styles.decorativeCircle1,
            {
              backgroundColor:
                (colors as any).authCircle1 || "rgba(255,255,255,0.05)",
            },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle2,
            {
              backgroundColor:
                (colors as any).authCircle2 || "rgba(255,255,255,0.05)",
            },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle3,
            {
              backgroundColor:
                (colors as any).authCircle3 || "rgba(255,255,255,0.05)",
            },
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
            {t('editBodyInfo')}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {t('updateYourFitnessProfile')}
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
              paddingBottom: Math.max(insets.bottom + 24, 60),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Details Section */}
          <SectionCard
            title={t('personalDetails')}
            icon={<Feather name="user" size={20} color={C.primary} />}
          >
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              {t('gender')}
            </Text>

            <View style={styles.genderRow}>
              <OptionChip
                label={t('male')}
                selected={gender === "male"}
                onPress={() => setGender("male")}
                color={C.male}
                icon={
                  <Ionicons
                    name="male"
                    size={18}
                    color={gender === "male" ? "#FFF" : C.male}
                  />
                }
              />
              <OptionChip
                label={t('female')}
                selected={gender === "female"}
                onPress={() => setGender("female")}
                color={C.female}
                icon={
                  <Ionicons
                    name="female"
                    size={18}
                    color={gender === "female" ? "#FFF" : C.female}
                  />
                }
              />
            </View>

            <View style={styles.inputSpacer} />

            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              {t('dateOfBirth')}
            </Text>

            <DateInput
              value={dateOfBirth}
              onChange={(date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                setDateOfBirth(`${year}-${month}-${day}`);
              }}
            />
          </SectionCard>

          {/* Body Measurements Section */}
          <SectionCard
            title={t('bodyMeasurements')}
            icon={
              <MaterialIcons name="straighten" size={20} color={C.primary} />
            }
          >
            <MeasurementInput
              label={t('height')}
              value={height}
              onChangeText={setHeight}
              unit="cm"
              icon={<MaterialIcons name="height" size={18} color={C.primary} />}
              placeholder="170"
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollTo({ y: 150, animated: true }),
                  150,
                )
              }
            />

            <View style={styles.inputSpacer} />

            <MeasurementInput
              label={t('weight')}
              value={weight}
              onChangeText={setWeight}
              unit="kg"
              icon={
                <MaterialIcons
                  name="monitor-weight"
                  size={18}
                  color={C.primary}
                />
              }
              placeholder="70"
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollTo({ y: 250, animated: true }),
                  150,
                )
              }
            />

            {bmiCategory && (
              <View
                style={[
                  styles.bmiPreview,
                  {
                    backgroundColor: bmiCategory.color + "15",
                    borderColor: bmiCategory.color + "30",
                  },
                ]}
              >
                <View
                  style={[
                    styles.bmiDot,
                    { backgroundColor: bmiCategory.color },
                  ]}
                />
                <Text style={[styles.bmiPreviewText, { color: colors.text }]}>
                  {t('yourBmiIndicatesYouAre')}{" "}
                  <Text style={{ color: bmiCategory.color, fontWeight: "700" }}>
                    {bmiCategory.label}
                  </Text>
                </Text>
              </View>
            )}

            <View style={styles.inputSpacer} />

            <MeasurementInput
              label={t('bodyFat')}
              value={bodyFatPercentage}
              onChangeText={setBodyFatPercentage}
              unit="%"
              icon={
                <MaterialIcons
                  name="fitness-center"
                  size={18}
                  color={C.primary}
                />
              }
              placeholder="15"
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollTo({ y: 350, animated: true }),
                  150,
                )
              }
            />
          </SectionCard>

          {/* Fitness Profile Section */}
          <SectionCard
            title={t('fitnessProfile')}
            icon={<Ionicons name="fitness" size={20} color={C.primary} />}
          >
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              {t('fitnessGoal')}
            </Text>

            <View style={styles.goalsContainer}>
              <OptionChip
                label={t('weightLoss')}
                selected={fitnessGoal === "weight_loss"}
                onPress={() => setFitnessGoal("weight_loss")}
                icon={
                  <Feather
                    name="trending-down"
                    size={16}
                    color={fitnessGoal === "weight_loss" ? "#FFF" : C.primary}
                  />
                }
              />
              <OptionChip
                label={t('muscleGain')}
                selected={fitnessGoal === "muscle_gain"}
                onPress={() => setFitnessGoal("muscle_gain")}
                icon={
                  <Feather
                    name="activity"
                    size={16}
                    color={fitnessGoal === "muscle_gain" ? "#FFF" : C.primary}
                  />
                }
              />
              <OptionChip
                label={t('maintenance')}
                selected={fitnessGoal === "maintenance"}
                onPress={() => setFitnessGoal("maintenance")}
                icon={
                  <Feather
                    name="heart"
                    size={16}
                    color={fitnessGoal === "maintenance" ? "#FFF" : C.primary}
                  />
                }
              />
            </View>

            <View style={styles.inputSpacer} />

            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              {t('activityLevel')}
            </Text>

            <View style={styles.activityContainer}>
              <OptionChip
                label={t('sedentary')}
                selected={activityLevel === "sedentary"}
                onPress={() => setActivityLevel("sedentary")}
              />
              <OptionChip
                label={t('light')}
                selected={activityLevel === "lightly_active"}
                onPress={() => setActivityLevel("lightly_active")}
              />
              <OptionChip
                label={t('moderate')}
                selected={activityLevel === "moderately_active"}
                onPress={() => setActivityLevel("moderately_active")}
              />
              <OptionChip
                label={t('active')}
                selected={activityLevel === "very_active"}
                onPress={() => setActivityLevel("very_active")}
              />
              <OptionChip
                label={t('extra')}
                selected={activityLevel === "extra_active"}
                onPress={() => setActivityLevel("extra_active")}
              />
            </View>

            {activityLevel && (
              <View
                style={[
                  styles.activityDescription,
                  { backgroundColor: colors.iconBg },
                ]}
              >
                <Text
                  style={[
                    styles.activityDescriptionText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {activityLevel === "sedentary" && t('sedentaryDescription')}
                  {activityLevel === "lightly_active" && t('lightlyActiveDescription')}
                  {activityLevel === "moderately_active" && t('moderatelyActiveDescription')}
                  {activityLevel === "very_active" && t('veryActiveDescription')}
                  {activityLevel === "extra_active" && t('extraActiveDescription')}
                </Text>
              </View>
            )}
          </SectionCard>

          {/* Action Buttons */}
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
                    colors={[
                      colors.primary,
                      (colors as any).secondary || colors.primary,
                    ]}
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
  container: {
    flex: 1,
  },
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
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionContent: {
    marginLeft: 48,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    gap: 6,
  },
  optionIcon: {
    marginRight: 2,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputSpacer: {
    height: 16,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dateInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  dateInputText: {
    fontSize: 16,
  },
  measurementInputContainer: {
    marginBottom: 8,
  },
  measurementLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  measurementIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  measurementLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  measurementInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  measurementInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  measurementUnit: {
    fontSize: 13,
    fontWeight: "600",
  },
  bmiPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  bmiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiPreviewText: {
    fontSize: 13,
    flex: 1,
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityDescription: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  activityDescriptionText: {
    fontSize: 13,
    textAlign: "center",
  },
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
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
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
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
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