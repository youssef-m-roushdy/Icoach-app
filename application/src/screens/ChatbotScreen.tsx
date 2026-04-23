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
  Animated,
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

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const SUGGESTIONS = ['💪 Workout Plan', '🥗 Nutrition Tips', '🎯 Set Goals', '📊 Check Progress'];
const STREAMING_MSG_ID = 'ai-streaming';

// Typewriter speed: characters rendered per tick
const TYPEWRITER_CHARS_PER_TICK = 3;
// Milliseconds between each typewriter tick
const TYPEWRITER_INTERVAL_MS = 16;

// ============================================================================
// Utility: Strip common markdown formatting from AI responses
// ============================================================================

const stripMarkdown = (text: string): string =>
  text
    // ── Fenced code blocks & inline code ──
    .replace(/```[\s\S]*?```/g, '')                // Fenced code blocks
    .replace(/`([^`]+)`/g, '$1')                   // Inline code: `text`
    // ── Bold + italic combos ──
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')         // ***text***
    .replace(/___(.+?)___/gs, '$1')                // ___text___
    // ── Bold ──
    .replace(/\*\*(.+?)\*\*/gs, '$1')             // **text**
    .replace(/__(.+?)__/gs, '$1')                  // __text__
    // ── Italic ──
    .replace(/\*(.+?)\*/gs, '$1')                  // *text*
    .replace(/_([^_\n]+)_/g, '$1')                 // _text_
    // ── Strikethrough ──
    .replace(/~~(.+?)~~/gs, '$1')                  // ~~text~~
    // ── Headings (also handles *# or **# combos) ──
    .replace(/^[\s*_]*#{1,6}\s+/gm, '')            // # Heading (with leading * or _)
    // ── Links ──
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // [text](url)
    // ── List items ──
    .replace(/^[-*+]\s+/gm, '• ')                  // Unordered list → bullet char
    .replace(/^\d+\.\s+/gm, '')                    // Ordered list numbers
    // ── Blockquotes & rules ──
    .replace(/^>\s+/gm, '')                        // Blockquotes
    .replace(/^---+$/gm, '')                       // Horizontal rules
    // ── Stray markdown characters left after all replacements ──
    .replace(/\*{1,3}/g, '')                       // Lone asterisks (*, **, ***)
    // ── Whitespace cleanup ──
    .replace(/\n{3,}/g, '\n\n')                    // Collapse excessive blank lines
    .trim();

// ============================================================================
// Component: Animated three-dot typing indicator (WhatsApp style)
// ============================================================================

const TypingDots = React.memo(({ color }: { color: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Each dot bounces upward then returns, staggered by 140ms
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 260, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay(420),
        ])
      );

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 140);
    const a3 = animateDot(dot3, 280);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingDotsContainer}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { backgroundColor: color, transform: [{ translateY: dot }] },
          ]}
        />
      ))}
    </View>
  );
});

// ============================================================================
// Main Screen Component
// ============================================================================

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

  // Modal states — following the Profile screen pattern
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showClearChatSuccess, setShowClearChatSuccess] = useState(false);
  const [showClearChatError, setShowClearChatError] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Core refs
  const sessionIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const historyLoadedRef = useRef(false);

  // Typewriter refs — hold pending text and the running interval
  const pendingTextRef = useRef('');
  const rawAccumulatedRef = useRef('');  // Raw text accumulated so far (before markdown stripping)
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDoneStreamingRef = useRef(false);
  const hasReceivedChunksRef = useRef(false);

  // -------------------------------------------------------------------------
  // Helpers: scroll
  // -------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // -------------------------------------------------------------------------
  // Helpers: finalise streaming bubble (give it a permanent id and status)
  // -------------------------------------------------------------------------

  const finaliseStreamingBubble = useCallback((status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === STREAMING_MSG_ID
          ? { ...m, id: `ai-${Date.now()}`, status }
          : m
      )
    );
  }, []);

  // -------------------------------------------------------------------------
  // Typewriter engine
  // Drains pendingTextRef character-by-character into the streaming bubble.
  // When the stream is finished AND the queue is empty, it finalises the bubble.
  // -------------------------------------------------------------------------

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  }, []);

  const startTypewriter = useCallback(() => {
    // Avoid spawning a second interval if one is already running
    if (typewriterTimerRef.current) return;

    typewriterTimerRef.current = setInterval(() => {
      // Nothing left in the queue
      if (pendingTextRef.current.length === 0) {
        if (isDoneStreamingRef.current) {
          // Stream finished and queue drained — wrap up
          stopTypewriter();
          finaliseStreamingBubble('done');
          setIsStreaming(false);
          setStatusText('');
          isDoneStreamingRef.current = false;
          scrollToBottom();
        }
        return;
      }

      // Pop a small batch of characters for a smooth, natural feel
      const chars = pendingTextRef.current.substring(0, TYPEWRITER_CHARS_PER_TICK);
      pendingTextRef.current = pendingTextRef.current.substring(TYPEWRITER_CHARS_PER_TICK);

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === STREAMING_MSG_ID);
        // Accumulate the raw text and strip the FULL string every tick.
        // This ensures markdown tokens that span chunks are caught.
        rawAccumulatedRef.current += chars;
        const stripped = stripMarkdown(rawAccumulatedRef.current);

        if (idx === -1) {
          // Bubble doesn't exist yet — create it
          return [
            ...prev,
            {
              id: STREAMING_MSG_ID,
              text: stripped,
              sender: 'ai',
              timestamp: new Date(),
              status: 'streaming',
            },
          ];
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          text: stripped,
          statusText: undefined,
          status: 'streaming',
        };
        return updated;
      });
    }, TYPEWRITER_INTERVAL_MS);
  }, [stopTypewriter, finaliseStreamingBubble, scrollToBottom]);

  // -------------------------------------------------------------------------
  // Helpers: streaming bubble management
  // -------------------------------------------------------------------------

  /** Creates the streaming bubble if it doesn't already exist */
  const ensureStreamingBubble = useCallback((initialStatusText?: string) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === STREAMING_MSG_ID)) return prev;
      return [
        ...prev,
        {
          id: STREAMING_MSG_ID,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          status: 'streaming',
          statusText: initialStatusText,
        },
      ];
    });
  }, []);

  /** Updates the status text shown inside the thinking bubble */
  const updateBubbleStatusText = useCallback((text: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === STREAMING_MSG_ID
          ? { ...m, statusText: text, status: 'streaming' }
          : m
      )
    );
  }, []);

  /** Appends a plain error bubble to the list */
  const addErrorMessage = useCallback((errorText: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        text: `❌ ${errorText}`,
        sender: 'ai',
        timestamp: new Date(),
        status: 'error',
      },
    ]);
  }, []);

  // -------------------------------------------------------------------------
  // Android hardware back button — close any open modal first
  // -------------------------------------------------------------------------

  useEffect(() => {
    const backAction = () => {
      if (
        showClearChatConfirm ||
        showClearChatSuccess ||
        showClearChatError ||
        showSessionExpiredModal ||
        showRateLimitModal
      ) {
        setShowClearChatConfirm(false);
        setShowClearChatSuccess(false);
        setShowClearChatError(false);
        setShowSessionExpiredModal(false);
        setShowRateLimitModal(false);
        return true; // Consume the back press
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [
    showClearChatConfirm,
    showClearChatSuccess,
    showClearChatError,
    showSessionExpiredModal,
    showRateLimitModal,
  ]);

  // Clean up the typewriter interval on unmount
  useEffect(() => () => stopTypewriter(), [stopTypewriter]);

  // -------------------------------------------------------------------------
  // Load chat history on mount
  // Messages are sorted ascending by createdAt so the oldest appears at the
  // top and the newest at the bottom — matching normal chat conventions.
  // -------------------------------------------------------------------------

  const loadChatHistory = useCallback(async () => {
    if (!token || isLoadingHistory || historyLoadedRef.current) return;

    setIsLoadingHistory(true);
    try {
      const response = await chatService.getHistory(token, { limit: 50 });

      if (response.success && response.data?.messages && response.data.messages.length > 0) {
        // Sort ascending by id AND createdAt: oldest message first, newest
        // last (bottom of list). Using id as primary sort key ensures
        // correct ordering even when timestamps share the same second.
        const sorted = [...response.data.messages].sort((a, b) => {
          const timeDiff =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return timeDiff !== 0 ? timeDiff : a.id - b.id;
        });

        const historyMessages: Message[] = sorted.map((msg) => ({
          id: `msg-${msg.id}`,
          // Strip markdown from AI messages loaded from history so they
          // display the same way as freshly-streamed messages.
          text: msg.role === 'user' ? msg.content : stripMarkdown(msg.content),
          sender: msg.role === 'user' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt),
          status: 'done' as MessageStatus,
        }));

        // Restore session id from the most recent message
        const lastMsg = sorted[sorted.length - 1];
        if (lastMsg) sessionIdRef.current = lastMsg.session_id;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Clear chat
  // -------------------------------------------------------------------------

  const proceedClearChat = async () => {
    setShowClearChatConfirm(false);

    // Stop any in-progress typewriter before resetting state
    stopTypewriter();
    pendingTextRef.current = '';
    rawAccumulatedRef.current = '';
    isDoneStreamingRef.current = false;

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
        console.error('Failed to clear history on server:', error);
        setErrorMessage('Failed to clear chat history. Please try again.');
        setShowClearChatError(true);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async () => {
    const content = inputText.trim();
    if (!content || isStreaming) return;

    // Append user bubble immediately
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

    // Reset typewriter state for this new turn
    stopTypewriter();
    pendingTextRef.current = '';
    rawAccumulatedRef.current = '';
    isDoneStreamingRef.current = false;
    hasReceivedChunksRef.current = false;

    try {
      if (!token) throw new Error('Not authenticated');

      await chatService.sendMessage(
        content,
        token,
        (event: ChatStreamEvent) => {
          switch (event.type) {

            // Backend is processing — show animated dots + status label
            case 'status':
              setStatusText(event.message);
              ensureStreamingBubble(event.message);
              updateBubbleStatusText(event.message);
              scrollToBottom();
              break;

            // A text chunk arrived — queue raw text for the typewriter.
            // Markdown is stripped when the accumulated text is rendered
            // so that tokens spanning multiple chunks are handled correctly.
            case 'chunk': {
              hasReceivedChunksRef.current = true;
              setStatusText('');
              pendingTextRef.current += event.text;
              ensureStreamingBubble();
              startTypewriter();
              break;
            }

            // Stream finished — signal the typewriter to finalise when queue drains
            case 'done':
              if (event.session_id) sessionIdRef.current = event.session_id;
              if (!hasReceivedChunksRef.current) {
                // No text chunks were received; show a default reply
                pendingTextRef.current = "I'm here to help! What would you like to know?";
                ensureStreamingBubble();
                startTypewriter();
              }
              isDoneStreamingRef.current = true;
              break;

            // Server or network error during stream
            case 'error':
              stopTypewriter();
              setMessages((prev) => prev.filter((m) => m.id !== STREAMING_MSG_ID));
              addErrorMessage(event.message);
              setIsStreaming(false);
              setStatusText('');
              break;
          }
        },
        sessionIdRef.current || undefined
      );
    } catch (err: any) {
      stopTypewriter();
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
  }, [
    inputText,
    isStreaming,
    token,
    ensureStreamingBubble,
    updateBubbleStatusText,
    startTypewriter,
    stopTypewriter,
    scrollToBottom,
    addErrorMessage,
  ]);

  // -------------------------------------------------------------------------
  // Render a single message bubble
  // -------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isAI = item.sender === 'ai';
      const isError = item.status === 'error';

      // Show animated dots when the bubble exists but has no visible text yet
      const isThinking =
        item.status === 'streaming' && item.text === '' && !isError;

      return (
        <View
          style={[
            styles.messageContainer,
            isAI ? styles.aiMessageContainer : styles.userMessageContainer,
          ]}
        >
          {isAI && (
            <View
              style={[
                styles.aiAvatar,
                { backgroundColor: isError ? '#FF555520' : `${colors.primary}15` },
              ]}
            >
              <MaterialCommunityIcons
                name="robot"
                size={20}
                color={isError ? '#FF5555' : colors.primary}
              />
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isAI
                ? [
                    styles.aiBubble,
                    {
                      backgroundColor: colors.authInputBg || colors.surface,
                      borderColor: isError
                        ? '#FF555540'
                        : colors.authInputBorder || colors.cardBorder,
                    },
                  ]
                : [styles.userBubble, { backgroundColor: colors.primary }],
            ]}
          >
            {isThinking ? (
              // Three animated dots — visible while waiting for the first chunk
              <TypingDots color={colors.primary} />
            ) : (
              <>
                <Text
                  style={[
                    styles.messageText,
                    isAI
                      ? { color: isError ? '#FF5555' : colors.text }
                      : { color: '#FFFFFF' },
                  ]}
                >
                  {item.text}
                  {/* Blinking cursor shown while text is still streaming in */}
                  {item.status === 'streaming' && item.text !== '' && (
                    <Text style={{ color: colors.primary }}> ▌</Text>
                  )}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    isAI ? { color: colors.textSecondary } : { color: '#FFFFFF90' },
                  ]}
                >
                  {item.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </>
            )}
          </View>
        </View>
      );
    },
    [colors]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
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
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {isLoadingHistory
                ? 'Loading history...'
                : statusText
                ? statusText
                : isStreaming
                ? 'Typing...'
                : 'Online • Always here to help'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowClearChatConfirm(true)}
          style={styles.headerIcon}
        >
          <Feather name="trash-2" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading your conversations...
            </Text>
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

        {/* Quick suggestion chips — hidden while streaming or loading */}
        {!isStreaming && !isLoadingHistory && messages.length > 1 && (
          <View
            style={[
              styles.suggestionsContainer,
              { backgroundColor: colors.surface + '95' },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: colors.authInputBorder || colors.cardBorder,
                    },
                  ]}
                  onPress={() =>
                    setInputText(suggestion.split(' ').slice(1).join(' '))
                  }
                >
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.authInputBg || colors.surface,
              borderTopColor: colors.authInputBorder || colors.cardBorder,
              paddingBottom:
                Math.max(insets.bottom + 10, 20) +
                (Platform.OS === 'android' ? keyboardHeight : 0),
            },
          ]}
        >
          {/* Placeholder for attach button — kept as empty touchable */}
          <TouchableOpacity style={styles.attachButton} disabled={isStreaming} />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.authInputBorder || colors.cardBorder,
              },
            ]}
            placeholder={
              isStreaming
                ? 'AI is replying...'
                : 'Ask me anything about fitness...'
            }
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !isStreaming
                    ? colors.primary
                    : colors.textSecondary + '50',
              },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* Confirm clear */}
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

      {/* Clear success */}
      <SuccessModal
        visible={showClearChatSuccess}
        title="Chat Cleared"
        message="Your conversation history has been successfully cleared."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowClearChatSuccess(false)}
        iconName="checkmark-circle"
      />

      {/* Clear error */}
      <SuccessModal
        visible={showClearChatError}
        title="Error"
        message={errorMessage}
        primaryButtonText="OK"
        onPrimaryPress={() => setShowClearChatError(false)}
        iconName="alert-circle"
      />

      {/* Session expired */}
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

      {/* Rate limit */}
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

// ============================================================================
// Styles
// ============================================================================

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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, maxWidth: 200 },
  headerIcon: { padding: 8 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 20 },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  aiMessageContainer: { justifyContent: 'flex-start' },
  userMessageContainer: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  aiBubble: { borderWidth: 1, borderTopLeftRadius: 4 },
  userBubble: { borderTopRightRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

  // Animated typing dots
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 5,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: { padding: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: '500' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
});