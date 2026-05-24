import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed">
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">iC</div>
        @if (!collapsed) {
          <span class="sidebar__logo-text">iCoach</span>
        }
      </div>

      <nav class="sidebar__nav">
        @for (item of navItems; track item.route) {
          <a class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="nav-item--active">
            <span class="nav-item__icon">{{ item.icon }}</span>
            @if (!collapsed) {
              <span class="nav-item__label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__user">
          <div class="avatar">{{ initials() }}</div>
          @if (!collapsed) {
            <div class="user-info">
              <span class="user-name">{{ user()?.name }}</span>
              <span class="user-role">{{ user()?.role }}</span>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
      flex-shrink: 0;
      position: sticky;
      top: 0;
    }
    .sidebar--collapsed { width: 68px; }

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
      width: 36px; height: 36px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.8rem; color: #fff;
      font-family: 'Syne', sans-serif;
    }
    .sidebar__logo-text { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); font-family: 'Syne', sans-serif; white-space: nowrap; }

    .sidebar__nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-muted);
      transition: all 0.15s;
      white-space: nowrap;
      overflow: hidden;
      &:hover { background: var(--surface); color: var(--text-primary); }
    }
    .nav-item--active { background: rgba(var(--accent-rgb), 0.12) !important; color: var(--accent) !important; }
    .nav-item__icon { width: 20px; min-width: 20px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
    .nav-item__label { font-size: 0.875rem; font-weight: 500; }

    .sidebar__footer { padding: 12px 8px; border-top: 1px solid var(--border); }
    .sidebar__user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 10px;
      overflow: hidden;
    }
    .avatar {
      width: 32px; height: 32px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: #fff;
    }
    .user-info { overflow: hidden; }
    .user-name { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
    .user-role { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: capitalize; }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;
  private auth = inject(AuthService);

  user = this.auth.currentUser;
  initials = () => {
    const name = this.user()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Users', icon: 'group', route: '/users' },
    { label: 'Foods', icon: 'restaurant', route: '/foods' },
    { label: 'Workouts', icon: 'fitness_center', route: '/workouts' },
    { label: 'Profile', icon: 'manage_accounts', route: '/profile' },
  ];
}
