// components/EditStepGoalModal.tsx

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface EditStepGoalModalProps {
    visible: boolean;
    currentGoal: number;
    onSave: (newGoal: number) => Promise<void>;
    onClose: () => void;
    isUpdating?: boolean;
}

export default function EditStepGoalModal({
    visible,
    currentGoal,
    onSave,
    onClose,
    isUpdating = false,
}: EditStepGoalModalProps) {
    const { colors } = useTheme();
    const [tempGoal, setTempGoal] = useState('');
    const [localUpdating, setLocalUpdating] = useState(false);

    useEffect(() => {
        if (visible) {
            setTempGoal(currentGoal.toString());
        }
    }, [visible, currentGoal]);

    const handleSave = async () => {
        const newGoal = parseInt(tempGoal, 10);
        if (isNaN(newGoal) || newGoal < 1000 || newGoal > 50000) {
            return;
        }

        setLocalUpdating(true);
        try {
            await onSave(newGoal);
        } finally {
            setLocalUpdating(false);
        }
    };

    const isInvalid = () => {
        const goal = parseInt(tempGoal, 10);
        return isNaN(goal) || goal < 1000 || goal > 50000;
    };

    const getErrorMessage = () => {
        const goal = parseInt(tempGoal, 10);
        if (isNaN(goal)) return 'Please enter a valid number';
        if (goal < 1000) return 'Goal must be at least 1,000 steps';
        if (goal > 50000) return 'Goal cannot exceed 50,000 steps';
        return '';
    };

    const isLoading = isUpdating || localUpdating;

    const formatNumber = (num: number): string => {
        return num.toLocaleString();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            hardwareAccelerated
        >
            <View style={styles.modalOverlay}>
                <View style={[
                    styles.modalCard,
                    {
                        backgroundColor: (colors as any).authInputBg || colors.surface || colors.card,
                        borderColor: (colors as any).authInputBorder || colors.border,
                    }
                ]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <MaterialCommunityIcons name="shoe-print" size={48} color={colors.primary} />
                    </View>

                    <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Step Goal</Text>
                    <Text style={[styles.modalSubtitle, { color: (colors as any).subtleText || colors.textSecondary }]}>
                        Set your daily step goal (1,000 - 50,000 steps)
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: (colors as any).statBg || colors.background,
                                    borderColor: isInvalid() && tempGoal !== '' ? '#EF4444' : (colors as any).cardBorder || colors.border,
                                    color: colors.text,
                                    borderWidth: isInvalid() && tempGoal !== '' ? 2 : 1,
                                }
                            ]}
                            value={tempGoal}
                            onChangeText={setTempGoal}
                            keyboardType="number-pad"
                            placeholder={formatNumber(currentGoal)}
                            placeholderTextColor={colors.textSecondary}
                            editable={!isLoading}
                        />
                        <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>steps</Text>
                    </View>

                    {isInvalid() && tempGoal !== '' && (
                        <Text style={styles.errorText}>{getErrorMessage()}</Text>
                    )}

                    {tempGoal && !isNaN(parseInt(tempGoal, 10)) && !isInvalid() && (
                        <View style={styles.previewContainer}>
                            <Text style={[styles.previewText, { color: colors.primary }]}>
                                {formatNumber(parseInt(tempGoal, 10))} steps
                            </Text>
                            <Text style={[styles.previewCups, { color: colors.textSecondary }]}>
                                {Math.round((parseInt(tempGoal, 10) / 10000) * 100)}% of target
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                {
                                    overflow: 'hidden',
                                    opacity: isInvalid() || isLoading ? 0.6 : 1,
                                }
                            ]}
                            onPress={handleSave}
                            disabled={isInvalid() || isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Save Goal</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.secondaryButton,
                                {
                                    backgroundColor: 'transparent',
                                    borderColor: (colors as any).authInputBorder || colors.border
                                }
                            ]}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
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
        width: 55,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    previewText: {
        fontSize: 13,
        fontWeight: '500',
    },
    previewCups: {
        fontSize: 12,
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