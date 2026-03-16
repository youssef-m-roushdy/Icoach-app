import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../../i18n/i18n';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';

interface Language {
  code: string;
  label: string;
}

const languages: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n: i18nInstance } = useTranslation();
  const { colors } = useTheme();
  const [language, setLanguage] = useState('English');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Load saved language on component mount
    loadSavedLanguage();
  }, []);

  useEffect(() => {
    // Update language display when language changes
    const currentLangCode = i18nInstance.language;
    const langItem = languages.find(l => l.code === currentLangCode);
    if (langItem) {
      setLanguage(langItem.label);
    }
  }, [i18nInstance.language]);

  const loadSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('appLanguage');
      if (savedLang) {
        const langItem = languages.find(l => l.code === savedLang);
        if (langItem) {
          setLanguage(langItem.label);
          await i18n.changeLanguage(savedLang);
        }
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const selectLanguage = async (lang: Language) => {
    try {
      await i18n.changeLanguage(lang.code);
      await AsyncStorage.setItem('appLanguage', lang.code);
      setLanguage(lang.label);
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={[styles.languageText, { color: colors.primary }]}>{language}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.textSecondary + '80' }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.languageOption}
                  onPress={() => selectLanguage(item)}
                >
                  <Text style={[styles.languageOptionText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  languageText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    borderRadius: 10,
    padding: 20,
    width: 250,
    alignItems: 'center',
  },
  languageOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  languageOptionText: {
    fontSize: SIZES.h4,
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  closeText: {
    fontWeight: 'bold',
  },
});
 
