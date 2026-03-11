import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'dark' | 'light';

interface ThemeColors {
  background: string;
  bgGradient: string[];
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  // Extended semantic colors
  surface: string;
  surfaceElevated: string;
  inputBg: string;
  inputBorder: string;
  navBar: string;
  navBarBorder: string;
  navIcon: string;
  overlay: string;
  shadow: string;
  divider: string;
  modalBg: string;
  modalOverlay: string;
  cardBorder: string;
  accent: string;
  subtleText: string;
  iconBg: string;
  progressBg: string;
  statBg: string;
  statBorder: string;
}

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const darkTheme: ThemeColors = {
  background: '#000000',
  bgGradient: ['#0F0F0F', '#1A1A1A', '#000000'],
  primary: '#FFD700',
  secondary: '#B8860B',
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  card: '#000000',
  border: '#FFD700',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceElevated: 'rgba(255, 255, 255, 0.10)',
  inputBg: 'rgba(255, 234, 234, 0.1)',
  inputBorder: '#444',
  navBar: 'rgba(25, 25, 25, 0.95)',
  navBarBorder: 'rgba(255, 255, 255, 0.1)',
  navIcon: '#888',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
  divider: 'rgba(255, 255, 255, 0.1)',
  modalBg: '#222',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  accent: '#FFD700',
  subtleText: '#888',
  iconBg: 'rgba(255, 215, 0, 0.1)',
  progressBg: 'rgba(255, 255, 255, 0.15)',
  statBg: 'rgba(255, 255, 255, 0.08)',
  statBorder: 'rgba(255, 255, 255, 0.15)',
};

const lightTheme: ThemeColors = {
  background: '#FEF9F3',
  bgGradient: ['#FEF9F3', '#FBF7F1', '#F8F5F0'],
  primary: '#C5981B',
  secondary: '#B8860B',
  text: '#3B2A1A',
  textSecondary: '#7A6245',
  card: '#FFFFFF',
  border: '#E8DCC8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  inputBg: '#FFFFFF',
  inputBorder: '#E0D5C3',
  navBar: '#FFFFFF',
  navBarBorder: '#E8DCC8',
  navIcon: '#9A8A72',
  overlay: 'rgba(74, 55, 40, 0.5)',
  shadow: 'rgba(139, 115, 85, 0.12)',
  divider: '#EDE5D8',
  modalBg: '#FFFFFF',
  modalOverlay: 'rgba(59, 42, 26, 0.4)',
  cardBorder: '#EDE5D8',
  accent: '#C5981B',
  subtleText: '#9A8A72',
  iconBg: 'rgba(197, 152, 27, 0.08)',
  progressBg: '#EDE5D8',
  statBg: '#FBF7F1',
  statBorder: '#EDE5D8',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      await AsyncStorage.setItem('appTheme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
