import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FoodService } from '../../services/food.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Food } from '../../../../core/models/food.interface';

@Component({
  selector: 'app-food-detail',
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
    <div class="food-detail-page">
      <app-page-header
        title="Food Detail"
        [breadcrumbs]="[
          { label: 'Dashboard', link: '/dashboard' },
          { label: 'Foods', link: '/foods' },
          { label: food()?.name || 'Detail' }
        ]">
        <div class="header-actions">
          <a mat-stroked-button class="ghost-btn" routerLink="/foods">
            <mat-icon>arrow_back</mat-icon>
            Back
          </a>
          <button mat-flat-button class="primary-btn" (click)="editFood()">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button mat-flat-button class="danger-btn" (click)="deleteFood()">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
        </div>
      </app-page-header>

      @if (isLoading()) {
        <div class="center">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (food()) {
        <section class="hero-card">
          <div class="hero-media">
            <img
              [src]="food()!.pic || placeholderImage"
              [alt]="food()!.name"
              (error)="onImageError($event)" />
          </div>
          <div class="hero-content">
            <div class="hero-title">
              <div>
                <h2>{{ food()!.name }}</h2>
                <p class="subtitle">{{ food()!.calories }} kcal per serving</p>
              </div>
              <span class="category-chip" [class]="'chip--' + getCategoryClass(food()!.category)">
                {{ food()!.category || 'Uncategorized' }}
              </span>
            </div>

            <div class="macro-grid">
              <div class="macro-card">
                <span class="macro-label">Protein</span>
                <span class="macro-value">{{ food()!.protein }}g</span>
              </div>
              <div class="macro-card">
                <span class="macro-label">Carbs</span>
                <span class="macro-value">{{ food()!.carbohydrate }}g</span>
              </div>
              <div class="macro-card">
                <span class="macro-label">Fat</span>
                <span class="macro-value">{{ food()!.fat }}g</span>
              </div>
              <div class="macro-card">
                <span class="macro-label">Sugar</span>
                <span class="macro-value">{{ food()!.sugar ?? 0 }}g</span>
              </div>
            </div>
          </div>
        </section>

        <section class="detail-grid">
          <div class="detail-card">
            <h3>Macro Split</h3>
            <div class="macro-bars">
              <div class="macro-row">
                <span class="row-label">Protein</span>
                <div class="bar"><span class="bar-fill protein" [style.width.%]="macroBreakdown().proteinPct"></span></div>
                <span class="row-value">{{ macroBreakdown().proteinPct }}%</span>
              </div>
              <div class="macro-row">
                <span class="row-label">Carbs</span>
                <div class="bar"><span class="bar-fill carbs" [style.width.%]="macroBreakdown().carbsPct"></span></div>
                <span class="row-value">{{ macroBreakdown().carbsPct }}%</span>
              </div>
              <div class="macro-row">
                <span class="row-label">Fat</span>
                <div class="bar"><span class="bar-fill fat" [style.width.%]="macroBreakdown().fatPct"></span></div>
                <span class="row-value">{{ macroBreakdown().fatPct }}%</span>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Food Metadata</h3>
            <dl class="meta-grid">
              <dt>Food ID</dt><dd>{{ food()!.id }}</dd>
              <dt>Category</dt><dd>{{ food()!.category || 'Uncategorized' }}</dd>
              <dt>Created</dt><dd>{{ food()!.createdAt | date: 'medium' }}</dd>
              <dt>Updated</dt><dd>{{ food()!.updatedAt | date: 'medium' }}</dd>
            </dl>
          </div>
        </section>
      } @else {
        <div class="empty-state">
          <mat-icon>restaurant</mat-icon>
          <p>Food details are not available.</p>
          <a mat-stroked-button routerLink="/foods">Back to foods</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .food-detail-page {
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
      grid-template-columns: 220px 1fr;
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
      right: -80px;
      top: -120px;
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, rgba(var(--accent-rgb), 0.18) 0%, rgba(var(--accent-rgb), 0) 70%);
    }

    .hero-media {
      width: 220px;
      height: 220px;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid var(--border-light);
      background: var(--bg-secondary);
      flex-shrink: 0;
    }

    .hero-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-title {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
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
      margin: 6px 0 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .category-chip {
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .chip--active { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .chip--info { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
    .chip--warning { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
    .chip--success { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .chip--default { background: var(--accent-light); color: var(--accent-color); }

    .macro-grid {
      margin-top: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .macro-card {
      background: var(--surface-bg);
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 14px 16px;
    }

    .macro-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .macro-value {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-top: 6px;
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

    .macro-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .macro-row {
      display: grid;
      grid-template-columns: 80px 1fr 50px;
      align-items: center;
      gap: 12px;
    }

    .row-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .row-value {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
    }

    .bar {
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--border-light);
    }

    .bar-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
    }

    .bar-fill.protein { background: #10b981; }
    .bar-fill.carbs { background: #3b82f6; }
    .bar-fill.fat { background: #f59e0b; }

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
        height: 220px;
      }
    }
  `]
})
export class FoodDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private foodService = inject(FoodService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);

  food = signal<Food | null>(null);
  isLoading = signal(true);

  placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="1.4"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.6"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';

  macroBreakdown = computed(() => {
    const data = this.food();
    const protein = data?.protein ?? 0;
    const carbs = data?.carbohydrate ?? 0;
    const fat = data?.fat ?? 0;
    const total = protein + carbs + fat;
    const pct = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;

    return {
      protein,
      carbs,
      fat,
      total,
      proteinPct: pct(protein),
      carbsPct: pct(carbs),
      fatPct: pct(fat),
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.foodService.getFoodById(id).subscribe({
      next: (res) => {
        this.food.set(res.data ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.food.set(null);
        this.isLoading.set(false);
      }
    });
  }

  editFood(): void {
    const current = this.food();
    if (!current) return;
    this.router.navigate(['/foods/edit', current.id]);
  }

  deleteFood(): void {
    const current = this.food();
    if (!current) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Food',
        message: `Are you sure you want to delete "${current.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.foodService.deleteFood(current.id).subscribe({
        next: () => {
          this.notif.success(`${current.name} has been deleted`);
          this.router.navigate(['/foods']);
        },
        error: () => {
          this.notif.error('Failed to delete food');
        }
      });
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.placeholderImage;
  }

  getCategoryClass(category?: string): string {
    const map: Record<string, string> = {
      'Protein': 'active',
      'Carbohydrates': 'info',
      'Fats': 'warning',
      'Vegetables': 'success',
      'Fruits': 'success',
      'Dairy': 'info',
      'Beverages': 'default',
      'Snacks': 'warning',
    };
    return map[category ?? ''] ?? 'default';
  }
}
