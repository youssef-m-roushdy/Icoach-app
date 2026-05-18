// screens/NotificationsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import ar from '../../i18n/locales/ar.json';

// ✅ Types
type NotificationType = 'achievement' | 'reminder' | 'meal' | 'tip' | 'challenge' | 'report' | 'social';
type TabType = 'all' | 'unread';

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: NotificationType;
  icon: string;
};

type Props = {
  navigation: NavigationProp<any>;
};

export default function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: '🎯 Daily Goal Achieved!',
      message: "Congratulations! You've reached your daily step goal of 10,000 steps.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      type: 'achievement',
      icon: 'trophy',
    },
    {
      id: '2',
      title: '💧 Hydration Reminder',
      message: "Time to drink water! You've only had 2 cups today. Goal: 8 cups.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
      type: 'reminder',
      icon: 'water',
    },
    {
      id: '3',
      title: '🍽️ Meal Time: Lunch',
      message: "Don't forget to log your lunch meal. Grilled salmon is on your plan today!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      read: true,
      type: 'meal',
      icon: 'food-apple',
    },
    {
      id: '4',
      title: '🤖 AI Coach Tip',
      message: 'Pro tip: Adding protein to your breakfast can help control hunger throughout the day!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      type: 'tip',
      icon: 'robot',
    },
    {
      id: '5',
      title: '🏆 Weekly Challenge',
      message: 'New challenge: Complete 5 workouts this week to earn bonus points!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      read: true,
      type: 'challenge',
      icon: 'flag',
    },
    {
      id: '6',
      title: '📊 Progress Report',
      message: 'Your weekly progress: +15% more active than last week. Keep it up!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
      read: true,
      type: 'report',
      icon: 'trending-up',
    },
    {
      id: '7',
      title: '👥 Friend Activity',
      message: 'Sarah just completed a 5km run! Send them a cheer!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96),
      read: true,
      type: 'social',
      icon: 'people',
    },
  ]);

  // ✅ Typed id param
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  // ✅ Typed id param
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // ✅ Typed iconName param
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'trophy':
        return <Ionicons name="trophy" size={22} color="#F59E0B" />;
      case 'water':
        return <MaterialCommunityIcons name="water" size={22} color="#3B82F6" />;
      case 'food-apple':
        return <MaterialCommunityIcons name="food-apple" size={22} color="#10B981" />;
      case 'robot':
        return <MaterialCommunityIcons name="robot" size={22} color="#8B5CF6" />;
      case 'flag':
        return <Feather name="flag" size={22} color="#EF4444" />;
      case 'trending-up':
        return <Ionicons name="trending-up" size={22} color="#06B6D4" />;
      case 'people':
        return <Ionicons name="people" size={22} color="#EC4899" />;
      default:
        return <Ionicons name="notifications" size={22} color={colors.primary} />;
    }
  };

  // ✅ Typed timestamp param
  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return ar.justNow;
    if (minutes < 60) return `${minutes}${ar.minutesAgo}`;
    if (hours < 24) return `${hours}${ar.hoursAgo}`;
    return `${days}${ar.daysAgo}`;
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  // ✅ Typed item param
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        {
          backgroundColor: colors.authInputBg || colors.surface,
          borderColor: colors.authInputBorder || colors.cardBorder,
          opacity: item.read ? 0.7 : 1,
        },
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}>
        {getIconComponent(item.icon)}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteNotification(item.id)}>
        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{ar.notifications}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>{ar.markAllRead}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'all' ? colors.primary : colors.textSecondary }]}>
            {ar.all}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'unread' ? colors.primary : colors.textSecondary }]}>
            {ar.unread}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList<Notification>
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{ar.noNotifications}</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {activeTab === 'unread' ? ar.allReadMessages : ar.allCaughtUp}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  markAllText: { fontSize: 14, fontWeight: '500' },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 24,
  },
  tab: { paddingVertical: 8, position: 'relative' },
  tabText: { fontSize: 16, fontWeight: '600' },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -16,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  time: { fontSize: 11, marginLeft: 8 },
  message: { fontSize: 13, lineHeight: 18 },
  deleteButton: { padding: 4 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyMessage: { fontSize: 14, textAlign: 'center' },
});