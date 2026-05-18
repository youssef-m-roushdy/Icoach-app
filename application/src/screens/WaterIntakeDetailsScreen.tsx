// screens/WaterIntakeDetailsScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { waterIntakeService } from '../services/waterIntakeService';
import SuccessModal from '../components/common/SuccessModal';
import EditWaterGoalModal from '../components/EditWaterGoalModal';
import ar from '../../i18n/locales/ar.json';

type TimeFrame = 'week' | 'month' | 'all';

export default function WaterIntakeDetailsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [total, setTotal] = useState({ totalLiters: 0, totalML: 0, averageDailyLiters: 0 });
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  
  // Goal edit modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState(false);
  
  // Success/Error modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const loadAllData = useCallback(async () => {
    if (!token) return;
    
    try {
      const [statsRes, historyRes, streakRes, totalRes] = await Promise.all([
        waterIntakeService.getStats(token),
        waterIntakeService.getHistory(token, { limit: 90 }),
        waterIntakeService.getStreak(token),
        waterIntakeService.getTotalIntake(token),
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (historyRes.success) setHistory(historyRes.data || []);
      if (streakRes) setStreak(streakRes);
      if (totalRes) setTotal(totalRes);
      
    } catch (error) {
      console.error('Failed to load water intake data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleUpdateGoal = async (newGoal: number) => {
    setUpdatingGoal(true);
    try {
      const response = await waterIntakeService.updateGoal(token!, { goalInLiters: newGoal });
      if (response.success) {
        setModalMessage(`${ar.waterGoalUpdated} ${newGoal}L (${Math.round(newGoal * 1000)}ml)`);
        setShowSuccessModal(true);
        await loadAllData(); // Refresh data
      } else {
        setModalMessage(response.message || ar.failedToUpdateGoal);
        setShowErrorModal(true);
      }
    } catch (error) {
      setModalMessage(ar.failedToUpdateGoalTryAgain);
      setShowErrorModal(true);
    } finally {
      setUpdatingGoal(false);
      setShowGoalModal(false);
    }
  };

  const renderStatCard = (title: string, value: string, subtitle: string, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );

  const renderDayBar = (day: any, index: number, maxAmount: number) => {
    const height = maxAmount > 0 ? (day.amountML / maxAmount) * 100 : 0;
    const isCompleted = day.completed;
    
    return (
      <View key={index} style={styles.dayBarContainer}>
        <View style={[styles.dayBar, { backgroundColor: colors.progressBg }]}>
          <View 
            style={[
              styles.dayBarFill, 
              { 
                height: `${height}%`,
                backgroundColor: isCompleted ? '#10B981' : colors.primary 
              }
            ]} 
          />
        </View>
        <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dayAmount, { color: colors.textSecondary }]}>
          {Math.round(day.amountML)}ml
        </Text>
      </View>
    );
  };

  const renderHistoryItem = (item: any) => {
    const date = new Date(item.date);
    const isToday = date.toDateString() === new Date().toDateString();
    const progress = (item.amountInML / item.goalInML) * 100;
    
    return (
      <View key={item.id} style={[styles.historyItem, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}>
        <View style={styles.historyDate}>
          <Text style={[styles.historyDay, { color: colors.text, fontWeight: isToday ? '700' : '400' }]}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <Text style={[styles.historyDateText, { color: colors.textSecondary }]}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.todayBadgeText, { color: colors.primary }]}>{ar.today}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.historyAmounts}>
          <View style={styles.historyAmount}>
            <Text style={[styles.historyAmountValue, { color: colors.text }]}>
              {Math.round(item.amountInML)}
            </Text>
            <Text style={[styles.historyAmountUnit, { color: colors.textSecondary }]}>ml</Text>
          </View>
          <Text style={[styles.historySeparator, { color: colors.textSecondary }]}>/</Text>
          <View style={styles.historyAmount}>
            <Text style={[styles.historyAmountValue, { color: colors.textSecondary }]}>
              {Math.round(item.goalInML)}
            </Text>
            <Text style={[styles.historyAmountUnit, { color: colors.textSecondary }]}>ml</Text>
          </View>
        </View>
        
        <View style={[styles.historyProgress, { backgroundColor: colors.progressBg }]}>
          <View 
            style={[
              styles.historyProgressFill, 
              { 
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: item.isCompleted ? '#10B981' : colors.primary 
              }
            ]} 
          />
        </View>
        
        {item.isCompleted && (
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{ar.loadingWaterIntakeData}</Text>
      </View>
    );
  }

  const weeklyData = stats?.weeklyData || [];
  const maxAmount = Math.max(...weeklyData.map((d: any) => d.amountML), 250);
  const todayStats = stats?.today;
  const currentGoal = todayStats?.goalInLiters || stats?.today?.goalInLiters || 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.authBgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface + '95' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{ar.waterIntakeDetails}</Text>
        <TouchableOpacity onPress={() => setShowGoalModal(true)} style={styles.editButton}>
          <Feather name="edit-2" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.todaySummary}</Text>
          <View style={[styles.todayCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}>
            <View style={styles.todayMain}>
              <View style={styles.todayAmount}>
                <Text style={[styles.todayAmountValue, { color: colors.text }]}>
                  {Math.round(todayStats?.amountInML || 0)}
                </Text>
                <Text style={[styles.todayAmountUnit, { color: colors.textSecondary }]}>ml</Text>
              </View>
              <Text style={[styles.todayDivider, { color: colors.textSecondary }]}>/</Text>
              <View style={styles.todayGoal}>
                <Text style={[styles.todayGoalValue, { color: colors.textSecondary }]}>
                  {Math.round(todayStats?.goalInML || currentGoal * 1000)}
                </Text>
                <Text style={[styles.todayGoalUnit, { color: colors.textSecondary }]}>ml</Text>
              </View>
            </View>
            
            <View style={[styles.todayProgress, { backgroundColor: colors.progressBg }]}>
              <View 
                style={[
                  styles.todayProgressFill, 
                  { 
                    width: `${Math.min((todayStats?.amountInML || 0) / (todayStats?.goalInML || currentGoal * 1000) * 100, 100)}%`,
                    backgroundColor: todayStats?.isCompleted ? '#10B981' : colors.primary 
                  }
                ]} 
              />
            </View>
            
            {todayStats?.isCompleted && (
              <View style={[styles.goalAchievedBadge, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="trophy" size={16} color="#10B981" />
                <Text style={[styles.goalAchievedText, { color: '#10B981' }]}>{ar.goalAchieved}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Key Stats Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.statistics}</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(ar.currentStreak, `${streak.currentStreak}`, ar.days, 'fire', '#F59E0B')}
            {renderStatCard(ar.longestStreak, `${streak.longestStreak}`, ar.days, 'trophy', '#10B981')}
            {renderStatCard(ar.totalIntake, `${total.totalLiters.toFixed(1)}`, ar.liters, 'water', colors.primary)}
            {renderStatCard(ar.dailyAvg, `${total.averageDailyLiters.toFixed(1)}`, ar.litersPerDay, 'chart-line', '#8B5CF6')}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.weeklyOverview}</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{ar.partial}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{ar.completed}</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.chartCard, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}>
            <View style={styles.barChart}>
              {weeklyData.map((day: any, index: number) => renderDayBar(day, index, maxAmount))}
            </View>
          </View>
        </View>

        {/* History List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{ar.history}</Text>
          {history.length > 0 ? (
            <View style={styles.historyList}>
              {history.slice(0, 30).map((item) => renderHistoryItem(item))}
            </View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]}>
              <MaterialCommunityIcons name="water" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{ar.noWaterIntakeHistory}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{ar.startLoggingWater}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Water Goal Modal */}
      <EditWaterGoalModal
        visible={showGoalModal}
        currentGoalInLiters={currentGoal}
        onSave={handleUpdateGoal}
        onClose={() => setShowGoalModal(false)}
        isUpdating={updatingGoal}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={ar.success}
        message={modalMessage}
        primaryButtonText={ar.ok}
        onPrimaryPress={() => setShowSuccessModal(false)}
        iconName="checkmark-circle"
      />

      {/* Error Modal */}
      <SuccessModal
        visible={showErrorModal}
        title={ar.error}
        message={modalMessage}
        primaryButtonText={ar.ok}
        onPrimaryPress={() => setShowErrorModal(false)}
        iconName="alert-circle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  editButton: { padding: 8 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  todayCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  todayMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
  todayAmount: { flexDirection: 'row', alignItems: 'baseline' },
  todayAmountValue: { fontSize: 48, fontWeight: '800' },
  todayAmountUnit: { fontSize: 16, fontWeight: '500', marginLeft: 4 },
  todayDivider: { fontSize: 32, fontWeight: '300', marginHorizontal: 8 },
  todayGoal: { flexDirection: 'row', alignItems: 'baseline' },
  todayGoalValue: { fontSize: 32, fontWeight: '600' },
  todayGoalUnit: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  todayProgress: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  todayProgressFill: { height: '100%', borderRadius: 4 },
  goalAchievedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, borderRadius: 12 },
  goalAchievedText: { fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  statSubtitle: { fontSize: 11 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartLegend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  chartCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160 },
  dayBarContainer: { alignItems: 'center', flex: 1 },
  dayBar: { width: 30, height: 120, borderRadius: 15, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  dayBarFill: { width: '100%', borderRadius: 15, position: 'absolute', bottom: 0 },
  dayLabel: { fontSize: 11, marginBottom: 4 },
  dayAmount: { fontSize: 10 },
  historyList: { gap: 12 },
  historyItem: { borderRadius: 16, padding: 14, borderWidth: 1, position: 'relative' },
  historyDate: { marginBottom: 10 },
  historyDay: { fontSize: 14, fontWeight: '600' },
  historyDateText: { fontSize: 12, marginTop: 2 },
  todayBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  todayBadgeText: { fontSize: 10, fontWeight: '600' },
  historyAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  historyAmount: { flexDirection: 'row', alignItems: 'baseline' },
  historyAmountValue: { fontSize: 20, fontWeight: '700' },
  historyAmountUnit: { fontSize: 12, marginLeft: 2 },
  historySeparator: { fontSize: 16 },
  historyProgress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  historyProgressFill: { height: '100%', borderRadius: 3 },
  completedIcon: { position: 'absolute', bottom: 14, right: 14 },
  emptyContainer: { borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1 },
  emptyText: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 4 },
});