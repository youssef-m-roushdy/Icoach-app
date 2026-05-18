import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  conversationService,
  type ConversationListItem,
  type ConversationParticipant,
  type PresenceState,
  type UserSummary,
} from '../services/conversationService';
import { socketService } from '../services/socketService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { LinearGradient } from 'expo-linear-gradient';

type PresenceMap = Record<string, PresenceState>;

export default function MessagesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { token, user } = useAuth();
  const keyboardHeight = useKeyboardHeight();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const newChatSheetRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleOpenNewChat = useCallback(() => {
    setIsNewChatOpen(true);
    newChatSheetRef.current?.present();
  }, []);

  const handleCloseNewChat = useCallback(() => {
    setIsNewChatOpen(false);
    newChatSheetRef.current?.dismiss();
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isNewChatOpen) {
        handleCloseNewChat();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isNewChatOpen, handleCloseNewChat]);

  const normalizeParticipants = useCallback(
    (items: Array<ConversationParticipant | UserSummary>): UserSummary[] =>
      items
        .map((item): UserSummary | undefined => {
          if ('username' in item) {
            return item;
          }
          return item.user;
        })
        .filter(
          (participant): participant is UserSummary =>
            !!participant && participant.id !== user?.id,
        ),
    [user?.id],
  );

  const loadConversations = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await conversationService.listConversations(token, 1, 50);
      const list = response.data?.conversations || [];
      setConversations(list);

      const userIds = list
        .map((item) => item.participants[0]?.id)
        .filter((id): id is number => typeof id === 'number');

      if (userIds.length > 0) {
        socketService.emit('presence:watch', userIds);
        const presenceResponse = await conversationService.getPresence(token, userIds);
        if (presenceResponse.success && presenceResponse.data) {
          const nextMap: PresenceMap = {};
          presenceResponse.data.forEach((presence) => {
            nextMap[presence.userId] = presence;
          });
          setPresenceMap((prev) => ({ ...prev, ...nextMap }));
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const refreshConversations = useCallback(async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  }, [loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handlePresenceUpdate = (payload: PresenceState) => {
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: payload,
      }));
    };

    const handleMessageNew = (payload: { conversationId: number; message: any }) => {
      setConversations((prev) => {
        const index = prev.findIndex(
          (item) => item.conversation.id === payload.conversationId,
        );
        if (index === -1) return prev;

        const isOwnMessage = payload.message?.senderId === user?.id;
        const currentUnread = prev[index].unreadCount ?? 0;
        const nextUnread = isOwnMessage ? currentUnread : currentUnread + 1;

        const updated = {
          ...prev[index],
          lastMessage: payload.message,
          unreadCount: nextUnread,
          conversation: {
            ...prev[index].conversation,
            updatedAt: payload.message?.createdAt || prev[index].conversation.updatedAt,
          },
        };

        return [updated, ...prev.filter((_, idx) => idx !== index)];
      });
    };

    const handleMessageRead = (payload: { conversationId: number; userId: number; lastReadAt: string }) => {
      if (payload.userId !== user?.id) return;

      setConversations((prev) =>
        prev.map((item) =>
          item.conversation.id === payload.conversationId
            ? {
                ...item,
                lastReadAt: payload.lastReadAt,
                unreadCount: 0,
              }
            : item
        )
      );
    };

    const handleConversationNew = (payload: {
      conversation: any;
      participants: any[];
    }) => {
      setConversations((prev) => {
        const exists = prev.some(
          (item) => item.conversation.id === payload.conversation.id,
        );
        if (exists) return prev;

        const participants = normalizeParticipants(payload.participants || []);

        const item: ConversationListItem = {
          conversation: payload.conversation,
          participants,
          lastMessage: null,
          lastReadAt: null,
          unreadCount: 0,
        };

        return [item, ...prev];
      });

      const participantId =
        payload.participants?.[0]?.user?.id || payload.participants?.[0]?.id;
      if (participantId) {
        socketService.emit('presence:watch', [participantId]);
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:new', handleMessageNew);
    socket.on('message:read', handleMessageRead);
    socket.on('conversation:new', handleConversationNew);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:new', handleMessageNew);
      socket.off('message:read', handleMessageRead);
      socket.off('conversation:new', handleConversationNew);
    };
  }, [normalizeParticipants, user?.id]);

  useEffect(() => {
    if (!isNewChatOpen) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!token) return;

      try {
        setIsSearching(true);
        const response = await conversationService.searchUsers(token, query, 20);
        setSearchResults(response.data || []);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to search users');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isNewChatOpen, searchQuery, token]);

  const handleStartConversation = useCallback(
    async (participant: UserSummary) => {
      if (!token) return;

      try {
        const response = await conversationService.createConversation(
          token,
          participant.id,
        );
        const data = response.data;
        if (!data) {
          throw new Error('Conversation creation failed');
        }

        handleCloseNewChat();

        setConversations((prev) => {
          const exists = prev.some(
            (item) => item.conversation.id === data.conversation.id,
          );
          if (exists) return prev;

          const otherParticipants = normalizeParticipants(data.participants || []);

          return [
            {
              conversation: data.conversation,
              participants: otherParticipants,
              lastMessage: null,
              lastReadAt: null,
            },
            ...prev,
          ];
        });

        if (participant?.id) {
          socketService.emit('presence:watch', [participant.id]);
        }

        navigation.navigate('ChatThread', {
          conversationId: data.conversation.id,
          participant,
        });
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Unable to start conversation');
      }
    },
    [navigation, normalizeParticipants, token],
  );

  const formatTime = useCallback((timestamp?: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isSameDay = now.toDateString() === date.toDateString();

    if (isSameDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const renderConversation = ({ item }: { item: ConversationListItem }) => {
    const participant = item.participants[0];
    const displayName = participant
      ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
        participant.username
      : 'Unknown';
    const lastMessage = item.lastMessage?.content || 'No messages yet';
    const lastTime = formatTime(
      item.lastMessage?.createdAt || item.conversation.updatedAt,
    );
    const lastReadAt = item.lastReadAt ? new Date(item.lastReadAt) : null;
    const lastMessageDate = item.lastMessage?.createdAt
      ? new Date(item.lastMessage.createdAt)
      : null;
    const isUnread =
      lastMessageDate && (!lastReadAt || lastMessageDate > lastReadAt);
    const unreadCount = item.unreadCount ?? (isUnread ? 1 : 0);

    const presence = participant ? presenceMap[String(participant.id)] : undefined;
    const isOnline = presence?.online;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.cardBorder },
        ]}
        onPress={() =>
          navigation.navigate('ChatThread', {
            conversationId: item.conversation.id,
            participant,
            lastReadAt: item.lastReadAt ?? null,
          })
        }
      >
        <View style={styles.avatarWrapper}>
          <Image
            source={
              participant?.avatar
                ? { uri: participant.avatar }
                : require('../../assets/icon.png')
            }
            style={styles.avatar}
          />
          {participant && (
            <View
              style={[
                styles.presenceDot,
                { backgroundColor: isOnline ? '#22c55e' : colors.subtleText },
              ]}
            />
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={[styles.time, { color: colors.subtleText }]}>
              {lastTime}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text
              style={[styles.preview, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserResult = ({ item }: { item: UserSummary }) => {
    const displayName =
      `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username;

    return (
      <TouchableOpacity
        style={[styles.searchItem, { borderColor: colors.cardBorder }]}
        onPress={() => handleStartConversation(item)}
      >
        <Image
          source={
            item.avatar
              ? { uri: item.avatar }
              : require('../../assets/icon.png')
          }
          style={styles.searchAvatar}
        />
        <View style={styles.searchInfo}>
          <Text style={[styles.searchName, { color: colors.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.searchUsername, { color: colors.subtleText }]}>
            @{item.username}
          </Text>
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    );
  };

  const emptyMessage = isLoading
    ? 'Loading conversations...'
    : 'Start a new chat to see messages here.';

  // Bottom padding for the main list — respects safe area
  const listBottomPadding = Math.max(insets.bottom + 90, 120);

  // For Android: extra bottom padding inside the modal driven by keyboard height
  const modalListBottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 12, 12) + keyboardHeight
      : Math.max(insets.bottom + 12, 12);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: colors.authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: colors.authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: colors.authCircle3 }]} />
      </LinearGradient>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversation.id.toString()}
        renderItem={renderConversation}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listBottomPadding },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={colors.subtleText}
              />
            )}
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              {emptyMessage}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshConversations}
            tintColor={colors.primary}
          />
        }
      />

      {/* FAB — positioned above the bottom safe area */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: Math.max(insets.bottom + 16, 30),
          },
        ]}
        onPress={handleOpenNewChat}
      >
        <Ionicons name="add" size={26} color={colors.text} />
      </TouchableOpacity>

      {/* ── New Chat Modal ── */}
      <BottomSheetModal
        ref={newChatSheetRef}
        snapPoints={['75%']}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.modalBg }}
        handleIndicatorStyle={{ backgroundColor: (colors as any).divider ?? '#C0C0C0', width: 40, height: 4 }}
        onDismiss={handleCloseNewChat}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView
          style={[styles.modalContent, { paddingBottom: modalListBottomPadding }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              New Message
            </Text>
            <TouchableOpacity
              onPress={handleCloseNewChat}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search box */}
          <View
            style={[
              styles.searchBox,
              {
                borderColor: colors.inputBorder,
                backgroundColor: colors.inputBg,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.subtleText} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username"
              placeholderTextColor={colors.placeholder}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          <BottomSheetFlatList
            data={searchResults}
            keyExtractor={(item: UserSummary) => item.id.toString()}
            renderItem={renderUserResult}
            style={styles.searchList}
            contentContainerStyle={styles.searchListContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searchQuery.trim().length >= 2 && !isSearching ? (
                <Text
                  style={[
                    styles.searchEmpty,
                    { color: colors.subtleText },
                  ]}
                >
                  No users found
                </Text>
              ) : null
            }
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 150,
    left: -80,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  decorativeCircle3: {
    position: 'absolute',
    bottom: -50,
    right: 20,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  listContent: {
    padding: 16,
  },

  // ── Conversation card ──────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  time: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  preview: {
    flex: 1,
    fontSize: 13,
  },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },

  // ── FAB ───────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    // bottom is set inline to respect safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Modal ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // Semi-transparent background — set as backgroundColor on the KAV itself
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  // Results list takes remaining space so it scrolls rather than getting clipped
  searchList: {
    flex: 1,
  },
  searchListContent: {
    paddingVertical: 8,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  searchEmpty: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});