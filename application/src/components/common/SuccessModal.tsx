import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText: string;
  onPrimaryPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  onBackdropPress?: () => void; // Optional: close on backdrop tap
}

export default function SuccessModal({
  visible,
  title,
  message,
  primaryButtonText,
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  iconName = "checkmark-circle",
  onBackdropPress
}: SuccessModalProps) {
  const { colors } = useTheme();

  // Handle Android back button when modal is visible
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        // If modal is visible, close it by calling the appropriate handler
        if (onBackdropPress) {
          onBackdropPress();
        } else if (onSecondaryPress) {
          onSecondaryPress();
        } else {
          onPrimaryPress();
        }
        return true; // Prevent default back button behavior
      }
      return false; // Let default behavior happen
    });

    return () => backHandler.remove();
  }, [visible, onBackdropPress, onSecondaryPress, onPrimaryPress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      hardwareAccelerated
      onRequestClose={() => {
        // This is called when Android back button is pressed
        if (onBackdropPress) {
          onBackdropPress();
        } else if (onSecondaryPress) {
          onSecondaryPress();
        } else {
          onPrimaryPress();
        }
      }}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onBackdropPress}
      >
        <TouchableOpacity 
          style={[styles.card, { 
            backgroundColor: (colors as any).authInputBg || colors.surface || colors.card,
            borderColor: (colors as any).authInputBorder || colors.border,
          }]} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={iconName} size={48} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: (colors as any).subtleText || colors.text }]}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.primaryButton, { overflow: 'hidden' }]} 
              onPress={onPrimaryPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </TouchableOpacity>

            {secondaryButtonText && onSecondaryPress && (
              <TouchableOpacity 
                style={[styles.secondaryButton, { 
                  backgroundColor: 'transparent',
                  borderColor: (colors as any).authInputBorder || colors.border
                }]} 
                onPress={onSecondaryPress}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
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