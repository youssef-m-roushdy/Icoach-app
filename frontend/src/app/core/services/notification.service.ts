import { Injectable } from '@angular/core';

export interface NotificationOptions {
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  options?: NotificationOptions;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications: Notification[] = [];
  private container: HTMLElement | null = null;
  private readonly defaultDurations = {
    success: 3000,
    error: 5000,
    info: 3500,
    warning: 4000,
  };

  private getContainer(): HTMLElement {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private createToastElement(notification: Notification): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${notification.type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const palette = {
      success: { bg: 'linear-gradient(135deg, #059669, #047857)', border: '#10b981', icon: '✓' },
      error: { bg: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: '#ef4444', icon: '✕' },
      info: { bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: '#3b82f6', icon: 'ℹ' },
      warning: { bg: 'linear-gradient(135deg, #d97706, #b45309)', border: '#f59e0b', icon: '⚠' },
    }[notification.type];

    const isDismissible = notification.options?.dismissible ?? true;
    const action = notification.options?.action;

    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      max-width: 420px;
      padding: 14px 16px;
      border-radius: 12px;
      background: ${palette.bg};
      border-left: 4px solid ${palette.border};
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      color: white;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      cursor: default;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    // Icon
    const iconSpan = document.createElement('span');
    iconSpan.textContent = palette.icon;
    iconSpan.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      font-size: 14px;
      font-weight: bold;
      flex-shrink: 0;
    `;
    toast.appendChild(iconSpan);

    // Message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = notification.message;
    messageSpan.style.cssText = `
      flex: 1;
      word-break: break-word;
    `;
    toast.appendChild(messageSpan);

    // Action button
    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = action.label;
      actionBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      `;
      actionBtn.onmouseenter = () => {
        actionBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      };
      actionBtn.onmouseleave = () => {
        actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      };
      actionBtn.onclick = () => {
        action.onClick();
        this.dismiss(notification.id);
      };
      toast.appendChild(actionBtn);
    }

    // Dismiss button
    if (isDismissible) {
      const dismissBtn = document.createElement('button');
      dismissBtn.innerHTML = '×';
      dismissBtn.style.cssText = `
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        flex-shrink: 0;
      `;
      dismissBtn.onmouseenter = () => {
        dismissBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        dismissBtn.style.color = 'white';
      };
      dismissBtn.onmouseleave = () => {
        dismissBtn.style.background = 'none';
        dismissBtn.style.color = 'rgba(255, 255, 255, 0.7)';
      };
      dismissBtn.onclick = () => this.dismiss(notification.id);
      toast.appendChild(dismissBtn);
    }

    // Progress bar for duration
    const duration = notification.options?.duration ?? this.defaultDurations[notification.type];
    if (duration > 0 && !notification.options?.action) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.4);
        width: 100%;
        border-radius: 0 0 0 12px;
        animation: progress ${duration}ms linear forwards;
      `;
      toast.style.position = 'relative';
      toast.style.overflow = 'hidden';
      toast.appendChild(progressBar);
    }

    return toast;
  }

  private show(notification: Notification): void {
    if (typeof document === 'undefined') {
      console[notification.type === 'error' ? 'error' : 'log'](
        `[${notification.type.toUpperCase()}] ${notification.message}`
      );
      return;
    }

    const container = this.getContainer();
    const toast = this.createToastElement(notification);
    
    // Add keyframe animation if not exists
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .notification-toast {
          animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .notification-toast.removing {
          animation: slideOut 0.2s ease forwards;
        }
      `;
      document.head.appendChild(style);
    }

    container.appendChild(toast);
    this.notifications.push(notification);

    // Auto-dismiss
    const duration = notification.options?.duration ?? this.defaultDurations[notification.type];
    if (duration > 0 && !notification.options?.action) {
      const timeout = setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
      
      // Store timeout for cleanup
      (toast as any)._timeout = timeout;
    }

    // Pause timer on hover
    if (!notification.options?.action) {
      toast.addEventListener('mouseenter', () => {
        if ((toast as any)._timeout) {
          clearTimeout((toast as any)._timeout);
        }
        // Fix: Type assertion for progressBar
        const progressBar = toast.querySelector('div:last-child') as HTMLElement | null;
        if (progressBar) {
          const computedStyle = window.getComputedStyle(progressBar);
          const animation = computedStyle.animation;
          if (animation !== 'none') {
            progressBar.style.animationPlayState = 'paused';
          }
        }
      });

      toast.addEventListener('mouseleave', () => {
        const remainingTime = (toast as any)._remainingTime || duration;
        if (remainingTime > 0) {
          (toast as any)._timeout = setTimeout(() => {
            this.dismiss(notification.id);
          }, remainingTime);
          
          // Fix: Type assertion for progressBar
          const progressBar = toast.querySelector('div:last-child') as HTMLElement | null;
          if (progressBar) {
            progressBar.style.animationPlayState = 'running';
          }
        }
      });

      // Track remaining time
      let startTime = Date.now();
      let remaining = duration;
      toast.addEventListener('mouseenter', () => {
        const elapsed = Date.now() - startTime;
        remaining = Math.max(0, duration - elapsed);
      });
      toast.addEventListener('mouseleave', () => {
        startTime = Date.now();
      });
    }
  }

  dismiss(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;

    const container = this.getContainer();
    const toast = container.children[index] as HTMLElement;
    
    if (toast) {
      toast.classList.add('removing');
      if ((toast as any)._timeout) {
        clearTimeout((toast as any)._timeout);
      }
      
      setTimeout(() => {
        toast.remove();
        this.notifications = this.notifications.filter(n => n.id !== id);
        
        // Clean up container if empty
        if (this.notifications.length === 0 && this.container) {
          this.container.remove();
          this.container = null;
        }
      }, 200);
    }
  }

  dismissAll(): void {
    this.notifications.forEach(notification => {
      this.dismiss(notification.id);
    });
  }

  success(message: string, options?: NotificationOptions): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'success',
      options,
    });
  }

  error(message: string, options?: NotificationOptions): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'error',
      options,
    });
  }

  info(message: string, options?: NotificationOptions): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'info',
      options,
    });
  }

  warning(message: string, options?: NotificationOptions): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'warning',
      options,
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}