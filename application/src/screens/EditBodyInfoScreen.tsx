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

type EditBodyInfoNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBodyInfo'>;

export default function EditBodyInfoScreen() {
  const navigation = useNavigation<EditBodyInfoNavigationProp>();
  const { colors } = useTheme();
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<'weight_loss' | 'muscle_gain' | 'maintenance' | ''>('');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active' | ''>('');

  useEffect(() => {
    if (user) {
      // Only set gender if it's 'male' or 'female', ignore 'other'
      const userGender = user.gender;
      if (userGender === 'male' || userGender === 'female') {
        setGender(userGender);
      } else {
        setGender('');
      }
      setDateOfBirth(user.dateOfBirth || '');
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      setBodyFatPercentage(user.bodyFatPercentage?.toString() || '');
      setFitnessGoal(user.fitnessGoal || '');
      setActivityLevel(user.activityLevel || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {};

      if (gender && gender !== user?.gender) updateData.gender = gender;
      if (dateOfBirth && dateOfBirth !== user?.dateOfBirth) updateData.dateOfBirth = dateOfBirth;
      if (height && parseFloat(height) !== user?.height) updateData.height = parseFloat(height);
      if (weight && parseFloat(weight) !== user?.weight) updateData.weight = parseFloat(weight);
      if (bodyFatPercentage && parseFloat(bodyFatPercentage) !== user?.bodyFatPercentage) {
        updateData.bodyFatPercentage = parseFloat(bodyFatPercentage);
      }
      if (fitnessGoal && fitnessGoal !== user?.fitnessGoal) updateData.fitnessGoal = fitnessGoal;
      if (activityLevel && activityLevel !== user?.activityLevel) updateData.activityLevel = activityLevel;

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No changes to save');
        return;
      }

      const response = await userService.updateBodyInformation(updateData, token);
      
      if (response.data && user) {
        updateUser({ ...user, ...response.data });
      }
      
      Alert.alert('Success', 'Body information updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update body information');
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Body Info</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>

        <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: gender === 'male' ? colors.primary : 'transparent' }, gender === 'male' && styles.optionButtonActive]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.optionText, { color: gender === 'male' ? colors.background : colors.text }]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: gender === 'female' ? colors.primary : 'transparent' }, gender === 'female' && styles.optionButtonActive]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.optionText, { color: gender === 'female' ? colors.background : colors.text }]}>Female</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Date of Birth (YYYY-MM-DD)</Text>
        <CustomInput
          placeholder="1990-01-01"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Measurements</Text>

        <Text style={[styles.label, { color: colors.text }]}>Height (cm)</Text>
        <CustomInput
          placeholder="170"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Weight (kg)</Text>
        <CustomInput
          placeholder="70"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Body Fat Percentage</Text>
        <CustomInput
          placeholder="15"
          value={bodyFatPercentage}
          onChangeText={setBodyFatPercentage}
          keyboardType="numeric"
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fitness Profile</Text>

        <Text style={[styles.label, { color: colors.text }]}>Fitness Goal</Text>
        <View style={styles.optionsColumn}>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: fitnessGoal === 'weight_loss' ? colors.primary : 'transparent' }, fitnessGoal === 'weight_loss' && styles.optionButtonActive]}
            onPress={() => setFitnessGoal('weight_loss')}
          >
            <Text style={[styles.optionText, { color: fitnessGoal === 'weight_loss' ? colors.background : colors.text }]}>
              Weight Loss
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: fitnessGoal === 'muscle_gain' ? colors.primary : 'transparent' }, fitnessGoal === 'muscle_gain' && styles.optionButtonActive]}
            onPress={() => setFitnessGoal('muscle_gain')}
          >
            <Text style={[styles.optionText, { color: fitnessGoal === 'muscle_gain' ? colors.background : colors.text }]}>
              Muscle Gain
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: fitnessGoal === 'maintenance' ? colors.primary : 'transparent' }, fitnessGoal === 'maintenance' && styles.optionButtonActive]}
            onPress={() => setFitnessGoal('maintenance')}
          >
            <Text style={[styles.optionText, { color: fitnessGoal === 'maintenance' ? colors.background : colors.text }]}>
              Maintenance
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Activity Level</Text>
        <View style={styles.optionsColumn}>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: activityLevel === 'sedentary' ? colors.primary : 'transparent' }, activityLevel === 'sedentary' && styles.optionButtonActive]}
            onPress={() => setActivityLevel('sedentary')}
          >
            <Text style={[styles.optionText, { color: activityLevel === 'sedentary' ? colors.background : colors.text }]}>
              Sedentary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: activityLevel === 'lightly_active' ? colors.primary : 'transparent' }, activityLevel === 'lightly_active' && styles.optionButtonActive]}
            onPress={() => setActivityLevel('lightly_active')}
          >
            <Text style={[styles.optionText, { color: activityLevel === 'lightly_active' ? colors.background : colors.text }]}>
              Lightly Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: activityLevel === 'moderately_active' ? colors.primary : 'transparent' }, activityLevel === 'moderately_active' && styles.optionButtonActive]}
            onPress={() => setActivityLevel('moderately_active')}
          >
            <Text style={[styles.optionText, { color: activityLevel === 'moderately_active' ? colors.background : colors.text }]}>
              Moderately Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: activityLevel === 'very_active' ? colors.primary : 'transparent' }, activityLevel === 'very_active' && styles.optionButtonActive]}
            onPress={() => setActivityLevel('very_active')}
          >
            <Text style={[styles.optionText, { color: activityLevel === 'very_active' ? colors.background : colors.text }]}>
              Very Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, { borderColor: colors.border, backgroundColor: activityLevel === 'extra_active' ? colors.primary : 'transparent' }, activityLevel === 'extra_active' && styles.optionButtonActive]}
            onPress={() => setActivityLevel('extra_active')}
          >
            <Text style={[styles.optionText, { color: activityLevel === 'extra_active' ? colors.background : colors.text }]}>
              Extra Active
            </Text>
          </TouchableOpacity>
        </View>

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
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    marginTop: SIZES.lg,
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.body,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  optionsColumn: {
    marginBottom: SIZES.md,
  },
  optionButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    marginHorizontal: 4,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    borderColor: 'transparent',
  },
  optionText: {
    textAlign: 'center',
    fontSize: SIZES.body,
  },
  optionTextActive: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
    gap: SIZES.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
