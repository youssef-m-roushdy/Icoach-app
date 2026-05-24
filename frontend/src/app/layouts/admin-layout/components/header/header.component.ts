import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <button type="button" class="toggle-btn" (click)="toggleSidebar.emit()" aria-label="Toggle sidebar">
        ☰
      </button>

      <div class="header__spacer"></div>

      <div class="header__actions">
        <button type="button" class="user-btn" routerLink="/profile">
          <div class="header__avatar">{{ initials() }}</div>
        </button>
        <button type="button" class="logout-btn" (click)="logout()">Sign out</button>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 64px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .toggle-btn { color: var(--text-muted); }
    .header__spacer { flex: 1; }
    .header__actions { display: flex; align-items: center; gap: 8px; }
    .header__avatar {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: #fff;
    }
    .user-btn, .logout-btn {
      border: 0;
      background: transparent;
      color: var(--text-primary);
      cursor: pointer;
      padding: 0;
    }
    .logout-btn {
      font-size: 0.875rem;
      color: #f43f5e;
      font-weight: 600;
    }
  `]
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  private auth = inject(AuthService);
  private notif = inject(NotificationService);

  user = this.auth.currentUser;
  initials = () => {
    const name = this.user()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.notif.success('Signed out'),
      error: () => this.auth.clearSession(),
    });
  }
}
