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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context';
import { conversationService, type ConversationMessage, type UserSummary, type PresenceState } from '../services/conversationService';
import { socketService } from '../services/socketService';

interface ChatThreadParams {
  conversationId: number;
  participant?: UserSummary;
}

export default function ChatThreadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user } = useAuth();

  const { conversationId, participant } = (route.params || {}) as ChatThreadParams;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [presence, setPresence] = useState<PresenceState | null>(null);

  const listRef = useRef<FlatList<ConversationMessage>>(null);

  const displayName = useMemo(() => {
    if (!participant) return 'Chat';
    return `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.username;
  }, [participant]);

  const formatLastSeen = useCallback((timestamp?: string | null) => {
    if (!timestamp) return 'Offline';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const isSameDay = now.toDateString() === date.toDateString();
    if (isSameDay) {
      return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;

    try {
      setIsLoading(true);
      const response = await conversationService.getMessages(token, conversationId, { limit: 100 });
      const list = response.data || [];
      setMessages(list);
      await conversationService.markRead(token, conversationId, new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, [token, conversationId]);

  const scrollToEnd = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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

      if (payload.message.senderId !== user?.id && token) {
        conversationService.markRead(token, conversationId, new Date().toISOString()).catch(() => null);
      }
    };

    const handlePresenceUpdate = (payload: PresenceState) => {
      if (participant && String(participant.id) === payload.userId) {
        setPresence(payload);
      }
    };

    socket.on('message:new', handleMessageNew);
    socket.on('presence:update', handlePresenceUpdate);

    if (participant) {
      socketService.emit('presence:watch', [participant.id]);
    }

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('presence:update', handlePresenceUpdate);
      socketService.emit('conversation:leave', conversationId);
      if (participant) {
        socketService.emit('presence:unwatch', [participant.id]);
      }
    };
  }, [conversationId, participant, token, user?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToEnd, 60);
    }
  }, [messages.length, scrollToEnd]);

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
      }
    } finally {
      setIsSending(false);
    }
  }, [token, conversationId, inputValue, isSending]);

  const renderMessage = ({ item }: { item: ConversationMessage }) => {
    const isOwnMessage = item.senderId === user?.id;

    return (
      <View style={[styles.messageRow, isOwnMessage ? styles.messageRight : styles.messageLeft]}>
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? colors.primary : colors.surface,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: isOwnMessage ? colors.background : colors.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isOwnMessage ? colors.background : colors.subtleText }]}> 
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const showStatus = presence?.online ? 'Online' : formatLastSeen(presence?.lastSeen || null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputRow, { borderTopColor: colors.cardBorder }]}
        >
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type a message"
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
              <ActivityIndicator color={colors.background} />
            ) : (
              <Ionicons name="send" size={18} color={colors.background} />
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
  messageTime: {
    marginTop: 6,
    fontSize: 10,
    alignSelf: 'flex-end',
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
