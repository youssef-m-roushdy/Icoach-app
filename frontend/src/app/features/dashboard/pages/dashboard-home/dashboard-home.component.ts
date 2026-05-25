import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCardComponent } from '../../../../shared/components/stats-card/stats-card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { RouterLink } from '@angular/router';
import { interval, Subscription, forkJoin, of, catchError } from 'rxjs';
import { UserService } from '../../../users/services/user.service';
import { FoodService } from '../../../foods/services/food.service';
import { WorkoutService } from '../../../workouts/services/workout.service';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalFoods: number;
  totalWorkouts: number;
  lastUpdated: Date;
}

interface QuickAction {
  icon: string;
  label: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, StatsCardComponent, PageHeaderComponent, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private foodService = inject(FoodService);
  private workoutService = inject(WorkoutService);

  isLoading = signal(true);
  stats = signal<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalFoods: 0,
    totalWorkouts: 0,
    lastUpdated: new Date()
  });

  // Computed values for derived statistics
  activeRate = computed(() => {
    const total = this.stats().totalUsers;
    const active = this.stats().activeUsers;
    return total > 0 ? Math.round((active / total) * 100) : 0;
  });

  usersTrend = computed(() => 0);
  foodsTrend = computed(() => 0);
  workoutsTrend = computed(() => 0);

  lastUpdatedFormatted = computed(() => {
    return this.formatRelativeTime(this.stats().lastUpdated);
  });

  // Quick actions configuration
  quickActions: QuickAction[] = [
    {
      icon: 'group_add',
      label: 'Add User',
      route: '/dashboard/users/create',
      description: 'Create a new user account'
    },
    {
      icon: 'restaurant_menu',
      label: 'Manage Foods',
      route: '/dashboard/foods',
      description: 'Update food database'
    },
    {
      icon: 'fitness_center',
      label: 'Add Workout',
      route: '/dashboard/workouts/create',
      description: 'Create new exercise'
    },
    {
      icon: 'analytics',
      label: 'View Reports',
      route: '/dashboard/reports',
      description: 'Analytics & insights'
    }
  ];

  // System health indicators
  systemStatus = signal({
    apiGateway: 'operational',
    database: 'operational',
    lastCheck: new Date()
  });

  private refreshSubscription?: Subscription;

  constructor() {}

  ngOnInit(): void {
    this.loadDashboardData();
    // Periodic data refresh (every 30 seconds)
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadDashboardData(false);
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadDashboardData(showLoading: boolean = true): void {
    if (showLoading) {
      this.isLoading.set(true);
    }

    forkJoin({
      users: this.userService.getUsers({ page: 1, limit: 1 }).pipe(catchError(() => of(null))),
      foods: this.foodService.getFoods({ page: 1, limit: 1 }).pipe(catchError(() => of(null))),
      workouts: this.workoutService.getWorkouts({ page: 1, limit: 1 }).pipe(catchError(() => of(null))),
    }).subscribe(({ users, foods, workouts }) => {
      const totalUsers = this.extractTotal(users);
      const totalFoods = this.extractTotal(foods);
      const totalWorkouts = this.extractTotal(workouts);

      this.stats.set({
        totalUsers,
        activeUsers: totalUsers,
        totalFoods,
        totalWorkouts,
        lastUpdated: new Date(),
      });

      this.systemStatus.update(current => ({
        ...current,
        lastCheck: new Date(),
      }));

      this.isLoading.set(false);
    });
  }

  private extractTotal(response: any): number {
    if (!response) return 0;
    const pagination = response.pagination || response.data?.pagination;
    if (pagination) {
      return pagination.total ?? pagination.totalItems ?? pagination.count ?? 0;
    }
    const data = response.data;
    if (Array.isArray(data)) return data.length;
    if (typeof data?.total === 'number') return data.total;
    return 0;
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 10) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}