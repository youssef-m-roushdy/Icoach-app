// screens/ChatbotScreen.js
import React, { useState, useRef, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native'; // ✅ import NavigationProp
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

// ✅ Message type
type Message = {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
};

// ✅ Props type
type Props = {
  navigation: NavigationProp<any>;
};

export default function ChatbotScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI Coach. How can I help you with your fitness journey today?",
      sender: 'ai',
      timestamp: new Date(),
    },
    {
      id: '2',
      text: "I can help with workout plans, nutrition advice, motivation, or answer any questions about your progress.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  // ✅ Typed ref for FlatList
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [keyboardHeight]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = generateAIResponse(inputText.trim());
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  // ✅ Typed userInput param
  const generateAIResponse = (userInput: string): Message => {
    const lowerInput = userInput.toLowerCase();
    let responseText = '';

    if (lowerInput.includes('workout') || lowerInput.includes('exercise')) {
      responseText = "Based on your fitness level, I recommend starting with a mix of cardio and strength training. Would you like me to create a personalized weekly workout plan for you?";
    } else if (lowerInput.includes('diet') || lowerInput.includes('food') || lowerInput.includes('eat')) {
      responseText = "Nutrition is key to reaching your goals! Focus on lean proteins, complex carbs, and healthy fats. Remember to stay hydrated. Would you like meal suggestions?";
    } else if (lowerInput.includes('weight loss') || lowerInput.includes('lose weight')) {
      responseText = "For sustainable weight loss, combine a slight calorie deficit with regular exercise. I can help you calculate your daily calorie needs and suggest a plan. Shall we do that?";
    } else if (lowerInput.includes('muscle') || lowerInput.includes('gain')) {
      responseText = "Building muscle requires progressive overload in your workouts and adequate protein intake. Aim for 1.6-2.2g of protein per kg of body weight. Want a sample muscle-building routine?";
    } else if (lowerInput.includes('motivation') || lowerInput.includes('motivate')) {
      responseText = "Remember why you started! Small consistent actions lead to big results. You've got this! 💪 What's one small goal you can achieve today?";
    } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      responseText = "Hey there! Ready to crush your fitness goals today? How can I assist you?";
    } else {
      responseText = "Great question! To give you the best advice, could you tell me more about your specific fitness goals? I'm here to help with workouts, nutrition, or motivation!";
    }

    return {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: 'ai',
      timestamp: new Date(),
    };
  };

  // ✅ Typed item in renderMessage
  const renderMessage = ({ item }: { item: Message }) => {
    const isAI = item.sender === 'ai';
    return (
      <View style={[
        styles.messageContainer,
        isAI ? styles.aiMessageContainer : styles.userMessageContainer
      ]}>
        {isAI && (
          <View style={[styles.aiAvatar, { backgroundColor: `${colors.primary}15` }]}>
            <MaterialCommunityIcons name="robot" size={20} color={colors.primary} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isAI
            ? [styles.aiBubble, { backgroundColor: colors.authInputBg || colors.surface, borderColor: colors.authInputBorder || colors.cardBorder }]
            : [styles.userBubble, { backgroundColor: colors.primary }]
        ]}>
          <Text style={[
            styles.messageText,
            isAI ? { color: colors.text } : { color: '#FFFFFF' }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestamp,
            isAI ? { color: colors.textSecondary } : { color: '#FFFFFF90' }
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.authBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
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
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Online • Always here to help</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Feather name="more-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Chat Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList<Message>
          ref={flatListRef}
          style={{ flex: 1 }}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.typingContainer, { backgroundColor: colors.authInputBg || colors.surface }]}>
            <View style={[styles.typingAvatar, { backgroundColor: `${colors.primary}15` }]}>
              <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              </View>
            </View>
          </View>
        )}

        {/* Quick Suggestions */}
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface + '95' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['💪 Workout Plan', '🥗 Nutrition Tips', '🎯 Set Goals', '📊 Check Progress'].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionChip, {
                  backgroundColor: `${colors.primary}10`,
                  borderColor: colors.authInputBorder || colors.cardBorder
                }]}
                onPress={() => setInputText(suggestion.split(' ').slice(1).join(' '))}
              >
                <Text style={[styles.suggestionText, { color: colors.primary }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={[styles.inputContainer, {
          backgroundColor: colors.authInputBg || colors.surface,
          borderTopColor: colors.authInputBorder || colors.cardBorder,
          paddingBottom: Math.max(insets.bottom + 10, 20) + (Platform.OS === 'android' ? keyboardHeight : 0)
        }]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.authInputBorder || colors.cardBorder
            }]}
            placeholder="Ask me anything about fitness..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? colors.primary : colors.textSecondary + '50' }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerIcon: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
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
  aiBubble: {
    borderWidth: 1,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderTopLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: {
    padding: 4,
  },
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
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});