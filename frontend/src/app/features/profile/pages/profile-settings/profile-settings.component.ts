import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserService } from '../../../users/services/user.service';
import { User, getFullName, getDisplayName } from '../../../../core/models/user.interface';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeaderComponent
  ],
  template: `
    <div class="profile-page">
      <app-page-header
        title="Admin Profile"
        [breadcrumbs]="[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Profile' }
        ]">
        <div class="header-actions">
          <button mat-stroked-button class="ghost-btn" (click)="editProfile()" matTooltip="Edit your profile information">
            <mat-icon>edit</mat-icon>
            Edit Profile
          </button>
          <a mat-flat-button class="primary-btn" routerLink="/users" matTooltip="Manage all users">
            <mat-icon>group</mat-icon>
            Manage Users
          </a>
        </div>
      </app-page-header>

      @if (isLoading()) {
        <div class="center">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading profile...</p>
        </div>
      } @else if (profile()) {
        <section class="profile-hero">
          <div class="avatar">
            @if (profile()!.avatar) {
              <img [src]="profile()!.avatar" [alt]="getDisplayName()" />
            } @else {
              <span>{{ initials() }}</span>
            }
          </div>
          <div class="hero-content">
            <div class="hero-title">
              <div>
                <h2>{{ getFullName() }}</h2>
                <p>{{ profile()!.email || 'No email provided' }}</p>
                <p class="username">@{{ profile()!.username || 'username' }}</p>
              </div>
              <span class="role-chip">{{ profile()!.role || 'admin' }}</span>
            </div>
            <div class="status-row">
              <span class="status-chip" [class]="profile()!.isEmailVerified ? 'status-chip--success' : 'status-chip--warning'">
                <mat-icon>verified</mat-icon>
                {{ profile()!.isEmailVerified ? 'Verified' : 'Unverified' }}
              </span>
              <span class="status-chip" [class]="profile()!.isActive ? 'status-chip--success' : 'status-chip--danger'">
                <mat-icon>fiber_manual_record</mat-icon>
                {{ profile()!.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <p class="bio-text">{{ profile()!.bio || 'Add a short bio to introduce yourself to the team.' }}</p>
          </div>
        </section>

        <section class="profile-grid">
          <!-- Personal Information -->
          <div class="profile-card">
            <h3>
              <mat-icon>person</mat-icon>
              Personal Information
            </h3>
            <div class="info-row">
              <mat-icon>badge</mat-icon>
              <span><strong>Full Name:</strong> {{ getFullName() }}</span>
            </div>
            <div class="info-row">
              <mat-icon>account_circle</mat-icon>
              <span><strong>Username:</strong> {{ profile()!.username || 'N/A' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>email</mat-icon>
              <span><strong>Email:</strong> {{ profile()!.email || 'N/A' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>phone</mat-icon>
              <span><strong>Phone:</strong> {{ profile()!.phone || 'Not provided' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>cake</mat-icon>
              <span><strong>Date of Birth:</strong> {{ profile()!.dateOfBirth ? (profile()!.dateOfBirth | date) : 'Not provided' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>wc</mat-icon>
              <span><strong>Gender:</strong> {{ profile()!.gender || 'Not specified' }}</span>
            </div>
          </div>

          <!-- Physical Stats -->
          <div class="profile-card">
            <h3>
              <mat-icon>fitness_center</mat-icon>
              Physical Stats
            </h3>
            <div class="info-row">
              <mat-icon>straighten</mat-icon>
              <span><strong>Height:</strong> {{ profile()!.height ? profile()!.height + ' cm' : 'Not recorded' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>monitor_weight</mat-icon>
              <span><strong>Weight:</strong> {{ profile()!.weight ? profile()!.weight + ' kg' : 'Not recorded' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>calculate</mat-icon>
              <span><strong>BMI:</strong> {{ profile()!.bmi ? profile()!.bmi : 'Not calculated' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>percent</mat-icon>
              <span><strong>Body Fat:</strong> {{ profile()!.bodyFatPercentage ? profile()!.bodyFatPercentage + '%' : 'Not measured' }}</span>
            </div>
            <div class="info-row">
              <mat-icon>track_changes</mat-icon>
              <span><strong>Fitness Goal:</strong> {{ formatFitnessGoal(profile()!.fitnessGoal) }}</span>
            </div>
            <div class="info-row">
              <mat-icon>trending_up</mat-icon>
              <span><strong>Activity Level:</strong> {{ formatActivityLevel(profile()!.activityLevel) }}</span>
            </div>
          </div>

          <!-- Account Timeline -->
          <div class="profile-card">
            <h3>
              <mat-icon>schedule</mat-icon>
              Account Timeline
            </h3>
            <dl class="meta-grid">
              <dt>Profile ID</dt><dd>{{ profile()!.id }}</dd>
              <dt>Role</dt><dd>{{ profile()!.role | titlecase }}</dd>
              <dt>Created</dt><dd>{{ profile()!.createdAt | date: 'medium' }}</dd>
              <dt>Last Updated</dt><dd>{{ profile()!.updatedAt | date: 'medium' }}</dd>
              <dt>Last Login</dt><dd>{{ profile()!.lastLogin ? (profile()!.lastLogin | date: 'medium') : 'Never' }}</dd>
            </dl>
          </div>

          <!-- Profile Completion -->
          <div class="profile-card">
            <h3>
              <mat-icon>assessment</mat-icon>
              Profile Completion
            </h3>
            <div class="progress-row">
              <div class="progress-bar">
                <span [style.width.%]="profileCompletion()"></span>
              </div>
              <span class="progress-value">{{ profileCompletion() }}%</span>
            </div>
            <p class="progress-text">Complete your profile to unlock advanced features.</p>
            <div class="completion-checklist">
              <div class="check-item" [class.completed]="profile()!.avatar">
                <mat-icon>{{ profile()!.avatar ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                <span>Profile Picture</span>
              </div>
              <div class="check-item" [class.completed]="profile()!.bio">
                <mat-icon>{{ profile()!.bio ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                <span>Bio / Description</span>
              </div>
              <div class="check-item" [class.completed]="profile()!.phone">
                <mat-icon>{{ profile()!.phone ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                <span>Phone Number</span>
              </div>
              <div class="check-item" [class.completed]="profile()!.isEmailVerified">
                <mat-icon>{{ profile()!.isEmailVerified ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                <span>Email Verification</span>
              </div>
            </div>
          </div>
        </section>
      } @else {
        <div class="empty-state">
          <mat-icon>person_off</mat-icon>
          <p>Profile data is not available.</p>
          <a mat-stroked-button routerLink="/dashboard">Back to dashboard</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      animation: fadeIn 0.3s ease-out;
      padding: 24px;
      
      @media (max-width: 768px) {
        padding: 16px;
      }
    }

    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ghost-btn {
      border-color: var(--border-accent) !important;
      color: var(--text-secondary) !important;
      
      &:hover {
        background: var(--accent-light) !important;
        color: var(--accent-color) !important;
      }
    }

    .primary-btn {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark)) !important;
      color: #fff !important;
      border-radius: 12px !important;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-accent);
      }
    }

    .center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 0;
      gap: 16px;
      
      p {
        color: var(--text-secondary);
      }
    }

    .profile-hero {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 24px;
      padding: 28px;
      background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), rgba(var(--accent-rgb), 0.02));
      border: 1px solid var(--border);
      border-radius: 24px;
      position: relative;
      overflow: hidden;
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        text-align: center;
        padding: 20px;
      }
    }

    .profile-hero::before {
      content: '';
      position: absolute;
      right: -80px;
      top: -120px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(var(--accent-rgb), 0.15) 0%, rgba(var(--accent-rgb), 0) 70%);
    }

    .avatar {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background: var(--card-bg);
      border: 3px solid var(--accent-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--accent-color);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      
      @media (max-width: 768px) {
        margin: 0 auto;
      }
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-content {
      @media (max-width: 768px) {
        text-align: center;
      }
      
      h2 {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--text-primary);
        
        @media (max-width: 768px) {
          font-size: 1.5rem;
        }
      }
      
      .username {
        margin: 4px 0 0;
        color: var(--accent-color);
        font-size: 0.9rem;
      }
    }

    .hero-title {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-start;
      
      @media (max-width: 768px) {
        justify-content: center;
      }
    }

    .role-chip {
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--accent-light);
      color: var(--accent-color);
      letter-spacing: 0.05em;
    }

    .status-row {
      display: flex;
      gap: 12px;
      margin: 16px 0 12px;
      flex-wrap: wrap;
      
      @media (max-width: 768px) {
        justify-content: center;
      }
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .status-chip--success { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-chip--warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-chip--danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .bio-text {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 540px;
      
      @media (max-width: 768px) {
        max-width: 100%;
      }
    }

    .profile-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }

    .profile-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--border-accent);
        box-shadow: var(--shadow-sm);
      }
      
      h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 20px;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        
        mat-icon {
          color: var(--accent-color);
        }
      }
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
      font-size: 0.9rem;
      
      mat-icon {
        color: var(--accent-color);
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-top: 1px;
      }
      
      strong {
        color: var(--text-primary);
      }
    }

    .meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px 16px;
      
      dt {
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      
      dd {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-primary);
        font-weight: 500;
      }
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 999px;
      border: 1px solid var(--border-light);
      overflow: hidden;
      
      span {
        display: block;
        height: 100%;
        background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
        border-radius: 999px;
        transition: width 0.3s ease;
      }
    }

    .progress-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .progress-text {
      margin: 12px 0 0;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .completion-checklist {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      
      .check-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.8rem;
        color: var(--text-secondary);
        
        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--text-tertiary);
        }
        
        &.completed {
          color: var(--text-primary);
          
          mat-icon {
            color: var(--success);
          }
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 80px 16px;
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        display: block;
        margin: 0 auto 16px;
        color: var(--text-tertiary);
      }
      
      p {
        margin-bottom: 20px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ProfileSettingsComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  profile = signal<User | null>(null);
  isLoading = signal(true);

  profileCompletion = computed(() => {
    const data = this.profile();
    if (!data) return 0;

    let score = 0;
    if (data.avatar) score += 25;
    if (data.phone) score += 15;
    if (data.bio) score += 20;
    if (data.isEmailVerified) score += 25;
    if (data.isActive) score += 15;
    return Math.min(score, 100);
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    
    this.userService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.profile.set(res.data);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load profile:', error);
          this.isLoading.set(false);
        }
      });
  }

  getFullName(): string {
    const user = this.profile();
    if (!user) return 'Admin User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || 'Admin User';
  }

  getDisplayName(): string {
    const user = this.profile();
    if (!user) return 'Admin';
    if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return user.username || 'Admin';
  }

  initials(): string {
    const user = this.profile();
    if (!user) return 'AD';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return 'AD';
  }

  formatFitnessGoal(goal?: string): string {
    const goals: Record<string, string> = {
      'muscle_gain': 'Muscle Gain',
      'weight_loss': 'Weight Loss',
      'endurance': 'Endurance',
      'flexibility': 'Flexibility',
      'general_fitness': 'General Fitness'
    };
    return goals[goal || ''] || 'Not specified';
  }

  formatActivityLevel(level?: string): string {
    const levels: Record<string, string> = {
      'sedentary': 'Sedentary',
      'lightly_active': 'Lightly Active',
      'moderately_active': 'Moderately Active',
      'very_active': 'Very Active',
      'extra_active': 'Extra Active'
    };
    return levels[level || ''] || 'Not specified';
  }

  editProfile(): void {
    const user = this.profile();
    if (user?.id) {
      this.router.navigate(['/users/edit', user.id]);
    }
  }
}