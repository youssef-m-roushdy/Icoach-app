// src/app/shared/constants/colors.constants.ts

export const COLORS = {
  // Dark Theme Colors (Default)
  primary: '#f5c527ff',
  secondary: '#0D0000',
  background: '#000',
  white: '#fff',
  gray: '#ccc',
  lightGray: '#D9D9D9',
  darkGray: '#444',
  textSecondary: '#999',
  overlay: 'rgba(255, 255, 255, 0.15)',
  inputBackground: 'rgba(255, 234, 234, 0.1)',
  modalOverlay: 'rgba(0,0,0,0.7)',
  modalBackground: '#222',
  
  // Light Mode Colors (Soft Cream + Gold theme)
  lightPrimary: '#D4AF37',
  lightSecondary: '#EFE66D',
  lightBackground: '#FEF9F3',
  lightCard: '#F8F5F0',
  lightText: '#4A3728',
  lightTextSecondary: '#8B7355',
  lightBorder: '#D4AF37',
  lightInputBackground: 'rgba(212, 175, 55, 0.1)',
  lightModalOverlay: 'rgba(74, 55, 40, 0.7)',
  lightModalBackground: '#F8F5F0',
  lightOverlay: 'rgba(74, 55, 40, 0.15)',
  
  // Warning/Error colors
  error: '#ef4444',
  errorLight: '#fca5a5',
  errorBackground: 'rgba(239, 68, 68, 0.1)',
  
  // Success colors
  success: '#10b981',
  successLight: '#6ee7b7',
  successBackground: 'rgba(16, 185, 129, 0.1)',
};

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  // Core colors
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderLight: string;
  borderAccent: string;
  
  // Status colors
  error: string;
  errorLight: string;
  errorBackground: string;
  success: string;
  successLight: string;
  successBackground: string;
  
  // UI Elements
  overlay: string;
  inputBackground: string;
  modalOverlay: string;
  modalBackground: string;
  
  // Gradients & Effects
  authBgGradient: string[];
  authCircle1: string;
  authCircle2: string;
  authCircle3: string;
  authInputBg: string;
  authInputBorder: string;
  
  // Additional UI
  statBg: string;
  statBorder: string;
  progressBg: string;
  divider: string;
  shadow: string;
  iconBg: string;
  cardBorder: string;
  surfaceHover: string;
}

export const DARK_THEME: ThemeColors = {
  // Core colors
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  background: COLORS.background,
  surface: COLORS.secondary,
  card: COLORS.modalBackground,
  
  // Text colors
  text: COLORS.white,
  textSecondary: COLORS.textSecondary,
  textTertiary: COLORS.darkGray,
  
  // Border colors
  border: COLORS.overlay,
  borderLight: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(245, 197, 39, 0.3)',
  
  // Status colors
  error: COLORS.error,
  errorLight: COLORS.errorLight,
  errorBackground: COLORS.errorBackground,
  success: COLORS.success,
  successLight: COLORS.successLight,
  successBackground: COLORS.successBackground,
  
  // UI Elements
  overlay: COLORS.overlay,
  inputBackground: COLORS.inputBackground,
  modalOverlay: COLORS.modalOverlay,
  modalBackground: COLORS.modalBackground,
  
  // Gradients & Effects (Dark)
  authBgGradient: ['#000000', '#0D0000', '#1a0a0a'],
  authCircle1: '#f5c52710',
  authCircle2: '#f5c52708',
  authCircle3: '#f5c52705',
  authInputBg: COLORS.inputBackground,
  authInputBorder: COLORS.overlay,
  
  // Additional UI
  statBg: 'rgba(255, 255, 255, 0.05)',
  statBorder: 'rgba(255, 255, 255, 0.08)',
  progressBg: 'rgba(255, 255, 255, 0.1)',
  divider: 'rgba(255, 255, 255, 0.08)',
  shadow: '#000',
  iconBg: 'rgba(245, 197, 39, 0.1)',
  cardBorder: 'rgba(245, 197, 39, 0.15)',
  surfaceHover: '#1a0a0a',
};

export const LIGHT_THEME: ThemeColors = {
  // Core colors
  primary: COLORS.lightPrimary,
  secondary: COLORS.lightSecondary,
  background: COLORS.lightBackground,
  surface: COLORS.lightCard,
  card: COLORS.lightModalBackground,
  
  // Text colors
  text: COLORS.lightText,
  textSecondary: COLORS.lightTextSecondary,
  textTertiary: '#B8A281',
  
  // Border colors
  border: COLORS.lightBorder,
  borderLight: 'rgba(212, 175, 55, 0.1)',
  borderAccent: 'rgba(212, 175, 55, 0.4)',
  
  // Status colors
  error: COLORS.error,
  errorLight: COLORS.errorLight,
  errorBackground: COLORS.errorBackground,
  success: COLORS.success,
  successLight: COLORS.successLight,
  successBackground: COLORS.successBackground,
  
  // UI Elements
  overlay: COLORS.lightOverlay,
  inputBackground: COLORS.lightInputBackground,
  modalOverlay: COLORS.lightModalOverlay,
  modalBackground: COLORS.lightModalBackground,
  
  // Gradients & Effects (Light)
  authBgGradient: ['#FEF9F3', '#F8F5F0', '#FEF9F3'],
  authCircle1: '#D4AF3710',
  authCircle2: '#D4AF3708',
  authCircle3: '#D4AF3705',
  authInputBg: COLORS.lightInputBackground,
  authInputBorder: COLORS.lightBorder,
  
  // Additional UI
  statBg: 'rgba(212, 175, 55, 0.05)',
  statBorder: 'rgba(212, 175, 55, 0.1)',
  progressBg: 'rgba(212, 175, 55, 0.1)',
  divider: 'rgba(212, 175, 55, 0.1)',
  shadow: '#8B7355',
  iconBg: 'rgba(212, 175, 55, 0.1)',
  cardBorder: 'rgba(212, 175, 55, 0.2)',
  surfaceHover: '#FEF9F3',
};