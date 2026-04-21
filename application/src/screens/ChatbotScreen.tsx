// screens/ChatbotScreen.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { chatService, ChatStreamEvent } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import SuccessModal from '../components/common/SuccessModal';

type MessageStatus = 'sent' | 'streaming' | 'done' | 'error';

type Message = {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  status?: MessageStatus;
  statusText?: string;
};

type Props = {
  navigation: NavigationProp<any>;
};

const SUGGESTIONS = ['💪 Workout Plan', '🥗 Nutrition Tips', '🎯 Set Goals', '📊 Check Progress'];
const STREAMING_MSG_ID = 'ai-streaming';

export default function ChatbotScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      text: "Hello! I'm your AI Coach. How can I help you with your fitness journey today?",
      sender: 'ai',
      timestamp: new Date(),
      status: 'done',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Modal states - following Profile screen pattern
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showClearChatSuccess, setShowClearChatSuccess] = useState(false);
  const [showClearChatError, setShowClearChatError] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const sessionIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const historyLoadedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const upsertStreamingBubble = useCallback(
    (updater: (prev: Message | undefined) => Partial<Message>) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === STREAMING_MSG_ID);
        if (existingIndex === -1) {
          const newMsg: Message = {
            id: STREAMING_MSG_ID,
            text: '',
            sender: 'ai',
            timestamp: new Date(),
            status: 'streaming',
            ...updater(undefined),
          };
          return [...prev, newMsg];
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...updater(updated[existingIndex]),
        };
        return updated;
      });
    },
    []
  );

  const finaliseStreamingBubble = useCallback((status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === STREAMING_MSG_ID ? { ...m, id: `ai-${Date.now()}`, status } : m
      )
    );
  }, []);

  const addErrorMessage = useCallback((errorText: string) => {
    const errorMsg: Message = {
      id: `error-${Date.now()}`,
      text: `❌ ${errorText}`,
      sender: 'ai',
      timestamp: new Date(),
      status: 'error',
    };
    setMessages((prev) => [...prev, errorMsg]);
  }, []);

  // Handle hardware back button - close modals first
  useEffect(() => {
    const backAction = () => {
      if (showClearChatConfirm || showClearChatSuccess || showClearChatError || showSessionExpiredModal || showRateLimitModal) {
        setShowClearChatConfirm(false);
        setShowClearChatSuccess(false);
        setShowClearChatError(false);
        setShowSessionExpiredModal(false);
        setShowRateLimitModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showClearChatConfirm, showClearChatSuccess, showClearChatError, showSessionExpiredModal, showRateLimitModal]);

  // Load chat history when screen opens
  const loadChatHistory = useCallback(async () => {
    if (!token || isLoadingHistory || historyLoadedRef.current) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await chatService.getHistory(token, { limit: 10 });
      
      if (response.success && response.data?.messages && response.data.messages.length > 0) {
        const historyMessages: Message[] = response.data.messages.map((msg) => ({
          id: `msg-${msg.id}`,
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt),
          status: 'done',
        }));
        
        const lastMessage = response.data.messages[response.data.messages.length - 1];
        if (lastMessage) {
          sessionIdRef.current = lastMessage.session_id;
        }
        
        setMessages(historyMessages);
        historyLoadedRef.current = true;
        setTimeout(() => scrollToBottom(), 500);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token, isLoadingHistory, scrollToBottom]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Proceed clear chat
  const proceedClearChat = async () => {
    setShowClearChatConfirm(false);
    
    setMessages([
      {
        id: 'welcome-1',
        text: "Hello! I'm your AI Coach. How can I help you?",
        sender: 'ai',
        timestamp: new Date(),
        status: 'done',
      },
    ]);
    sessionIdRef.current = null;
    historyLoadedRef.current = false;
    
    if (token) {
      try {
        await chatService.clearHistory(token);
        setShowClearChatSuccess(true);
      } catch (error) {
        console.error('Failed to clear history:', error);
        setErrorMessage('Failed to clear chat history. Please try again.');
        setShowClearChatError(true);
      }
    }
  };

  const sendMessage = useCallback(async () => {
    const content = inputText.trim();
    if (!content || isStreaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: content,
      sender: 'user',
      timestamp: new Date(),
      status: 'done',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsStreaming(true);
    setStatusText('');
    scrollToBottom();

    try {
      if (!token) throw new Error('Not authenticated');

      let hasReceivedChunks = false;

      const sessionId = await chatService.sendMessage(
        content,
        token,
        (event: ChatStreamEvent) => {
          switch (event.type) {
            case 'status':
              setStatusText(event.message);
              upsertStreamingBubble(() => ({
                text: '',
                statusText: event.message,
                status: 'streaming',
              }));
              scrollToBottom();
              break;
            case 'chunk':
              setStatusText('');
              hasReceivedChunks = true;
              upsertStreamingBubble((prev) => ({
                text: (prev?.text ?? '') + event.text,
                statusText: undefined,
                status: 'streaming',
              }));
              scrollToBottom();
              break;
            case 'done':
              if (event.session_id) sessionIdRef.current = event.session_id;
              if (!hasReceivedChunks) {
                upsertStreamingBubble(() => ({
                  text: "I'm here to help! What would you like to know?",
                  statusText: undefined,
                  status: 'streaming',
                }));
              }
              finaliseStreamingBubble('done');
              setIsStreaming(false);
              setStatusText('');
              scrollToBottom();
              break;
            case 'error':
              setMessages((prev) => prev.filter((m) => m.id !== STREAMING_MSG_ID));
              addErrorMessage(event.message);
              setIsStreaming(false);
              setStatusText('');
              break;
          }
        },
        sessionIdRef.current || undefined
      );

      if (sessionId && !sessionIdRef.current) {
        sessionIdRef.current = sessionId;
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== STREAMING_MSG_ID));
      
      if (err?.status === 401) {
        setShowSessionExpiredModal(true);
      } else if (err?.status === 429) {
        setShowRateLimitModal(true);
      } else {
        addErrorMessage('Failed to send message. Please try again.');
      }
      setIsStreaming(false);
      setStatusText('');
    }
  }, [inputText, isStreaming, token, upsertStreamingBubble, finaliseStreamingBubble, scrollToBottom, addErrorMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isAI = item.sender === 'ai';
      const isError = item.status === 'error';
      const isThinking = item.status === 'streaming' && item.text === '' && !isError;

      return (
        <View style={[styles.messageContainer, isAI ? styles.aiMessageContainer : styles.userMessageContainer]}>
          {isAI && (
            <View style={[styles.aiAvatar, { backgroundColor: isError ? '#FF555520' : `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="robot" size={20} color={isError ? '#FF5555' : colors.primary} />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isAI
                ? [styles.aiBubble, { backgroundColor: colors.authInputBg || colors.surface, borderColor: isError ? '#FF555540' : colors.authInputBorder || colors.cardBorder }]
                : [styles.userBubble, { backgroundColor: colors.primary }],
            ]}
          >
            {isThinking ? (
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.thinkingText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.statusText || 'Thinking...'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.messageText, isAI ? { color: isError ? '#FF5555' : colors.text } : { color: '#FFFFFF' }]}>
                  {item.text}
                  {item.status === 'streaming' && item.text !== '' && <Text style={{ color: colors.primary }}> ▌</Text>}
                </Text>
                <Text style={[styles.timestamp, isAI ? { color: colors.textSecondary } : { color: '#FFFFFF90' }]}>
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </>
            )}
          </View>
        </View>
      );
    },
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient colors={colors.authBgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.header, { backgroundColor: colors.surface + '95' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerAvatar, { backgroundColor: `${colors.primary}15` }]}>
            <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {isLoadingHistory ? 'Loading history...' : statusText ? statusText : isStreaming ? 'Replying...' : 'Online • Always here to help'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowClearChatConfirm(true)} style={styles.headerIcon}>
          <Feather name="trash-2" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your conversations...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            showsVerticalScrollIndicator={false}
          />
        )}

        {!isStreaming && !isLoadingHistory && messages.length > 1 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface + '95' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { backgroundColor: `${colors.primary}10`, borderColor: colors.authInputBorder || colors.cardBorder }]}
                  onPress={() => setInputText(suggestion.split(' ').slice(1).join(' '))}
                >
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.authInputBg || colors.surface,
              borderTopColor: colors.authInputBorder || colors.cardBorder,
              paddingBottom: Math.max(insets.bottom + 10, 20) + (Platform.OS === 'android' ? keyboardHeight : 0),
            },
          ]}
        >
          <TouchableOpacity style={styles.attachButton} disabled={isStreaming}>
            {/* <Ionicons name="add-circle-outline" size={28} color={isStreaming ? colors.textSecondary : colors.primary} /> */}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.authInputBorder || colors.cardBorder }]}
            placeholder={isStreaming ? 'AI is replying...' : 'Ask me anything about fitness...'}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() && !isStreaming ? colors.primary : colors.textSecondary + '50' }]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals - Following Profile screen pattern */}
      
      {/* Clear Chat Confirmation Modal */}
      <SuccessModal
        visible={showClearChatConfirm}
        title="Clear Chat"
        message="Are you sure you want to clear all messages? This action cannot be undone."
        primaryButtonText="Clear"
        onPrimaryPress={proceedClearChat}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setShowClearChatConfirm(false)}
        iconName="trash-bin"
      />

      {/* Clear Chat Success Modal */}
      <SuccessModal
        visible={showClearChatSuccess}
        title="Chat Cleared"
        message="Your conversation history has been successfully cleared."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowClearChatSuccess(false)}
        iconName="checkmark-circle"
      />

      {/* Clear Chat Error Modal */}
      <SuccessModal
        visible={showClearChatError}
        title="Error"
        message={errorMessage}
        primaryButtonText="OK"
        onPrimaryPress={() => setShowClearChatError(false)}
        iconName="alert-circle"
      />

      {/* Session Expired Modal */}
      <SuccessModal
        visible={showSessionExpiredModal}
        title="Session Expired"
        message="Your session has expired. Please log in again to continue."
        primaryButtonText="Log In"
        onPrimaryPress={() => {
          setShowSessionExpiredModal(false);
          navigation.navigate('Login' as never);
        }}
        iconName="alert-circle"
      />

      {/* Rate Limit Modal */}
      <SuccessModal
        visible={showRateLimitModal}
        title="Rate Limit Exceeded"
        message="Too many requests. Please wait a moment before sending another message."
        primaryButtonText="Got it"
        onPrimaryPress={() => setShowRateLimitModal(false)}
        iconName="hourglass"
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: { padding: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginHorizontal: 8 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, maxWidth: 200 },
  headerIcon: { padding: 8 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 20 },
  messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  aiMessageContainer: { justifyContent: 'flex-start' },
  userMessageContainer: { justifyContent: 'flex-end' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  aiBubble: { borderWidth: 1, borderTopLeftRadius: 4 },
  userBubble: { borderTopRightRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  thinkingText: { fontSize: 13, fontStyle: 'italic', flexShrink: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 8 },
  attachButton: { padding: 4 },
  input: { flex: 1, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  suggestionsContainer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'transparent' },
  suggestionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  suggestionText: { fontSize: 13, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
});