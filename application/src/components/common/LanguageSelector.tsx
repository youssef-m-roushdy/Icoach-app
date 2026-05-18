import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../../i18n/i18n';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
];

// Separate component for language item to use hooks properly
const LanguageItem = React.memo(({ 
  item, 
  index, 
  isSelected, 
  onSelect, 
  modalVisible,
  colors 
}: { 
  item: Language; 
  index: number; 
  isSelected: boolean; 
  onSelect: () => void; 
  modalVisible: boolean;
  colors: any;
}) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (modalVisible) {
      const itemDelay = index * 50;
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 300,
          delay: itemDelay,
          useNativeDriver: true,
        }),
        Animated.spring(itemSlideAnim, {
          toValue: 0,
          delay: itemDelay,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      itemFadeAnim.setValue(0);
      itemSlideAnim.setValue(20);
    }
  }, [modalVisible, index]);

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.languageOption,
          isSelected && {
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary,
            borderWidth: 1,
          },
        ]}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View style={styles.languageOptionContent}>
          <Text style={styles.languageFlag}>{item.flag}</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageOptionNative, { color: colors.text }]}>
              {item.nativeLabel}
            </Text>
            <Text style={[styles.languageOptionLabel, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const LanguageSelector: React.FC = () => {
  const { i18n: i18nInstance, t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  useEffect(() => {
    const currentLangCode = i18nInstance.language;
    const langItem = languages.find(l => l.code === currentLangCode);
    if (langItem) {
      setCurrentLanguage(langItem);
    }
  }, [i18nInstance.language]);

  const loadSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('appLanguage');
      if (savedLang) {
        const langItem = languages.find(l => l.code === savedLang);
        if (langItem) {
          setCurrentLanguage(langItem);
          await i18n.changeLanguage(savedLang);
        }
      } else {
        setCurrentLanguage(languages[0]);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
      setCurrentLanguage(languages[0]);
    }
  };

  const selectLanguage = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang.code);
      await AsyncStorage.setItem('appLanguage', lang.code);
      setCurrentLanguage(lang);
      await animateClose();
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const animateOpen = useCallback(() => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 50,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  }, [fadeAnim, scaleAnim, slideAnim]);

  const handleOpen = () => {
    animateOpen();
  };

  const handleClose = () => {
    animateClose();
  };

  const renderLanguageItem = ({ item, index }: { item: Language; index: number }) => {
    const isSelected = currentLanguage?.code === item.code;
    return (
      <LanguageItem
        item={item}
        index={index}
        isSelected={isSelected}
        onSelect={() => selectLanguage(item)}
        modalVisible={modalVisible}
        colors={colors}
      />
    );
  };

  if (!currentLanguage) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        style={[
          styles.selectorButton,
          {
            backgroundColor: (colors as any).authInputBg || colors.surface,
            borderColor: (colors as any).authInputBorder || colors.border,
            shadowColor: colors.shadow,
          },
        ]}
        activeOpacity={0.8}
      >
        <Text style={styles.selectorFlag}>{currentLanguage.flag}</Text>
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {currentLanguage.nativeLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: isDarkMode
                ? 'rgba(0, 0, 0, 0.85)'
                : 'rgba(0, 0, 0, 0.5)',
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
          
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: (colors as any).authCardBg || colors.card,
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <Ionicons name="language" size={28} color="#FFFFFF" />
                <Text style={styles.headerTitle}>{t('selectLanguage') || 'Select Language'}</Text>
                <Text style={styles.headerSubtitle}>{t('choosePreferredLanguage') || 'Choose your preferred language'}</Text>
              </View>
            </LinearGradient>

            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={renderLanguageItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.languageList}
            />

            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { borderTopColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
                {t('cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectorFlag: {
    fontSize: 18,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 340,
    maxHeight: height * 0.7,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  headerGradient: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  languageList: {
    paddingVertical: 8,
  },
  languageOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageOptionNative: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  languageOptionLabel: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});