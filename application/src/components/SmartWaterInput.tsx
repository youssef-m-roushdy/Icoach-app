// components/SmartWaterInput.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface SmartWaterInputProps {
  onAddWater: (amount: number, unit: 'L' | 'ML') => void;
  isSyncing?: boolean;
  buttonStyle?: 'gradient' | 'outline';
  buttonText?: string;
}

interface Preset {
  label: string;
  amount: number;
  unit: 'ML' | 'L';
  emoji?: string;
}

export default function SmartWaterInput({ 
  onAddWater, 
  isSyncing = false,
  buttonStyle = 'gradient',
  buttonText = 'Add Water'
}: SmartWaterInputProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<'ML' | 'L'>('ML');
  const [customAmount, setCustomAmount] = useState('');

  // Preset options (only used inside modal)
  const presets: Preset[] = [
    { label: 'Glass', amount: 250, unit: 'ML', emoji: '🥤' },
    { label: 'Can', amount: 330, unit: 'ML', emoji: '🥫' },
    { label: 'Bottle', amount: 700, unit: 'ML', emoji: '🍾' },
    { label: 'Small Glass', amount: 200, unit: 'ML', emoji: '🥛' },
    { label: 'Large Bottle', amount: 1000, unit: 'ML', emoji: '🧴' },
  ];

  const handleCustomAdd = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (selectedUnit === 'L' && amount > 5) {
      Alert.alert('Large Amount', 'Are you sure you want to add more than 5 liters?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Anyway', onPress: () => performAdd(amount) }
      ]);
      return;
    }
    
    if (selectedUnit === 'ML' && amount > 5000) {
      Alert.alert('Large Amount', 'Are you sure you want to add more than 5000ml?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Anyway', onPress: () => performAdd(amount) }
      ]);
      return;
    }
    
    performAdd(amount);
  };

  const performAdd = (amount: number) => {
    onAddWater(amount, selectedUnit);
    setCustomAmount('');
    setSelectedUnit('ML');
    setModalVisible(false);
  };

  const openCustomModal = () => {
    setCustomAmount('');
    setSelectedUnit('ML');
    setModalVisible(true);
  };

  return (
    <>
      {/* Only the Add Water Button - No quick chips outside */}
      {buttonStyle === 'gradient' ? (
        <TouchableOpacity 
          style={{ 
            borderRadius: 20, 
            overflow: 'hidden', 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.2, 
            shadowRadius: 8, 
            elevation: 5,
            marginTop: 8,
            opacity: isSyncing ? 0.6 : 1,
          }} 
          activeOpacity={0.8}
          onPress={openCustomModal}
          disabled={isSyncing}
        >
          <LinearGradient
            colors={[colors.primary, (colors as any).secondary || colors.primary]}
            style={styles.addWaterBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addWaterBtnText}>
              {isSyncing ? 'Adding...' : buttonText}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[
            styles.outlineButton, 
            { 
              borderColor: colors.primary,
              opacity: isSyncing ? 0.6 : 1,
            }
          ]}
          onPress={openCustomModal}
          disabled={isSyncing}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.outlineButtonText, { color: colors.primary }]}>
            {isSyncing ? 'Adding...' : buttonText}
          </Text>
        </TouchableOpacity>
      )}

      {/* Custom Amount Modal - All presets are inside the modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        hardwareAccelerated
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { 
            backgroundColor: (colors as any).authInputBg || colors.surface || colors.card,
            borderColor: (colors as any).authInputBorder || colors.border,
          }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons name="cup-water" size={48} color={colors.primary} />
            </View>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Water</Text>
            <Text style={[styles.modalSubtitle, { color: (colors as any).subtleText || colors.textSecondary }]}>
              How much water did you drink?
            </Text>

            {/* Unit Toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  selectedUnit === 'ML' && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                ]}
                onPress={() => setSelectedUnit('ML')}
              >
                <Text style={[
                  styles.unitOptionText,
                  { color: selectedUnit === 'ML' ? colors.primary : colors.textSecondary }
                ]}>ML</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  selectedUnit === 'L' && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                ]}
                onPress={() => setSelectedUnit('L')}
              >
                <Text style={[
                  styles.unitOptionText,
                  { color: selectedUnit === 'L' ? colors.primary : colors.textSecondary }
                ]}>Liters</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: (colors as any).statBg || colors.background, 
                  borderColor: (colors as any).cardBorder || colors.border,
                  color: colors.text 
                }]}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                placeholder={`Enter amount in ${selectedUnit}`}
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
                {selectedUnit}
              </Text>
            </View>

            {/* Preset Suggestions - Only inside modal */}
            <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>
              Quick suggestions:
            </Text>
            <View style={styles.presetGrid}>
              {presets.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.presetChip, { 
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}20`,
                  }]}
                  onPress={() => {
                    setCustomAmount(preset.amount.toString());
                    setSelectedUnit(preset.unit);
                  }}
                >
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  <Text style={[styles.presetText, { color: colors.primary }]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.presetAmount, { color: colors.textSecondary }]}>
                    {preset.amount}{preset.unit === 'ML' ? 'ml' : 'L'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.primaryButton, { overflow: 'hidden' }]} 
                onPress={handleCustomAdd}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, (colors as any).secondary || colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.primaryButtonText}>Add Water</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryButton, { 
                  backgroundColor: 'transparent',
                  borderColor: (colors as any).authInputBorder || colors.border
                }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  addWaterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 8,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles matching SuccessModal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  unitOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  modalInput: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
    width: 50,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  presetEmoji: {
    fontSize: 14,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  presetAmount: {
    fontSize: 10,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});