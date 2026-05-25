import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
  templateUrl: './food-detail.component.html',
  styleUrls: ['./food-detail.component.scss']
})
export class FoodDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private foodService = inject(FoodService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  food = signal<Food | null>(null);
  isLoading = signal(true);

  placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="1.4"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.6"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';

  macroBreakdown = computed(() => {
    const data = this.food();
    const protein = data?.protein ?? 0;
    const carbs = data?.carbohydrate ?? 0;
    const fat = data?.fat ?? 0;
    const total = protein + carbs + fat;
    const pct = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;
    const caloriesFromMacros = (protein * 4) + (carbs * 4) + (fat * 9);
    const enteredCalories = data?.calories ?? 0;

    return {
      protein,
      carbs,
      fat,
      total,
      proteinPct: pct(protein),
      carbsPct: pct(carbs),
      fatPct: pct(fat),
      totalCalories: caloriesFromMacros,
      calorieDiff: enteredCalories - caloriesFromMacros
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFood(id);
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFood(id: string): void {
    this.isLoading.set(true);
    this.foodService.getFoodById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.food.set(res.data);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load food:', error);
          this.notif.error('Failed to load food details');
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Food',
        message: `Are you sure you want to delete "${current.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
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
}