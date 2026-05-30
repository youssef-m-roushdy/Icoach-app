import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed">
      <!-- Logo Section -->
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L3 8L12 13L21 8L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3 16L12 21L21 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3 12L12 17L21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        @if (!collapsed) {
          <span class="sidebar__logo-text">iCoach</span>
        }
      </div>

      <!-- Navigation -->
      <nav class="sidebar__nav">
        @for (item of navItems; track item.route) {
          <a class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="nav-item--active"
             [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
             [attr.data-tooltip]="collapsed ? item.label : null">
            <span class="nav-item__icon">
              <span class="material-icons">{{ item.icon }}</span>
            </span>
            @if (!collapsed) {
              <span class="nav-item__label">{{ item.label }}</span>
            }
            @if (item.badge && !collapsed) {
              <span class="nav-item__badge">{{ item.badge }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer with User Info -->
      <div class="sidebar__footer">
        <div class="sidebar__user" [routerLink]="['/profile']">
          <div class="avatar">
            {{ initials() }}
          </div>
          @if (!collapsed) {
            <div class="user-info">
              <span class="user-name">{{ user()?.name || 'Admin User' }}</span>
              <span class="user-role">{{ user()?.role || 'Administrator' }}</span>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    
    .sidebar--collapsed {
      width: 72px;
    }
    
    .sidebar--collapsed .nav-item__label,
    .sidebar--collapsed .user-info {
      display: none;
    }
    
    /* Logo Section */
    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid var(--border);
      height: 64px;
      overflow: hidden;
    }
    
    .sidebar__logo-icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: transform 0.3s ease;
      
      svg {
        stroke: white;
      }
      
      &:hover {
        transform: scale(1.05);
      }
    }
    
    .sidebar__logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      white-space: nowrap;
      letter-spacing: -0.5px;
    }
    
    /* Navigation */
    .sidebar__nav {
      flex: 1;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      
      &::-webkit-scrollbar {
        width: 4px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      
      &::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 4px;
      }
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      text-decoration: none;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      white-space: nowrap;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%) scaleY(0);
        width: 3px;
        height: 20px;
        background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
        border-radius: 0 4px 4px 0;
        transition: transform 0.2s ease;
      }
      
      &:hover {
        background: var(--accent-light);
        color: var(--accent-color);
        
        .nav-item__icon .material-icons {
          color: var(--accent-color);
        }
        
        &::before {
          transform: translateY(-50%) scaleY(1);
        }
      }
      
      &--active {
        background: var(--accent-light);
        color: var(--accent-color);
        
        .nav-item__icon mat-icon {
          color: var(--accent-color);
        }
        
        &::before {
          transform: translateY(-50%) scaleY(1);
        }
      }
    }
    
    .nav-item__icon {
      width: 24px;
      min-width: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .material-icons {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-secondary);
        transition: color 0.2s ease;
      }
    }
    
    .nav-item__label {
      font-size: 0.875rem;
      font-weight: 500;
      flex: 1;
    }
    
    .nav-item__badge {
      background: var(--accent-color);
      color: white;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }
    
    /* Footer */
    .sidebar__footer {
      padding: 16px 12px;
      border-top: 1px solid var(--border);
    }
    
    .sidebar__user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--accent-light);
      }
    }
    
    .avatar {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
    }
    
    .user-info {
      overflow: hidden;
      flex: 1;
    }
    
    .user-name {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    
    .user-role {
      display: block;
      font-size: 0.7rem;
      color: var(--text-secondary);
      text-transform: capitalize;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    
    /* Tooltip for collapsed state */
    .sidebar--collapsed .nav-item {
      justify-content: center;
      
      &:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 12px;
        padding: 6px 12px;
        background: var(--card-bg);
        color: var(--text-primary);
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
        border-radius: 8px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow-md);
        z-index: 100;
        pointer-events: none;
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
      }
      
      .sidebar--collapsed {
        transform: translateX(0);
        width: 260px;
      }
      
      .sidebar--collapsed .nav-item__label,
      .sidebar--collapsed .user-info {
        display: flex;
      }
    }
    
    /* Active route indicator - no entrance animation to prevent flash on reload */
    .nav-item--active {
      /* Active state is handled by background, color, and ::before indicator above */
    }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;
  private auth = inject(AuthService);

  user = this.auth.currentUser;
  
  initials(): string {
    const name = this.user()?.name || '';
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Users', icon: 'group', route: '/users' },
    { label: 'Foods', icon: 'restaurant', route: '/foods' },
    { label: 'Workouts', icon: 'fitness_center', route: '/workouts' },
    { label: 'Profile', icon: 'person', route: '/profile' },
  ];
}