import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCardComponent } from '../../../../shared/components/stats-card/stats-card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, StatsCardComponent, PageHeaderComponent],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent {
  isLoading = signal(true);
  stats = signal({ totalUsers: 0, activeUsers: 0, totalFoods: 0, totalWorkouts: 0 });

  constructor() {
    this.stats.set({
      totalUsers: 128,
      activeUsers: 102,
      totalFoods: 86,
      totalWorkouts: 34,
    });
    this.isLoading.set(false);
  }
}
