import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutService } from '../../services/workout.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Workout } from '../../../../core/models/workout.interface';

@Component({
  selector: 'app-workout-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  template: `
    <div class="workout-detail-page">
      <app-page-header
        title="Workout Detail"
        [breadcrumbs]="[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Workouts', link: '/workouts' },
          { label: workout()?.name || 'Detail' }
        ]">
        <div class="header-actions">
          <a mat-stroked-button class="ghost-btn" routerLink="/workouts">
            <mat-icon>arrow_back</mat-icon>
            Back
          </a>
          <button mat-flat-button class="primary-btn" (click)="editWorkout()">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button mat-flat-button class="danger-btn" (click)="deleteWorkout()">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
        </div>
      </app-page-header>

      @if (isLoading()) {
        <div class="center">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (workout()) {
        <section class="hero-card">
          <div class="hero-media">
            <img
              [src]="workout()!.gif_link || placeholderImage"
              [alt]="workout()!.name"
              (error)="onImageError($event)" />
          </div>
          <div class="hero-content">
            <div class="hero-title">
              <h2>{{ workout()!.name }}</h2>
              <span class="tag" [class]="'tag--' + getLevelClass(workout()!.level)">
                {{ workout()!.level || 'Level N/A' }}
              </span>
            </div>
            <p class="subtitle">{{ workout()!.description || 'No description available.' }}</p>

            <div class="tag-row">
              <span class="chip" [class]="'chip--' + getBodyPartClass(workout()!.body_part)">
                {{ workout()!.body_part || 'Body part N/A' }}
              </span>
              <span class="chip chip--secondary">
                {{ workout()!.target_area || 'Target area N/A' }}
              </span>
              <span class="chip chip--tertiary">
                {{ workout()!.equipment || 'Bodyweight' }}
              </span>
            </div>

            <div class="focus-list">
              @for (item of focusPoints(); track item) {
                <div class="focus-item">
                  <mat-icon>check_circle</mat-icon>
                  <span>{{ item }}</span>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="detail-grid">
          <div class="detail-card">
            <h3>Technique Notes</h3>
            <p class="detail-text">
              Keep the movement controlled and maintain steady breathing. Adjust load and range
              of motion to match the selected level and equipment.
            </p>
            <div class="detail-points">
              <div class="point">
                <span class="point-label">Target Area</span>
                <span class="point-value">{{ workout()!.target_area || 'N/A' }}</span>
              </div>
              <div class="point">
                <span class="point-label">Equipment</span>
                <span class="point-value">{{ workout()!.equipment || 'N/A' }}</span>
              </div>
              <div class="point">
                <span class="point-label">Level</span>
                <span class="point-value">{{ workout()!.level || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Workout Metadata</h3>
            <dl class="meta-grid">
              <dt>Workout ID</dt><dd>{{ workout()!.id }}</dd>
              <dt>Body Part</dt><dd>{{ workout()!.body_part || 'N/A' }}</dd>
              <dt>Created</dt><dd>{{ workout()!.createdAt | date: 'medium' }}</dd>
              <dt>Updated</dt><dd>{{ workout()!.updatedAt | date: 'medium' }}</dd>
            </dl>
          </div>
        </section>
      } @else {
        <div class="empty-state">
          <mat-icon>fitness_center</mat-icon>
          <p>Workout details are not available.</p>
          <a mat-stroked-button routerLink="/workouts">Back to workouts</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .workout-detail-page {
      animation: fadeIn 0.3s ease-out;
      padding: 24px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ghost-btn {
      border-color: var(--border-accent) !important;
      color: var(--text-secondary) !important;
    }

    .primary-btn {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark)) !important;
      color: #fff !important;
      border-radius: 12px !important;
    }

    .danger-btn {
      background: rgba(239, 68, 68, 0.15) !important;
      color: #ef4444 !important;
      border-radius: 12px !important;
    }

    .center {
      display: flex;
      justify-content: center;
      padding: 60px 0;
    }

    .hero-card {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 24px;
      padding: 24px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      position: relative;
      overflow: hidden;
    }

    .hero-card::before {
      content: '';
      position: absolute;
      left: -120px;
      bottom: -140px;
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0) 70%);
    }

    .hero-media {
      width: 240px;
      height: 240px;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid var(--border-light);
      background: var(--bg-secondary);
    }

    .hero-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .hero-title h2 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Syne', sans-serif;
    }

    .subtitle {
      margin: 10px 0 16px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .tag {
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tag--active { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .tag--warning { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
    .tag--success { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .tag--default { background: var(--accent-light); color: var(--accent-color); }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }

    .chip {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.12);
      color: #3b82f6;
    }

    .chip--secondary {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
    }

    .chip--tertiary {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }

    .focus-list {
      display: grid;
      gap: 8px;
    }

    .focus-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    .focus-item mat-icon {
      color: var(--accent-color);
    }

    .detail-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .detail-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
    }

    .detail-card h3 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Syne', sans-serif;
    }

    .detail-text {
      margin: 0 0 16px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .detail-points {
      display: grid;
      gap: 10px;
    }

    .point {
      display: flex;
      justify-content: space-between;
      background: var(--surface-bg);
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 10px 12px;
    }

    .point-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .point-value {
      font-size: 0.85rem;
      color: var(--text-primary);
      font-weight: 600;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px 16px;
    }

    .meta-grid dt {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .meta-grid dd {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .empty-state {
      text-align: center;
      padding: 80px 16px;
      color: var(--text-secondary);
    }

    .empty-state mat-icon {
      font-size: 42px;
      width: 42px;
      height: 42px;
      display: block;
      margin: 0 auto 12px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
      .hero-card {
        grid-template-columns: 1fr;
      }

      .hero-media {
        width: 100%;
        height: 240px;
      }
    }
  `]
})
export class WorkoutDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);

  workout = signal<Workout | null>(null);
  isLoading = signal(true);

  placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="1.4"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.6"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';

  focusPoints = computed(() => {
    const data = this.workout();
    if (!data) return [] as string[];

    return [
      `Focus on ${data.target_area || data.body_part || 'the primary muscle group'}`,
      `Equipment: ${data.equipment || 'bodyweight'}`,
      `Level: ${data.level || 'all levels'}`,
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.workoutService.getWorkoutById(id).subscribe({
      next: (res) => {
        this.workout.set(res.data ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.workout.set(null);
        this.isLoading.set(false);
      }
    });
  }

  editWorkout(): void {
    const current = this.workout();
    if (!current) return;
    this.router.navigate(['/workouts/edit', current.id]);
  }

  deleteWorkout(): void {
    const current = this.workout();
    if (!current) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Workout',
        message: `Are you sure you want to delete "${current.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.workoutService.deleteWorkout(current.id).subscribe({
        next: () => {
          this.notif.success(`${current.name} has been deleted`);
          this.router.navigate(['/workouts']);
        },
        error: () => {
          this.notif.error('Failed to delete workout');
        }
      });
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.placeholderImage;
  }

  getBodyPartClass(bodyPart?: string): string {
    const classes: Record<string, string> = {
      'chest': 'active',
      'back': 'info',
      'shoulders': 'warning',
      'legs': 'success',
      'arms': 'info',
      'core': 'active',
      'cardio': 'default'
    };
    return classes[bodyPart?.toLowerCase() || ''] || 'default';
  }

  getLevelClass(level?: string): string {
    const classes: Record<string, string> = {
      'beginner': 'success',
      'intermediate': 'warning',
      'advanced': 'active',
      'expert': 'active'
    };
    return classes[level?.toLowerCase() || ''] || 'default';
  }
}
