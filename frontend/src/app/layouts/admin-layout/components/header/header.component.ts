import { Component, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { BaseThemeComponent } from '../../../../shared/components/theme/base-theme.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <header class="header">
      <button type="button" class="toggle-btn" (click)="toggleSidebar.emit()" aria-label="Toggle sidebar">
        <mat-icon>menu</mat-icon>
      </button>

      <div class="header__spacer"></div>

      <div class="header__actions">
        <!-- Theme Toggle Button -->
        <button 
          type="button" 
          class="theme-toggle-btn" 
          (click)="toggleTheme()" 
          [attr.aria-label]="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
          <mat-icon>
            {{ isDarkMode ? 'light_mode' : 'dark_mode' }}
          </mat-icon>
        </button>

        <!-- User Menu -->
        <div class="user-menu">
          <button type="button" class="user-btn" (click)="toggleUserMenu()" aria-label="User menu">
            <div class="header__avatar">{{ initials() }}</div>
          </button>
          
          @if (showUserMenu) {
            <div class="user-dropdown">
              <div class="dropdown-user-info">
                <div class="dropdown-user-name">{{ user()?.name || 'Admin User' }}</div>
                <div class="dropdown-user-email">{{ user()?.email || 'admin@icoach.app' }}</div>
              </div>
              <div class="dropdown-divider"></div>
              <a routerLink="/profile" class="dropdown-item" (click)="showUserMenu = false">
                <mat-icon>person</mat-icon>
                <span>Profile</span>
              </a>
              @if (isAdmin()) {
                <a routerLink="/users" class="dropdown-item" (click)="showUserMenu = false">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <span>Admin Panel</span>
                </a>
              }
              <div class="dropdown-divider"></div>
              <button class="dropdown-item dropdown-item--danger" (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Sign out</span>
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 64px;
      background: var(--theme-card);
      border-bottom: 1px solid var(--theme-border);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .toggle-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--theme-text-secondary);
      cursor: pointer;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
      
      &:hover {
        background: var(--theme-icon-bg);
        color: var(--theme-text-primary);
      }
    }

    .header__spacer {
      flex: 1;
    }

    .header__actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Theme Toggle Button */
    .theme-toggle-btn {
      width: 40px;
      height: 40px;
      border: 1px solid var(--theme-border);
      background: var(--theme-surface);
      color: var(--theme-primary);
      cursor: pointer;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      &:hover {
        transform: scale(1.05);
        border-color: var(--theme-primary);
        box-shadow: 0 0 12px rgba(245, 197, 39, 0.2);
      }
      
      &:active {
        transform: scale(0.95);
      }
    }

    /* User Menu */
    .user-menu {
      position: relative;
    }

    .user-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      border-radius: 20px;
      transition: all 0.2s ease;
      
      &:hover {
        transform: scale(1.05);
      }
    }

    .header__avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: #fff;
    }

    .user-dropdown {
      position: absolute;
      top: 52px;
      right: 0;
      min-width: 240px;
      background: var(--theme-card);
      border: 1px solid var(--theme-border);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: slideDown 0.2s ease;
      z-index: 1000;
    }

    .dropdown-user-info {
      padding: 12px 16px;
      background: var(--theme-surface);
      
      .dropdown-user-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--theme-text);
        margin-bottom: 4px;
      }
      
      .dropdown-user-email {
        font-size: 0.75rem;
        color: var(--theme-text-secondary);
      }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: var(--theme-text);
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--theme-text-secondary);
      }
      
      &:hover {
        background: var(--theme-icon-bg);
        
        mat-icon {
          color: var(--theme-primary);
        }
      }
      
      &--danger {
        color: var(--theme-error);
        
        mat-icon {
          color: var(--theme-error);
        }
        
        &:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--theme-divider);
      margin: 4px 0;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header {
        padding: 0 16px;
      }
      
      .user-dropdown {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        border-radius: 20px 20px 0 0;
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
    }
  `]
})
export class HeaderComponent extends BaseThemeComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  private auth = inject(AuthService);
  private notif = inject(NotificationService);
  
  showUserMenu = false;

  get user() {
    return this.auth.currentUser;
  }
  
  isAdmin(): boolean {
    return this.auth.isAdmin();
  }
  
  initials(): string {
    const name = this.user()?.name || '';
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    
    if (this.showUserMenu) {
      setTimeout(() => {
        document.addEventListener('click', this.closeUserMenuOnClickOutside);
      }, 0);
    }
  }

  private closeUserMenuOnClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const userMenu = document.querySelector('.user-menu');
    
    if (userMenu && !userMenu.contains(target)) {
      this.showUserMenu = false;
      document.removeEventListener('click', this.closeUserMenuOnClickOutside);
    }
  };

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.showUserMenu = false;
    this.auth.logout().subscribe({
      next: () => {
        this.notif.success('Signed out successfully');
      },
      error: () => {
        this.auth.clearSession();
        this.notif.success('Signed out');
      },
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    document.removeEventListener('click', this.closeUserMenuOnClickOutside);
  }
}