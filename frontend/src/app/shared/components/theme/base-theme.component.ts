// src/app/shared/components/theme/base-theme.component.ts

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { ThemeColors } from '../../constants/colors.constants';

@Component({
  template: ''
})
export abstract class BaseThemeComponent implements OnInit, OnDestroy {
  // Make it protected so child components can access it
  protected themeService = inject(ThemeService);
  protected destroy$ = new Subject<void>();
  
  // Expose colors to child components
  get colors(): ThemeColors {
    return this.themeService.colors();
  }
  
  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
  
  ngOnInit(): void {
    // Override in child components if needed
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}