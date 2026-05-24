import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { User } from '../../../../core/models/user.interface';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PageHeaderComponent],
  template: `
    <div class="user-detail">
      <app-page-header title="User Detail" [breadcrumbs]="[{label:'Dashboard',link:'/dashboard'},{label:'Users',link:'/users'},{label:user()?.name||'Detail'}]">
        <a mat-flat-button [routerLink]="['/users', user()?.id, 'edit']">
          <mat-icon>edit</mat-icon> Edit
        </a>
      </app-page-header>

      @if (isLoading()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else if (user()) {
        <div class="detail-grid">
          <div class="detail-card">
            <div class="user-header">
              <div class="user-avatar">
                @if (user()!.profileImage) {
                  <img [src]="user()!.profileImage" [alt]="user()!.name">
                } @else {
                  <span>{{ initials() }}</span>
                }
              </div>
              <div>
                <h2>{{ user()!.name }}</h2>
                <p>{{ user()!.email }}</p>
                <span class="badge badge--{{ user()!.role }}">{{ user()!.role }}</span>
              </div>
            </div>
          </div>
          <div class="detail-card">
            <h3>Account Details</h3>
            <dl>
              <dt>ID</dt><dd>{{ user()!.id }}</dd>
              <dt>Verified</dt><dd>{{ user()!.isVerified ? 'Yes' : 'No' }}</dd>
              <dt>Active</dt><dd>{{ user()!.isActive ? 'Active' : 'Inactive' }}</dd>
              <dt>Joined</dt><dd>{{ user()!.createdAt | date }}</dd>
              <dt>Updated</dt><dd>{{ user()!.updatedAt | date }}</dd>
            </dl>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 60px; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px,1fr)); gap: 16px; }
    .detail-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
    .user-header { display: flex; gap: 16px; align-items: center; }
    .user-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0; }
    .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
    h2 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
    p { margin: 0 0 8px; color: var(--text-muted); font-size: 0.875rem; }
    h3 { font-size: 0.9rem; font-weight: 600; margin: 0 0 16px; color: var(--text-primary); }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; }
    dt { color: var(--text-muted); font-size: 0.8rem; }
    dd { color: var(--text-secondary); font-size: 0.8rem; margin: 0; }
    .badge { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .badge--admin { background: rgba(139,92,246,0.15); color: #8b5cf6; }
    .badge--user { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .badge--coach { background: rgba(245,158,11,0.15); color: #f59e0b; }
  `]
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  user = signal<User|null>(null);
  isLoading = signal(true);

  initials = () => {
    const name = this.user()?.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.userService.getUserById(id).subscribe({
      next: res => { this.user.set(res.data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }
}
