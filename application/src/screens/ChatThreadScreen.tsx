import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context';
import { conversationService, type ConversationMessage, type UserSummary, type PresenceState } from '../services/conversationService';
import { socketService } from '../services/socketService';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ar from '../../i18n/locales/ar.json';

interface ChatThreadParams {
  conversationId: number;
  participant?: UserSummary;
  lastReadAt?: string | null;
}

type MessageStatus = 'sent' | 'delivered' | 'push' | 'offline' | 'read' | 'failed';

type MessageStatusPayload = {
  conversationId: number;
  messageId: number;
  recipientId: number;
  status: 'delivered' | 'push' | 'offline';
};

const PAGE_SIZE = 40;

export default function ChatThreadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const keyboardHeight = useKeyboardHeight();

  const { conversationId, participant, lastReadAt } = (route.params || {}) as ChatThreadParams;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [messageStatusMap, setMessageStatusMap] = useState<Record<number, MessageStatus>>({});
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [pendingRead, setPendingRead] = useState(false);
  const [lastReadAtOther, setLastReadAtOther] = useState<Date | null>(
    participant?.lastReadAt ? new Date(participant.lastReadAt) : null
  );
  const [lastReadAtSelf, setLastReadAtSelf] = useState<string | null>(lastReadAt ?? null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const messagesRef = useRef<ConversationMessage[]>([]);
  const isAtBottomRef = useRef(true);
  const pendingReadRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const pendingScrollRef = useRef<{ previousHeight: number; previousOffset: number } | null>(null);
  const initialScrollDoneRef = useRef(false);
  const historyLoadAttemptsRef = useRef(0);
  const isRestoringRef = useRef(false);

  const displayName = useMemo(() => {
    if (!participant) return ar.chat;
    return `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.username;
  }, [participant]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  useEffect(() => {
    pendingReadRef.current = pendingRead;
  }, [pendingRead]);

  const updateMessageStatus = useCallback((messageId: number, status: MessageStatus) => {
    const rank: Record<MessageStatus, number> = {
      failed: 0,
      offline: 1,
      push: 2,
      sent: 2,
      delivered: 3,
      read: 4,
    };

    setMessageStatusMap((prev) => {
      const current = prev[messageId];
      if (current && rank[current] >= rank[status]) {
        return prev;
      }
      return { ...prev, [messageId]: status };
    });
  }, []);

  // Removed scroll anchor viewability logic

  const applyReadStatus = useCallback((readAt: number) => {
    if (Number.isNaN(readAt)) return;

    setMessageStatusMap((prev) => {
      const next = { ...prev };
      messagesRef.current.forEach((message) => {
        if (message.senderId !== user?.id) return;
        const messageTime = new Date(message.createdAt).getTime();
        if (Number.isNaN(messageTime)) return;
        if (messageTime <= readAt) {
          next[message.id] = 'read';
        }
      });
      return next;
    });
  }, [user?.id]);

  const getReadTimestamp = useCallback((value?: string | null) => {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }, []);

  const getStatusIcon = (status?: MessageStatus): keyof typeof Ionicons.glyphMap | null => {
    switch (status) {
      case 'offline':
        return 'cloud-offline-outline';
      case 'push':
        return 'notifications-outline';
      case 'delivered':
      case 'read':
        return 'checkmark-done';
      case 'sent':
        return 'checkmark';
      case 'failed':
        return 'close-circle';
      default:
        return null;
    }
  };

  const getStatusColor = (status?: MessageStatus) => {
    switch (status) {
      case 'offline':
        return '#ef4444';
      case 'push':
        return '#f59e0b';
      case 'delivered':
        return '#3b82f6';
      case 'read':
        return '#22c55e';
      case 'failed':
        return '#ef4444';
      case 'sent':
      default:
        return '#94a3b8';
    }
  };

  const formatLastSeen = useCallback((timestamp?: string | null) => {
    if (!timestamp) return ar.offline;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return ar.offline;

    const now = new Date();
    const isSameDay = now.toDateString() === date.toDateString();
    if (isSameDay) {
      return ar.lastSeenAtTime.replace(
        '{time}',
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }

    return ar.lastSeenAtDate.replace(
      '{date}',
      date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    );
  }, []);

  const executeMarkRead = useCallback(async () => {
    if (!token || !conversationId || !isFocused) return;
    try {
      const now = new Date().toISOString();
      setLastReadAtSelf(now);
      await conversationService.markRead(token, conversationId, now);
    } finally {
      setPendingRead(false);
      pendingReadRef.current = false;
    }
  }, [token, conversationId, isFocused]);

  const queueMarkRead = useCallback(() => {
    if (!token || !conversationId || !isFocused) return;
    if (isAtBottomRef.current) {
      executeMarkRead().catch(() => null);
      return;
    }

    if (!pendingReadRef.current) {
      setPendingRead(true);
      pendingReadRef.current = true;
    }
  }, [token, conversationId, isFocused, executeMarkRead]);

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;

    try {
      setIsLoading(true);
      const response = await conversationService.getMessages(token, conversationId, { limit: PAGE_SIZE });
      const list = response.data || [];
      setMessages(list);
      setHasMore(list.length >= PAGE_SIZE);
      const hasIncoming = list.some((message) => message.senderId !== user?.id);
      if (hasIncoming) {
        setPendingRead(true);
        pendingReadRef.current = true;
        queueMarkRead();
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, conversationId, queueMarkRead, user?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (!token || !conversationId || isLoadingMore || !hasMore) return;

    const oldest = messagesRef.current[0];
    if (!oldest?.createdAt) return;

    setIsLoadingMore(true);
    const previousHeight = contentHeightRef.current;
    const previousOffset = scrollOffsetRef.current;

    try {
      const response = await conversationService.getMessages(token, conversationId, {
        limit: PAGE_SIZE,
        before: oldest.createdAt,
      });
      const older = response.data || [];

      if (older.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const merged = [...older.filter((message) => !existingIds.has(message.id)), ...prev];
        return merged;
      });

      if (older.length < PAGE_SIZE) {
        setHasMore(false);
      }

      pendingScrollRef.current = { previousHeight, previousOffset };
    } finally {
      setIsLoadingMore(false);
    }
  }, [token, conversationId, isLoadingMore, hasMore]);

  const scrollToEnd = useCallback((animated = true) => {
    if (listRef.current && messagesRef.current.length > 0) {
      const lastIndex = messagesRef.current.length - 1;
      // Using offset to avoid initial rendering issues with dynamic heights
      listRef.current.scrollToEnd({ animated });
    }
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    scrollOffsetRef.current = contentOffset.y;
    if (!initialScrollDoneRef.current || isRestoringRef.current) {
      return;
    }
    const isNearTop = contentOffset.y <= 40;
    if (isNearTop) {
      loadMoreMessages().catch(() => null);
    }
    const padding = 20;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - padding;

    if (isAtBottomRef.current !== isBottom) {
      isAtBottomRef.current = isBottom;
      setIsAtBottom(isBottom);

      if (isBottom && pendingReadRef.current) {
        executeMarkRead().catch(() => null);
      }
    }
  }, [executeMarkRead, loadMoreMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Removed AsyncStorage scroll state persistence

  useEffect(() => {
    if (!token || !participant) return;

    conversationService.getPresence(token, [participant.id])
      .then((response) => {
        const initialPresence = response.data?.[0];
        if (initialPresence) {
          setPresence(initialPresence);
        }
      })
      .catch(() => null);
  }, [token, participant]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    socketService.emit('conversation:join', conversationId);

    const handleMessageNew = (payload: { conversationId: number; message: ConversationMessage }) => {
      if (payload.conversationId !== conversationId) return;

      setMessages((prev) => {
        const exists = prev.some((message) => message.id === payload.message.id);
        if (exists) return prev;
        return [...prev, payload.message];
      });

      if (payload.message.senderId !== user?.id) {
        setPendingRead(true);
        pendingReadRef.current = true;
        queueMarkRead();
      }

      if (payload.message.senderId === user?.id) {
        updateMessageStatus(payload.message.id, 'sent');
      }
    };

    const handleMessageRead = (payload: { conversationId: number; userId: number; lastReadAt: string }) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId === user?.id) {
        setLastReadAtSelf(payload.lastReadAt);
        return;
      }

      const readAt = new Date(payload.lastReadAt).getTime();
      if (Number.isNaN(readAt)) return;

      setLastReadAtOther(new Date(payload.lastReadAt));
      applyReadStatus(readAt);
    };

    const handlePresenceUpdate = (payload: PresenceState) => {
      if (participant && String(participant.id) === payload.userId) {
        setPresence(payload);
      }
    };

    socket.on('message:new', handleMessageNew);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:read', handleMessageRead);

    if (participant) {
      socketService.emit('presence:watch', [participant.id]);
    }

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:read', handleMessageRead);
      socketService.emit('conversation:leave', conversationId);
      if (participant) {
        socketService.emit('presence:unwatch', [participant.id]);
      }
    };
  }, [conversationId, participant, token, user?.id]);

  useEffect(() => {
    if (!lastReadAtOther) return;
    const readAt = lastReadAtOther.getTime();
    if (Number.isNaN(readAt)) return;
    applyReadStatus(readAt);
  }, [lastReadAtOther, messages.length, applyReadStatus]);

  useEffect(() => {
    if (!isFocused) return;
    if (isAtBottomRef.current && pendingReadRef.current) {
      executeMarkRead().catch(() => null);
    }
  }, [isFocused, executeMarkRead]);

  useEffect(() => {
    if (!conversationId) return;

    const handleMessageStatus = (payload: MessageStatusPayload) => {
      if (payload.conversationId !== conversationId) return;
      updateMessageStatus(payload.messageId, payload.status);
    };

    socketService.addMessageStatusListener(handleMessageStatus);

    return () => {
      socketService.removeMessageStatusListener(handleMessageStatus);
    };
  }, [conversationId, updateMessageStatus]);

  useEffect(() => {
    if (messages.length > 0 && isAtBottomRef.current) {
      setTimeout(() => scrollToEnd(true), 60);
    }
  }, [messages.length, scrollToEnd]);

  const handleScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    const offset = info.averageItemLength * info.index;
    listRef.current?.scrollToOffset({ offset, animated: false });
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: info.index >= messagesRef.current.length - 1 ? 1 : 0.2 });
    }, 80);
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    initialScrollDoneRef.current = false;
    historyLoadAttemptsRef.current = 0;
    isRestoringRef.current = false;
  }, [isFocused, conversationId]);

  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    if (!isFocused) return;

    const effectiveLastReadAt = lastReadAtSelf ?? lastReadAt;
    const lastReadTime = getReadTimestamp(effectiveLastReadAt);
    const oldestMessageTime = new Date(messages[0].createdAt).getTime();

    if (lastReadTime !== null && !Number.isNaN(oldestMessageTime)) {
      if (lastReadTime < oldestMessageTime && hasMore && historyLoadAttemptsRef.current < 4) {
        historyLoadAttemptsRef.current += 1;
        loadMoreMessages().catch(() => null);
        return;
      }

      const firstUnreadIndex = messages.findIndex((message) => {
        const messageTime = new Date(message.createdAt).getTime();
        return !Number.isNaN(messageTime) && messageTime > lastReadTime;
      });

      if (firstUnreadIndex !== -1) {
        initialScrollDoneRef.current = true;
        const lastIndex = messages.length - 1;
        if (firstUnreadIndex >= lastIndex) {
          isAtBottomRef.current = true;
          setIsAtBottom(true);
          setTimeout(scrollToEnd, 0);
          if (pendingReadRef.current) {
            executeMarkRead().catch(() => null);
          }
          return;
        }

        isAtBottomRef.current = false;
        setIsAtBottom(false);
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: firstUnreadIndex, animated: false, viewPosition: 0.2 });
        }, 0);
        return;
      }
    }

    initialScrollDoneRef.current = true;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setTimeout(() => {
      if (listRef.current && messages.length > 0) {
        // Fallback to end
        listRef.current.scrollToIndex({ index: messages.length - 1, animated: false, viewPosition: 1 });
      }
    }, 50);
  }, [messages.length, lastReadAtSelf, lastReadAt, hasMore, loadMoreMessages, scrollToEnd, messages, isFocused, getReadTimestamp, executeMarkRead]);

  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    if (pendingScrollRef.current) {
      const { previousHeight, previousOffset } = pendingScrollRef.current;
      const delta = height - previousHeight;
      listRef.current?.scrollToOffset({ offset: previousOffset + delta, animated: false });
      pendingScrollRef.current = null;
    }

    contentHeightRef.current = height;
  }, []);

  const handleSend = useCallback(async () => {
    if (!token || !conversationId) return;
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    try {
      setIsSending(true);
      setInputValue('');
      const response = await conversationService.sendMessage(token, conversationId, trimmed);
      const message = response.data;
      if (message) {
        setMessages((prev) => {
          const exists = prev.some((item) => item.id === message.id);
          return exists ? prev : [...prev, message];
        });
        updateMessageStatus(message.id, 'sent');
      }
    } finally {
      setIsSending(false);
    }
  }, [token, conversationId, inputValue, isSending]);

  const renderMessage = ({ item }: { item: ConversationMessage }) => {
    const isOwnMessage = item.senderId === user?.id;
    const status = isOwnMessage ? messageStatusMap[item.id] : undefined;
    const statusIcon = status ? getStatusIcon(status) : null;
    const statusColor = getStatusColor(status);

    return (
      <View style={[styles.messageRow, isOwnMessage ? styles.messageRight : styles.messageLeft]}>
        {isOwnMessage ? (
          <LinearGradient
            colors={[colors.primary, (colors as any).secondary || colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.messageBubble,
              {
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
              {item.content}
            </Text>
            <View style={styles.messageMeta}>
              <Text style={[styles.messageTime, { color: '#FFFFFF80' }]}> 
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {statusIcon && (
                <Ionicons
                  name={statusIcon}
                  size={12}
                  color={statusColor}
                  style={styles.messageStatusIcon}
                />
              )}
            </View>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.messageBubble,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.messageText, { color: colors.text }]}>
              {item.content}
            </Text>
            <View style={styles.messageMeta}>
              <Text style={[styles.messageTime, { color: colors.subtleText }]}> 
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const showStatus = presence?.online ? ar.online : formatLastSeen(presence?.lastSeen || null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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

      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image
            source={participant?.avatar ? { uri: participant.avatar } : require('../../assets/icon.png')}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtleText }]}>{showStatus}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            ListHeaderComponent={
              isLoadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}

        <View 
          style={[styles.inputRow, { 
            borderTopColor: colors.cardBorder,
            paddingBottom:
              Math.max(insets.bottom + 10, 20) +
              (Platform.OS === 'android' ? keyboardHeight : 0),
          }]}
        >
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={ar.typeMessage}
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingMore: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  messageRow: {
    marginBottom: 12,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
  },
  messageTime: {
    marginTop: 6,
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  messageStatusIcon: {
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});