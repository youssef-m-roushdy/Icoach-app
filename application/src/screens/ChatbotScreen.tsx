// screens/ChatbotScreen.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  Animated,
  Clipboard,
  Vibration,
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
import ar from '../../i18n/locales/ar.json';

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
// Constants – translated suggestions
// ============================================================================

const SUGGESTIONS = [
  ar.suggestionWorkoutPlan,
  ar.suggestionNutritionTips,
  ar.suggestionSetGoals,
  ar.suggestionCheckProgress,
];

const STREAMING_MSG_ID = 'ai-streaming';
const NEAR_BOTTOM_THRESHOLD = 100;
const MAX_INPUT_LENGTH = 500;
const CHAR_WARN_THRESHOLD = 400;

const TYPEWRITER_CHARS_PER_TICK = 3;
const TYPEWRITER_INTERVAL_MS = 16;

// ============================================================================
// Utility: Strip common markdown formatting from AI responses
// ============================================================================

const stripMarkdown = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')
    .replace(/___(.+?)___/gs, '$1')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~(.+?)~~/gs, '$1')
    .replace(/^[\s*_]*#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\*{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ============================================================================
// Utility: Relative timestamp (localized)
// ============================================================================

const formatRelativeTime = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return ar.justNow;
  if (diff < 3600) return `${Math.floor(diff / 60)}${ar.minutesAgo}`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ============================================================================
// Component: Animated three-dot typing indicator
// ============================================================================

const TypingDots = React.memo(({ color }: { color: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingDotsContainer}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { backgroundColor: color, transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
});

// ============================================================================
// Component: Animated blinking cursor
// ============================================================================

const BlinkingCursor = React.memo(({ color }: { color: string }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={{ color, opacity, fontSize: 15, lineHeight: 22 }}> ▌</Animated.Text>
  );
});

// ============================================================================
// Component: Copy toast notification
// ============================================================================

const CopyToast = React.memo(({ visible, color }: { visible: boolean; color: string }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 10, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.copyToast,
        { backgroundColor: color, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name="checkmark" size={12} color="#fff" />
      <Text style={styles.copyToastText}>{ar.copied}</Text>
    </Animated.View>
  );
});

// ============================================================================
// Component: Welcome / Empty state
// ============================================================================

const WelcomeState = React.memo(
  ({
    colors,
    onSuggestion,
  }: {
    colors: any;
    onSuggestion: (text: string) => void;
  }) => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeAvatarWrapper}>
        <View style={[styles.pulseRing, styles.pulseRingOuter, { borderColor: `${colors.primary}18` }]} />
        <View style={[styles.pulseRing, styles.pulseRingInner, { borderColor: `${colors.primary}30` }]} />
        <View style={[styles.welcomeAvatar, { backgroundColor: `${colors.primary}18` }]}>
          <MaterialCommunityIcons name="robot-happy" size={36} color={colors.primary} />
        </View>
      </View>

      <Text style={[styles.welcomeTitle, { color: colors.text }]}>{ar.aiCoach}</Text>
      <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
        {ar.chatbotWelcomeSubtitle}
      </Text>

      <View style={styles.welcomeChipsGrid}>
        {SUGGESTIONS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.welcomeChip,
              {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}30`,
              },
            ]}
            onPress={() => onSuggestion(s.split(' ').slice(1).join(' '))}
            activeOpacity={0.7}
          >
            <Text style={[styles.welcomeChipEmoji]}>{s.split(' ')[0]}</Text>
            <Text style={[styles.welcomeChipText, { color: colors.primary }]}>
              {s.split(' ').slice(1).join(' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
);

// ============================================================================
// Main Screen Component
// ============================================================================

export default function ChatbotScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
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
  const isLoadingHistoryRef = useRef(false);

  // Typewriter refs
  const pendingTextRef = useRef('');
  const rawAccumulatedRef = useRef('');
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDoneStreamingRef = useRef(false);
  const hasReceivedChunksRef = useRef(false);

  // Scroll to bottom FAB animation
  const fabOpacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------------------
  // Show/hide scroll-to-bottom FAB
  // -------------------------------------------------------------------------

  useEffect(() => {
    Animated.timing(fabOpacity, {
      toValue: isNearBottom ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isNearBottom, fabOpacity]);

  // -------------------------------------------------------------------------
  // Helpers: scroll
  // -------------------------------------------------------------------------

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 100);
  }, []);

  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: any }) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      const distFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setIsNearBottom(distFromBottom <= NEAR_BOTTOM_THRESHOLD);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Helpers: finalise streaming bubble
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
  // -------------------------------------------------------------------------

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  }, []);

  const startTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) return;

    typewriterTimerRef.current = setInterval(() => {
      if (pendingTextRef.current.length === 0) {
        if (isDoneStreamingRef.current) {
          stopTypewriter();
          finaliseStreamingBubble('done');
          setIsStreaming(false);
          setStatusText('');
          isDoneStreamingRef.current = false;
          scrollToBottom();
        }
        return;
      }

      const chars = pendingTextRef.current.substring(0, TYPEWRITER_CHARS_PER_TICK);
      pendingTextRef.current = pendingTextRef.current.substring(TYPEWRITER_CHARS_PER_TICK);

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === STREAMING_MSG_ID);
        rawAccumulatedRef.current += chars;
        const stripped = stripMarkdown(rawAccumulatedRef.current);

        if (idx === -1) {
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
        updated[idx] = { ...updated[idx], text: stripped, statusText: undefined, status: 'streaming' };
        return updated;
      });
    }, TYPEWRITER_INTERVAL_MS);
  }, [stopTypewriter, finaliseStreamingBubble, scrollToBottom]);

  // -------------------------------------------------------------------------
  // Helpers: streaming bubble management
  // -------------------------------------------------------------------------

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

  const updateBubbleStatusText = useCallback((text: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === STREAMING_MSG_ID ? { ...m, statusText: text, status: 'streaming' } : m
      )
    );
  }, []);

  const addErrorMessage = useCallback(
    (errorText: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: errorText,
          sender: 'ai',
          timestamp: new Date(),
          status: 'error',
        },
      ]);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Long-press: copy message
  // -------------------------------------------------------------------------

  const handleLongPress = useCallback(
    (item: Message) => {
      if (item.status === 'streaming' || !item.text) return;
      Clipboard.setString(item.text);
      Vibration.vibrate(40);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Android back button
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
        return true;
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

  useEffect(() => () => stopTypewriter(), [stopTypewriter]);

  // -------------------------------------------------------------------------
  // Load chat history
  // -------------------------------------------------------------------------

  const loadChatHistory = useCallback(async () => {
    if (!token || isLoadingHistoryRef.current || historyLoadedRef.current) return;

    isLoadingHistoryRef.current = true;
    setIsLoadingHistory(true);
    try {
      const response = await chatService.getHistory(token, { limit: 50 });

      if (response.success && response.data?.messages && response.data.messages.length > 0) {
        const sorted = [...response.data.messages].sort((a, b) => {
          const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return timeDiff !== 0 ? timeDiff : a.id - b.id;
        });

        const historyMessages: Message[] = sorted.map((msg) => ({
          id: `msg-${msg.id}`,
          text: msg.role === 'user' ? msg.content : stripMarkdown(msg.content),
          sender: msg.role === 'user' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt),
          status: 'done' as MessageStatus,
        }));

        const lastMsg = sorted[sorted.length - 1];
        if (lastMsg) sessionIdRef.current = lastMsg.session_id;

        setMessages(historyMessages);
        historyLoadedRef.current = true;
        setTimeout(() => scrollToBottom(false), 500);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
      isLoadingHistoryRef.current = false;
    }
  }, [token, scrollToBottom]);

  useEffect(() => {
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Clear chat
  // -------------------------------------------------------------------------

  const proceedClearChat = async () => {
    setShowClearChatConfirm(false);
    stopTypewriter();
    pendingTextRef.current = '';
    rawAccumulatedRef.current = '';
    isDoneStreamingRef.current = false;

    setMessages([]);
    sessionIdRef.current = null;
    historyLoadedRef.current = false;

    if (token) {
      try {
        await chatService.clearHistory(token);
        setShowClearChatSuccess(true);
      } catch (error) {
        console.error('Failed to clear history on server:', error);
        setErrorMessage(ar.clearChatError);
        setShowClearChatError(true);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const content = (overrideText ?? inputText).trim();
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
              case 'status':
                setStatusText(event.message);
                ensureStreamingBubble(event.message);
                updateBubbleStatusText(event.message);
                scrollToBottom();
                break;

              case 'chunk': {
                hasReceivedChunksRef.current = true;
                setStatusText('');
                pendingTextRef.current += event.text;
                ensureStreamingBubble();
                startTypewriter();
                break;
              }

              case 'done':
                if (event.session_id) sessionIdRef.current = event.session_id;
                if (!hasReceivedChunksRef.current) {
                  pendingTextRef.current = ar.fallbackAiResponse;
                  ensureStreamingBubble();
                  startTypewriter();
                }
                isDoneStreamingRef.current = true;
                break;

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
          addErrorMessage(ar.sendMessageFailed);
        }
        setIsStreaming(false);
        setStatusText('');
      }
    },
    [
      inputText,
      isStreaming,
      token,
      ensureStreamingBubble,
      updateBubbleStatusText,
      startTypewriter,
      stopTypewriter,
      scrollToBottom,
      addErrorMessage,
    ]
  );

  // Quick suggestion tap → send immediately
  const handleSuggestionTap = useCallback(
    (suggestion: string) => {
      const text = suggestion.split(' ').slice(1).join(' ');
      setInputText(text);
      setTimeout(() => sendMessage(text), 50);
    },
    [sendMessage]
  );

  // -------------------------------------------------------------------------
  // Determine if two consecutive messages should be grouped
  // -------------------------------------------------------------------------

  const isGrouped = useCallback(
    (index: number, item: Message): boolean => {
      if (index === 0) return false;
      const prev = messages[index - 1];
      if (!prev || prev.sender !== item.sender) return false;
      const diff = item.timestamp.getTime() - prev.timestamp.getTime();
      return diff < 120_000;
    },
    [messages]
  );

  // -------------------------------------------------------------------------
  // Render a single message bubble
  // -------------------------------------------------------------------------

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isAI = item.sender === 'ai';
      const isError = item.status === 'error';
      const grouped = isGrouped(index, item);

      const isThinking = item.status === 'streaming' && item.text === '' && !isError;
      const isCopied = copiedId === item.id;

      return (
        <View
          style={[
            styles.messageContainer,
            isAI ? styles.aiMessageContainer : styles.userMessageContainer,
            grouped && styles.messageContainerGrouped,
          ]}
        >
          {isAI && (
            <View style={[styles.aiAvatarSlot]}>
              {!grouped && (
                <View
                  style={[
                    styles.aiAvatar,
                    { backgroundColor: isError ? '#FF555520' : `${colors.primary}18` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="robot"
                    size={18}
                    color={isError ? '#FF5555' : colors.primary}
                  />
                </View>
              )}
            </View>
          )}

          <TouchableWithoutFeedback
            onLongPress={() => handleLongPress(item)}
            delayLongPress={400}
          >
            {isAI ? (
              <View
                style={[
                  styles.messageBubble,
                  styles.aiBubble,
                  {
                    backgroundColor: colors.authInputBg || colors.surface,
                    borderColor: isError
                      ? '#FF555540'
                      : colors.authInputBorder || colors.cardBorder,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  },
                ]}
              >
                {isThinking ? (
                  <TypingDots color={colors.primary} />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.messageText,
                        { color: isError ? '#FF5555' : colors.text },
                      ]}
                    >
                      {item.text}
                      {item.status === 'streaming' && item.text !== '' && (
                        <BlinkingCursor color={colors.primary} />
                      )}
                    </Text>

                    <View style={styles.timestampRow}>
                      {isCopied && (
                        <Text style={[styles.copiedHint, { color: colors.primary }]}>
                          {ar.copied}
                        </Text>
                      )}
                      <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                        {formatRelativeTime(item.timestamp)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <LinearGradient
                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.messageBubble,
                  styles.userBubble,
                  {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
                  {item.text}
                </Text>

                <View style={styles.timestampRow}>
                  {isCopied && (
                    <Text style={[styles.copiedHint, { color: '#FFFFFF90' }]}>
                      {ar.copied}
                    </Text>
                  )}
                  <Text style={[styles.timestamp, { color: '#FFFFFF80' }]}>
                    {formatRelativeTime(item.timestamp)}
                  </Text>
                  {item.status === 'done' && (
                    <Ionicons name="checkmark-done" size={12} color="#FFFFFF80" style={{ marginLeft: 2 }} />
                  )}
                </View>
              </LinearGradient>
            )}
          </TouchableWithoutFeedback>
        </View>
      );
    },
    [colors, copiedId, handleLongPress, isGrouped]
  );

  const showWelcome = !isLoadingHistory && messages.length === 0;
  const showSuggestions = !isStreaming && !isLoadingHistory && messages.length > 0;
  const charsLeft = MAX_INPUT_LENGTH - inputText.length;
  const showCharCount = inputText.length >= CHAR_WARN_THRESHOLD;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.surface + 'F0', borderBottomColor: colors.authInputBorder || colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: `${colors.primary}18` }]}>
            <MaterialCommunityIcons name="robot-happy" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{ar.aiCoach}</Text>
            <View style={styles.headerStatusRow}>
              {!isStreaming && !isLoadingHistory && (
                <View style={[styles.onlineDot, { backgroundColor: '#22C55E' }]} />
              )}
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {isLoadingHistory
                  ? ar.loadingHistory
                  : statusText
                  ? statusText
                  : isStreaming
                  ? ar.typing
                  : ar.onlineAlwaysHere}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowClearChatConfirm(true)}
          style={styles.headerBtn}
        >
          <Feather name="trash-2" size={19} color={colors.textSecondary} />
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
              {ar.loadingConversations}
            </Text>
          </View>
        ) : showWelcome ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <WelcomeState colors={colors} onSuggestion={handleSuggestionTap} />
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            onContentSizeChange={() => isNearBottom && scrollToBottom()}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {!showWelcome && (
          <Animated.View
            pointerEvents={isNearBottom ? 'none' : 'auto'}
            style={[styles.fabScrollBottom, { backgroundColor: colors.primary, opacity: fabOpacity }]}
          >
            <TouchableOpacity onPress={() => scrollToBottom()} style={styles.fabScrollBottomInner}>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {showSuggestions && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface + 'F0', borderTopColor: colors.authInputBorder || colors.cardBorder }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: `${colors.primary}10`,
                      borderColor: `${colors.primary}30`,
                    },
                  ]}
                  onPress={() => handleSuggestionTap(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionEmoji}>{suggestion.split(' ')[0]}</Text>
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>
                    {suggestion.split(' ').slice(1).join(' ')}
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
              backgroundColor: colors.surface + 'F8',
              borderTopColor: colors.authInputBorder || colors.cardBorder,
              paddingBottom:
                Math.max(insets.bottom + 10, 20) +
                (Platform.OS === 'android' ? keyboardHeight : 0),
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            {showCharCount && (
              <Text
                style={[
                  styles.charCount,
                  { color: charsLeft <= 50 ? '#EF4444' : colors.textSecondary },
                ]}
              >
                {charsLeft}
              </Text>
            )}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: isStreaming
                    ? colors.authInputBorder || colors.cardBorder
                    : inputText.length > 0
                    ? colors.primary + '80'
                    : colors.authInputBorder || colors.cardBorder,
                },
              ]}
              placeholder={
                isStreaming ? ar.aiReplying : ar.askMeAnything
              }
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={MAX_INPUT_LENGTH}
              editable={!isStreaming}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !isStreaming
                    ? colors.primary
                    : colors.textSecondary + '40',
              },
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isStreaming}
            activeOpacity={0.8}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      <SuccessModal
        visible={showClearChatConfirm}
        title={ar.clearChatTitle}
        message={ar.clearChatMessage}
        primaryButtonText={ar.clear}
        onPrimaryPress={proceedClearChat}
        secondaryButtonText={ar.cancel}
        onSecondaryPress={() => setShowClearChatConfirm(false)}
        iconName="trash-bin"
      />

      <SuccessModal
        visible={showClearChatSuccess}
        title={ar.chatClearedTitle}
        message={ar.chatClearedMessage}
        primaryButtonText={ar.ok}
        onPrimaryPress={() => setShowClearChatSuccess(false)}
        iconName="checkmark-circle"
      />

      <SuccessModal
        visible={showClearChatError}
        title={ar.error}
        message={errorMessage}
        primaryButtonText={ar.ok}
        onPrimaryPress={() => setShowClearChatError(false)}
        iconName="alert-circle"
      />

      <SuccessModal
        visible={showSessionExpiredModal}
        title={ar.sessionExpiredTitle}
        message={ar.sessionExpiredMessage}
        primaryButtonText={ar.logIn}
        onPrimaryPress={() => {
          setShowSessionExpiredModal(false);
          navigation.navigate('Login' as never);
        }}
        iconName="alert-circle"
      />

      <SuccessModal
        visible={showRateLimitModal}
        title={ar.rateLimitExceededTitle}
        message={ar.rateLimitExceededMessage}
        primaryButtonText={ar.gotIt}
        onPrimaryPress={() => setShowRateLimitModal(false)}
        iconName="hourglass"
      />
    </View>
  );
}

// ============================================================================
// Styles (unchanged)
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerBtn: { padding: 8, borderRadius: 20 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  headerSubtitle: { fontSize: 11.5, flex: 1 },

  messagesList: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },

  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageContainerGrouped: { marginBottom: 4 },
  aiMessageContainer: { justifyContent: 'flex-start' },
  userMessageContainer: { justifyContent: 'flex-end' },

  aiAvatarSlot: {
    width: 32,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageBubble: {
    maxWidth: '76%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  aiBubble: { borderWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 4 },
  userBubble: { borderTopRightRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },

  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
    gap: 3,
  },
  timestamp: { fontSize: 10.5 },
  copiedHint: { fontSize: 10, fontWeight: '600', marginRight: 4 },

  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 5,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  fabScrollBottom: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  fabScrollBottomInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },

  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 5,
  },
  suggestionEmoji: { fontSize: 14 },
  suggestionText: { fontSize: 13, fontWeight: '500' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 4,
    marginRight: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 110,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },

  copyToast: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 20,
  },
  copyToastText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 14 },

  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  welcomeAvatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 1.5,
  },
  pulseRingOuter: { width: 90, height: 90 },
  pulseRingInner: { width: 70, height: 70 },
  welcomeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  welcomeSubtitle: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  welcomeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  welcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    minWidth: '44%',
    justifyContent: 'center',
  },
  welcomeChipEmoji: { fontSize: 16 },
  welcomeChipText: { fontSize: 13.5, fontWeight: '600' },
});