import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="admin-layout">
      <app-sidebar [collapsed]="sidebarCollapsed()"></app-sidebar>
      <div class="admin-layout__main">
        <app-header (toggleSidebar)="sidebarCollapsed.set(!sidebarCollapsed())"></app-header>
        <main class="admin-layout__content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg);
    }
    .admin-layout__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .admin-layout__content {
      flex: 1;
      padding: 28px;
      overflow-y: auto;
    }
  `]
})
export class AdminLayoutComponent {
  sidebarCollapsed = signal(false);
}
