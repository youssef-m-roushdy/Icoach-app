import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.interface';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  user = signal<User | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUser(id: string): void {
    this.isLoading.set(true);
    this.userService.getUserById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.user.set(res.data);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load user:', error);
          this.notif.error('Failed to load user details');
          this.isLoading.set(false);
        }
      });
  }

  getFullName(): string {
    const user = this.user();
    if (!user) return 'N/A';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.username || 'N/A';
  }

  getDisplayName(): string {
    const user = this.user();
    if (!user) return 'User';
    if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    if (user.username) return user.username;
    return 'User';
  }

  initials(): string {
    const user = this.user();
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return 'U';
  }

  formatGender(gender?: string): string {
    if (!gender) return 'Not specified';
    const genders: Record<string, string> = {
      'male': 'Male',
      'female': 'Female',
      'other': 'Other'
    };
    return genders[gender] || gender;
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
}