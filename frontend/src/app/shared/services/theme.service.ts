// src/app/shared/services/theme.service.ts

import { Injectable, signal, computed, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DARK_THEME, LIGHT_THEME, ThemeColors, ThemeType } from '../constants/colors.constants';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private isBrowser: boolean;
  
  // Reactive signals for theme state
  private themeSignal = signal<ThemeType>('dark');
  public theme = this.themeSignal.asReadonly();
  
  // Computed colors based on current theme
  public colors = computed<ThemeColors>(() => {
    return this.themeSignal() === 'dark' ? DARK_THEME : LIGHT_THEME;
  });
  
  // Check if dark mode is active
  public isDarkMode = computed(() => this.themeSignal() === 'dark');
  
  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Load saved theme preference
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeType;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        this.themeSignal.set(savedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.themeSignal.set(prefersDark ? 'dark' : 'light');
      }
      
      // Apply theme to document
      this.applyThemeToDocument();
      
      // Enable theme transitions after initial paint to prevent flash
      requestAnimationFrame(() => {
        document.body.classList.add('theme-ready');
      });
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.THEME_KEY)) {
          this.themeSignal.set(e.matches ? 'dark' : 'light');
          this.applyThemeToDocument();
        }
      });
    }
    
    // Save theme whenever it changes
    effect(() => {
      if (this.isBrowser) {
        localStorage.setItem(this.THEME_KEY, this.themeSignal());
        this.applyThemeToDocument();
      }
    });
  }
  
  toggleTheme(): void {
    this.themeSignal.set(this.themeSignal() === 'dark' ? 'light' : 'dark');
  }
  
  setTheme(theme: ThemeType): void {
    this.themeSignal.set(theme);
  }
  
  private applyThemeToDocument(): void {
    if (!this.isBrowser) return;
    
    const theme = this.themeSignal();
    const root = document.documentElement;
    
    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', theme);
    
    // Apply CSS custom properties for non-component styles
    const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--theme-${key}`, value);
      } else if (Array.isArray(value) && key === 'authBgGradient') {
        root.style.setProperty('--theme-auth-bg-gradient', value.join(','));
      }
    });
  }
}