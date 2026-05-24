import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private show(message: string, type: 'success' | 'error' | 'info'): void {
    if (typeof document === 'undefined') {
      console[type === 'error' ? 'error' : 'log'](message);
      return;
    }

    const toast = document.createElement('div');
    const palette = {
      success: { bg: '#0f766e', border: '#14b8a6' },
      error: { bg: '#7f1d1d', border: '#ef4444' },
      info: { bg: '#1e3a8a', border: '#3b82f6' },
    }[type];

    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '16px';
    toast.style.right = '16px';
    toast.style.zIndex = '9999';
    toast.style.maxWidth = '360px';
    toast.style.padding = '12px 14px';
    toast.style.borderRadius = '12px';
    toast.style.border = `1px solid ${palette.border}`;
    toast.style.background = palette.bg;
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.25)';
    toast.style.fontSize = '0.875rem';
    toast.style.lineHeight = '1.4';
    toast.style.fontWeight = '600';
    toast.style.pointerEvents = 'none';

    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), type === 'error' ? 5000 : 3500);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }
}