import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useStepCounter } from '../hooks/useStepCounter';
import { useWaterIntake } from '../hooks/useWaterIntake';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SmartWaterInput from '../components/SmartWaterInput';
import { conversationService, type ConversationListItem } from '../services/conversationService';
import { socketService } from '../services/socketService';
import ar from '../../i18n/locales/ar.json';

const BLUE = '#007BFF';
// PRIMARY color replaced dynamically with colors.primary
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';

type NavigationTarget = 'notifications' | 'messages' | 'chatbot' | 'FoodSearch';

export default function HomeScreen() {
  const { user, token } = useAuth() as any;
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const stepData = useStepCounter();
  const waterData = useWaterIntake();
  
  // Goal editing states
  const [showStepGoalModal, setShowStepGoalModal] = useState(false);
  const [showWaterGoalModal, setShowWaterGoalModal] = useState(false);
  const [tempStepGoal, setTempStepGoal] = useState('');
  const [tempWaterGoal, setTempWaterGoal] = useState('');
  
  const { systemBottomInset } = useSystemNavigation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  const handleNavigateTo = (target: NavigationTarget) => {
    switch (target) {
      case 'notifications':
        navigation.navigate('Notifications' as never);
        break;
      case 'messages':
        navigation.navigate('Messages' as never);
        break;
      case 'chatbot':
        navigation.navigate('Chatbot' as never);
        break;
      case 'FoodSearch':
        navigation.navigate('FoodItems' as never);
        break;
    }
  };

  const handleNavigateToWaterHistory = () => {
    navigation.navigate('WaterIntakeDetails' as never);
  };

  const handleNavigateToStepHistory = () => {
  navigation.navigate('DailyActivityDetails' as never);
};

  const computeUnreadCount = useCallback(
    (items: ConversationListItem[]) => {
      if (!user?.id) return 0;

      const totalFromServer = items.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);
      if (totalFromServer > 0) {
        return totalFromServer;
      }

      return items.reduce((count, item) => {
        const lastMessage = item.lastMessage;
        if (!lastMessage) return count;
        if (lastMessage.senderId === user.id) return count;

        if (!item.lastReadAt) {
          return count + 1;
        }

        const lastReadTime = new Date(item.lastReadAt).getTime();
        const lastMessageTime = new Date(lastMessage.createdAt).getTime();
        if (Number.isNaN(lastReadTime) || Number.isNaN(lastMessageTime)) return count;

        return lastMessageTime > lastReadTime ? count + 1 : count;
      }, 0);
    },
    [user?.id]
  );

  const loadUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadMessages(0);
      return;
    }

    const response = await conversationService.listConversations(token, 1, 50);
    const items = response.data?.conversations ?? [];
    setUnreadMessages(computeUnreadCount(items));
  }, [token, computeUnreadCount]);

  useEffect(() => {
    loadUnreadCount().catch(() => null);
  }, [loadUnreadCount]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUnreadCount().catch(() => null);
    });

    return unsubscribe;
  }, [navigation, loadUnreadCount]);

  useEffect(() => {
    const handleMessageNew = (payload: { conversationId: number; message?: { senderId: number } }) => {
      if (!payload?.message) return;
      if (payload.message.senderId === user?.id) return;
      loadUnreadCount().catch(() => null);
    };

    socketService.addMessageListener(handleMessageNew);

    return () => {
      socketService.removeMessageListener(handleMessageNew);
    };
  }, [loadUnreadCount, user?.id]);

  // Step Goal Handlers
  const handleEditStepGoal = () => {
    setTempStepGoal(stepData.goal.toString());
    setShowStepGoalModal(true);
  };

  const handleSaveStepGoal = async () => {
    const newGoal = parseInt(tempStepGoal, 10);
    if (isNaN(newGoal) || newGoal < 1000 || newGoal > 50000) {
      Alert.alert(ar.invalidGoal, ar.stepGoalRangeMessage);
      return;
    }
    
    await stepData.updateGoal(newGoal);
    setShowStepGoalModal(false);
    Alert.alert(ar.success, ar.stepGoalUpdatedMessage.replace('{goal}', newGoal.toLocaleString()));
  };

  // Water Goal Handlers
  const handleEditWaterGoal = () => {
    setTempWaterGoal(waterData.goalInLiters.toString());
    setShowWaterGoalModal(true);
  };

  const handleSaveWaterGoal = async () => {
    const newGoal = parseFloat(tempWaterGoal);
    if (isNaN(newGoal) || newGoal < 0.5 || newGoal > 10) {
      Alert.alert(ar.invalidGoal, ar.waterGoalRangeMessage);
      return;
    }
    
    await waterData.updateGoal(newGoal);
    setShowWaterGoalModal(false);
    Alert.alert(
      ar.success,
      ar.waterGoalUpdatedMessage
        .replace('{goal}', newGoal.toString())
        .replace('{ml}', Math.round(newGoal * 1000).toString())
    );
  };

  const handleAddWater = (amount: number, unit: 'L' | 'ML') => {
    waterData.addWater(amount, unit);
  };

  const handleQuickAdd = (presetIndex: number) => {
    const preset = waterData.quickAddPresets[presetIndex];
    if (preset) {
      waterData.addWater(preset.amount, preset.unit);
    }
  };

  const showWaterPresetOptions = () => {
    Alert.alert(
      ar.addWater,
      ar.chooseAmountToAdd,
      [
        ...waterData.quickAddPresets.map((preset) => ({
          text: preset.label,
          onPress: () => waterData.addWater(preset.amount, preset.unit),
        })),
        { text: ar.cancel, style: 'cancel' },
      ]
    );
  };

  const INITIAL_MEALS = [ar.breakfast, ar.lunch, ar.workoutMeal, ar.dinner];
  const EXTRA_MEALS = [ar.morningSnack, ar.eveningSnack, ar.postWorkoutShake];
  const displayedMeals = showAll ? [...INITIAL_MEALS, ...EXTRA_MEALS] : INITIAL_MEALS;

  return (
    <View style={[styles.main, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Animated Gradient Background matches SignIn */}
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
        overScrollMode="never"
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: dynamicPaddingBottom - 20 }]}
      >

        {/* Professional Header with Quick Actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.quickActions}</Text>
          </View>
          
          <View style={styles.quickActionsGrid}>
            {/* Alerts - Notification Center */}
            <TouchableOpacity
              style={[
                styles.quickActionItem,
                { 
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: '#EF444420',
                  shadowColor: '#EF4444',
                }
              ]}
              onPress={() => handleNavigateTo('notifications')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIconGradient}
              >
                <Ionicons name="notifications" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.quickActionContent}>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{ar.alerts}</Text>
                <Text style={[styles.quickActionDesc, { color: colors.textSecondary }]}>
                  {ar.viewNotifications}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Messages - Communication Hub */}
            <TouchableOpacity
              style={[
                styles.quickActionItem,
                { 
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: '#3B82F620',
                  shadowColor: '#3B82F6',
                }
              ]}
              onPress={() => handleNavigateTo('messages')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIconGradient}
              >
                <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.quickActionContent}>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{ar.messages}</Text>
                <Text style={[styles.quickActionDesc, { color: colors.textSecondary }]}>
                  {unreadMessages > 0 
                    ? ar.unreadMessagesCount.replace('{count}', unreadMessages.toString())
                    : ar.chatWithTrainers
                  }
                </Text>
              </View>
              {/* ✅ Dynamic badge based on unread count */}
              {unreadMessages > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
              {unreadMessages === 0 && (
                <View style={styles.chevronContainer}>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>

            {/* AI Coach - Smart Assistant */}
            <TouchableOpacity
              style={[
                styles.quickActionItem,
                { 
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: '#8B5CF620',
                  shadowColor: '#8B5CF6',
                }
              ]}
              onPress={() => handleNavigateTo('chatbot')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIconGradient}
              >
                <MaterialCommunityIcons name="robot" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.quickActionContent}>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{ar.aiCoach}</Text>
                <Text style={[styles.quickActionDesc, { color: colors.textSecondary }]}>
                  {ar.getInstantGuidance}
                </Text>
              </View>
              <View style={styles.aiGlowIndicator}>
                <View style={styles.aiPulse} />
              </View>
            </TouchableOpacity>

            {/* Food Lens - Smart Scanner */}
            <TouchableOpacity
              style={[
                styles.quickActionItem,
                { 
                  backgroundColor: colors.authInputBg || colors.surface,
                  borderColor: '#10B98120',
                  shadowColor: '#10B981',
                }
              ]}
              onPress={() => handleNavigateTo('FoodSearch')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionIconGradient}
              >
                <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.quickActionContent}>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>{ar.foodMacros}</Text>
                <Text style={[styles.quickActionDesc, { color: colors.textSecondary }]}>
                  {ar.findCaloriesAndMacros}
                </Text>
              </View>

            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Steps Section - Professional Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.activity}</Text>
            <TouchableOpacity onPress={handleNavigateToStepHistory}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>{ar.details} →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder, shadowColor: colors.shadow }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="shoe-print" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{ar.dailySteps}</Text>
                {stepData.isSyncing && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <TouchableOpacity 
                style={[styles.stepGoalChip, { backgroundColor: `${colors.primary}10` }]}
                onPress={handleEditStepGoal}
              >
                <Text style={[styles.stepGoalText, { color: colors.primary }]}>
                  {ar.goal}: {stepData.goal.toLocaleString()} ✎
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stepsMainRow}>
              <View style={styles.stepsMetric}>
                <Text style={[styles.stepsValue, { color: stepData.progress >= 1 ? SUCCESS : colors.text }]}>
                  {stepData.steps.toLocaleString()}
                </Text>
                <Text style={[styles.stepsUnit, { color: colors.textSecondary }]}>{ar.steps}</Text>
              </View>
              <View style={styles.progressWrapper}>
                <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
                  <View style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: stepData.progress >= 1 ? SUCCESS : colors.primary, 
                      width: `${Math.min(stepData.progress * 100, 100)}%` 
                    }
                  ]} />
                </View>
                <View style={styles.progressStats}>
                  <Text style={[styles.progressPercent, { color: stepData.progress >= 1 ? SUCCESS : colors.primary }]}>
                    {Math.round(stepData.progress * 100)}%
                  </Text>
                  <Text style={[styles.progressRemaining, { color: colors.textSecondary }]}>
                    {stepData.remaining.toLocaleString()} {ar.remaining}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.steps.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{ar.done}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="flag" size={18} color={WARNING} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.goal.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{ar.goal}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stepData.remaining.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{ar.remaining}</Text>
              </View>
            </View>

            {stepData.error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{stepData.error}</Text>
              </View>
            )}

            {stepData.progress >= 1 && (
              <View style={[styles.goalAchievedBanner, { backgroundColor: `${SUCCESS}15`, borderColor: `${SUCCESS}30` }]}>
                <Ionicons name="trophy" size={16} color={SUCCESS} />
                <Text style={[styles.goalAchievedText, { color: SUCCESS }]}>
                  {'🎉 ' + ar.dailyStepGoalAchieved}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Food Section - Professional */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.nutritionPlan}</Text>
            <TouchableOpacity onPress={() => setShowAll(!showAll)}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>
                {showAll ? `${ar.showLess} →` : `${ar.viewAll} →`}
              </Text>
            </TouchableOpacity>
          </View>

          {displayedMeals.map((meal, index) => (
            <MealCard key={index} title={meal} />
          ))}
        </View>

        {/* Daily Water Intake - Professional with Smart Input */}
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.hydration}</Text>
    <TouchableOpacity onPress={handleNavigateToWaterHistory}>
      <Text style={[styles.sectionLink, { color: colors.primary }]}>{ar.details} →</Text>
    </TouchableOpacity>
  </View>

  <View style={[styles.waterCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder, shadowColor: colors.shadow }]}>
    <View style={styles.waterHeader}>
      <View style={styles.cardTitleRow}>
        <MaterialCommunityIcons name="water" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{ar.dailyWaterIntake}</Text>
        {waterData.isSyncing && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        )}
      </View>
      <TouchableOpacity 
        style={[styles.waterGoalChip, { backgroundColor: `${colors.primary}10` }]}
        onPress={handleEditWaterGoal}
      >
        <Text style={[styles.waterGoalText, { color: colors.primary }]}>
          {ar.goalCups.replace('{cups}', waterData.cupsGoal.toString())} ✎
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.waterMain}>
      <View style={styles.waterCircleContainer}>
        <View style={[
          styles.waterCircle, 
          { 
            borderColor: waterData.isCompleted ? SUCCESS : colors.primary, 
            backgroundColor: colors.iconBg 
          }
        ]}>
          <Text style={[styles.waterCount, { color: waterData.isCompleted ? SUCCESS : colors.primary }]}>
            {waterData.cupsAmount}
          </Text>
          <Text style={[styles.waterUnit, { color: colors.textSecondary }]}>{ar.cups}</Text>
        </View>
        {waterData.streakDays > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: `${WARNING}20` }]}>
            <MaterialCommunityIcons name="fire" size={12} color={WARNING} />
            <Text style={[styles.streakText, { color: WARNING }]}>
              {ar.dayStreakWithCount.replace('{count}', waterData.streakDays.toString())}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.waterDetails}>
        <View style={styles.waterProgressSection}>
          <View style={[styles.waterProgressBarBg, { backgroundColor: colors.progressBg }]}>
            <View style={[
              styles.waterProgressBarFill, 
              { 
                backgroundColor: waterData.isCompleted ? SUCCESS : colors.primary, 
                width: `${waterData.progress * 100}%` 
              }
            ]} />
          </View>
          <Text style={[styles.waterProgressText, { color: colors.textSecondary }]}>
            {ar.cupsCompletedWithCount
              .replace('{completed}', waterData.cupsAmount.toString())
              .replace('{total}', waterData.cupsGoal.toString())
            }
          </Text>
        </View>

        {/* Smart Water Input Component - No quick chips outside */}
        <SmartWaterInput
          onAddWater={(amount, unit) => waterData.addWater(amount, unit)}
          isSyncing={waterData.isSyncing}
          buttonStyle="gradient"
          buttonText={ar.addWater}
        />
      </View>
    </View>

    <View style={styles.waterStatsRow}>
      <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
        <Text style={[styles.waterStatValue, { color: colors.text }]}>
          {Math.round(waterData.goalInML)}
        </Text>
        <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>{ar.goal}</Text>
        <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>{ar.ml}</Text>
      </View>
      <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
        <Text style={[styles.waterStatValue, { color: colors.text }]}>
          {Math.round(waterData.amountInML)}
        </Text>
        <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>{ar.consumed}</Text>
        <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>{ar.ml}</Text>
      </View>
      <View style={[styles.waterStatItem, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
        <Text style={[styles.waterStatValue, { color: colors.text }]}>
          {Math.round(waterData.remainingML)}
        </Text>
        <Text style={[styles.waterStatLabel, { color: colors.textSecondary }]}>{ar.remaining}</Text>
        <Text style={[styles.waterStatUnit, { color: colors.textSecondary }]}>{ar.ml}</Text>
      </View>
    </View>

    {waterData.error && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={14} color="#EF4444" />
        <Text style={styles.errorText}>{waterData.error}</Text>
      </View>
    )}

    {waterData.isCompleted && (
      <View style={[styles.goalAchievedBanner, { backgroundColor: `${SUCCESS}15`, borderColor: `${SUCCESS}30` }]}>
        <Ionicons name="trophy" size={16} color={SUCCESS} />
        <Text style={[styles.goalAchievedText, { color: SUCCESS }]}>
          {'🎉 ' + ar.dailyHydrationGoalAchieved}
        </Text>
      </View>
    )}
  </View>
</View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Step Goal Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStepGoalModal}
        onRequestClose={() => setShowStepGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{ar.editStepGoal}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {ar.editStepGoalSubtitle}
            </Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: colors.statBg, 
                borderColor: colors.cardBorder,
                color: colors.text 
              }]}
              value={tempStepGoal}
              onChangeText={setTempStepGoal}
              keyboardType="numeric"
              placeholder={ar.enterSteps}
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.cardBorder }]}
                onPress={() => setShowStepGoalModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{ar.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveStepGoal}
              >
                <Text style={styles.saveButtonText}>{ar.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWaterGoalModal}
        onRequestClose={() => setShowWaterGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{ar.editWaterGoal}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {ar.editWaterGoalSubtitle}
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: colors.statBg, 
                  borderColor: colors.cardBorder,
                  color: colors.text,
                  flex: 1,
                }]}
                value={tempWaterGoal}
                onChangeText={setTempWaterGoal}
                keyboardType="decimal-pad"
                placeholder={ar.enterLiters}
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>{ar.liters}</Text>
            </View>
            {tempWaterGoal && !isNaN(parseFloat(tempWaterGoal)) && (
              <Text style={[styles.mlPreview, { color: colors.primary }]}>
                = {Math.round(parseFloat(tempWaterGoal) * 1000)} {ar.ml} ({Math.round((parseFloat(tempWaterGoal) * 1000) / 250)} {ar.cups})
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.cardBorder }]}
                onPress={() => setShowWaterGoalModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{ar.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveWaterGoal}
              >
                <Text style={styles.saveButtonText}>{ar.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Professional Meal Card Component (unchanged styles, uses translated meal titles)
const MealCard = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Map Arabic meal names to meal details
  const mealDetails: Record<string, any[]> = {
    [ar.breakfast]: [
      {
        name: 'Eggs & Toast',
        calories: '230 kcal',
        protein: '11g',
        carbs: '10g',
        fat: '14g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/eggs_benedict.jpg',
      },
      {
        name: 'French Toast',
        calories: '210 kcal',
        protein: '8g',
        carbs: '22g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
      },
      {
        name: 'Apple & Almonds',
        calories: '160 kcal',
        protein: '6g',
        carbs: '16g',
        fat: '8g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
      },
    ],
    [ar.lunch]: [
      {
        name: 'Grilled Salmon & Rice',
        calories: '280 kcal',
        protein: '22g',
        carbs: '25g',
        fat: '13g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grilled_salmon.jpg',
      },
      {
        name: 'Kofta & Bread',
        calories: '280 kcal',
        protein: '24g',
        carbs: '20g',
        fat: '18g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kofta.jpg',
      },
      {
        name: 'Caesar Salad',
        calories: '180 kcal',
        protein: '10g',
        carbs: '7g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/caesar_salad.jpg',
      },
    ],
    [ar.workoutMeal]: [
      {
        name: 'Banana & Honey',
        calories: '160 kcal',
        protein: '1.5g',
        carbs: '41g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
      {
        name: 'Toast & Peanut Butter',
        calories: '200 kcal',
        protein: '8g',
        carbs: '20g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/french_toast.jpg',
      },
      {
        name: 'Dates & Milk',
        calories: '140 kcal',
        protein: '4g',
        carbs: '32g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
    ],
    [ar.dinner]: [
      {
        name: 'Kebda & Rice',
        calories: '240 kcal',
        protein: '26g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/kebda.jpg',
      },
      {
        name: 'Fish & Bread',
        calories: '260 kcal',
        protein: '20g',
        carbs: '18g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fish.jpg',
      },
      {
        name: 'Chicken Wings & Rice',
        calories: '280 kcal',
        protein: '20g',
        carbs: '25g',
        fat: '12g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/chicken_wings.jpg',
      },
    ],
    [ar.morningSnack]: [
      {
        name: 'Apple & Cheese',
        calories: '150 kcal',
        protein: '8g',
        carbs: '14g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/apple.jpg',
      },
      {
        name: 'Yogurt & Granola',
        calories: '180 kcal',
        protein: '10g',
        carbs: '20g',
        fat: '5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/frozen_yogurt.jpg',
      },
      {
        name: 'Banana & Almonds',
        calories: '160 kcal',
        protein: '5g',
        carbs: '25g',
        fat: '6g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
    ],
    [ar.eveningSnack]: [
      {
        name: 'Cheese & Crackers',
        calories: '170 kcal',
        protein: '10g',
        carbs: '12g',
        fat: '10g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/cheese_plate.jpg',
      },
      {
        name: 'Grapes & Nuts',
        calories: '150 kcal',
        protein: '4g',
        carbs: '20g',
        fat: '7g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/grape.jpg',
      },
      {
        name: 'Fig & Honey',
        calories: '130 kcal',
        protein: '1g',
        carbs: '32g',
        fat: '0.5g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
    ],
    [ar.postWorkoutShake]: [
      {
        name: 'Banana & Milk',
        calories: '120 kcal',
        protein: '8g',
        carbs: '18g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/banana.jpg',
      },
      {
        name: 'Dates & Yogurt',
        calories: '140 kcal',
        protein: '6g',
        carbs: '28g',
        fat: '2g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fig.jpg',
      },
      {
        name: 'Fool & Bread',
        calories: '160 kcal',
        protein: '8g',
        carbs: '16g',
        fat: '9g',
        imageUrl: 'https://res.cloudinary.com/dsdkaxbl3/image/upload/v1763120284/icoach/foods/fool.jpg',
      },
    ],
  };

  const foodItems = mealDetails[title] || [];
  const totalCalories = foodItems.reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);

  return (
    <TouchableOpacity
      style={[
        mealStyles.card,
        {
          backgroundColor: colors.authInputBg || colors.surface,
          borderColor: colors.authInputBorder || colors.cardBorder,
          shadowColor: colors.shadow,
        },
        open && { borderColor: colors.primary },
      ]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.9}
    >
      <View style={mealStyles.cardHeader}>
        <View style={mealStyles.titleContainer}>
          <View style={[mealStyles.mealIcon, { backgroundColor: `${colors.primary}10` }]}>
            <MaterialCommunityIcons name="food-apple" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[mealStyles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[mealStyles.subtitle, { color: colors.textSecondary }]}>
              {foodItems.length} {ar.items} • {totalCalories} {ar.cal}
            </Text>
          </View>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-right'} size={20} color={colors.textSecondary} />
      </View>

      {open && (
        <View style={[mealStyles.content, { borderTopColor: colors.divider }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mealStyles.gallery}>
            {foodItems.slice(0, 3).map((food, index) => (
              <Image key={index} source={{ uri: food.imageUrl }} style={[mealStyles.galleryImage, { backgroundColor: colors.statBg }]} />
            ))}
          </ScrollView>

          {foodItems.map((food, index) => (
            <View key={index} style={[mealStyles.foodItem, { backgroundColor: colors.statBg, borderColor: colors.authInputBorder || colors.cardBorder }]}>
              <Image source={{ uri: food.imageUrl }} style={[mealStyles.foodImage, { backgroundColor: colors.statBg }]} />
              <View style={mealStyles.foodInfo}>
                <Text style={[mealStyles.foodName, { color: colors.text }]}>{food.name}</Text>
                <View style={mealStyles.nutritionGrid}>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>Cal</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.calories}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>P</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.protein}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>C</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.carbs}</Text>
                  </View>
                  <View style={mealStyles.nutritionChip}>
                    <Text style={[mealStyles.nutritionLabel, { color: colors.textSecondary }]}>F</Text>
                    <Text style={[mealStyles.nutritionValue, { color: colors.primary }]}>{food.fat}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Professional Styles
const styles = StyleSheet.create({
  decorativeCircle1: { position: 'absolute', top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: 'absolute', top: '30%', left: '-20%', width: 150, height: 150, borderRadius: 75 },
  main: { flex: 1 },
  scrollContent: {},
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
    gap: 8,
    position: 'relative',
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
    quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionItem: {
    width: '47%',
    padding: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'visible',
  },
  quickActionIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionContent: {
    gap: 2,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickActionDesc: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  chevronContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    opacity: 0.5,
  },
  aiGlowIndicator: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiPulse: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  newFeatureBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  newFeatureText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsCard: {
    borderRadius: 32,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepGoalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 32,
  },
  stepGoalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepsMetric: {
    alignItems: 'center',
  },
  stepsValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  stepsUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRemaining: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EF444430',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
  },
  waterCard: {
    borderRadius: 32,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterGoalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 32,
  },
  waterGoalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  waterMain: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  waterCircleContainer: {
    alignItems: 'center',
  },
  waterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  waterUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '600',
  },
  waterDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  waterProgressSection: {
    gap: 6,
  },
  waterProgressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterProgressText: {
    fontSize: 11,
  },
  waterQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickAddChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addWaterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  waterStatsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB30',
  },
  waterStatItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  waterStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  waterStatLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  waterStatUnit: {
    fontSize: 9,
  },
  goalAchievedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalAchievedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
    width: 30,
  },
  mlPreview: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const mealStyles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  gallery: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  galleryImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginRight: 10,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nutritionLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  nutritionValue: {
    fontSize: 10,
    fontWeight: '700',
  },
});