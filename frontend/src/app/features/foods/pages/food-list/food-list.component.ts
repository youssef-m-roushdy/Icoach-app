import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FoodService } from '../../services/food.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Food } from '../../../../core/models/food.interface';
import { TableColumn } from '../../../../core/models/pagination.interface';

@Component({
  selector: 'app-food-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    DataTableComponent,
    PageHeaderComponent
  ],
  template: `
    <div class="food-list-page">
      <app-page-header
        title="Foods"
        [breadcrumbs]="[
          {label:'Dashboard', link:'/dashboard'},
          {label:'Foods'}
        ]">
        <a mat-flat-button class="add-btn" routerLink="/foods/create">
          <mat-icon>add</mat-icon>
          Add Food
        </a>
      </app-page-header>

      <div class="table-wrapper">
        <app-data-table
          [columns]="columns"
          [rows]="foods()"
          [total]="total()"
          [loading]="isLoading()"
          [pageSize]="limit()"
          [pageIndex]="page() - 1"
          (searchChange)="onSearch($event)"
          (pageChange)="onPage($event)"
          (sortChange)="onSort($event)">
          <ng-template #rowActions let-food>
            <div class="action-buttons">
              <button mat-icon-button matTooltip="View" (click)="viewFood(food)">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Edit" (click)="editFood(food)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Delete" (click)="deleteFood(food)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </div>
    </div>
  `,
  styles: [`
    .food-list-page {
      animation: fadeIn 0.3s ease-out;
      padding: 24px;

      @media (max-width: 768px) {
        padding: 16px;
      }
    }

    .add-btn {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark)) !important;
      color: white !important;
      border-radius: 12px !important;
      padding: 0 20px !important;
      height: 40px !important;

      mat-icon { color: white; }

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-accent);
      }
    }

    .table-wrapper {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      margin-top: 24px;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FoodListComponent implements OnInit, OnDestroy {
  private foodService = inject(FoodService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  foods = signal<Food[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  searchQuery = signal('');
  sortField = signal('');
  sortOrder = signal<'asc' | 'desc'>('asc');

  private searchSubject = new Subject<string>();

  columns: TableColumn<Food>[] = [
    { key: 'pic',          label: '',        type: 'image',   width: '80px' },
    { key: 'name',         label: 'Name',    sortable: true,  width: '200px' },
    { key: 'calories',     label: 'Calories',sortable: true,  formatter: (v: number) => `${v} kcal` },
    { key: 'protein',      label: 'Protein',                  formatter: (v: number) => `${v}g` },
    { key: 'carbohydrate', label: 'Carbs',                    formatter: (v: number) => `${v}g` },
    { key: 'fat',          label: 'Fat',                      formatter: (v: number) => `${v}g` },
    { key: 'actions',      label: 'Actions', type: 'actions', width: '100px' },
  ];

  ngOnInit(): void {
    this.loadFoods();

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.loadFoods();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFoods(): void {
    this.isLoading.set(true);

    const params: Record<string, any> = {
      page:  this.page(),
      limit: this.limit(),
    };

    if (this.searchQuery()) params['search']    = this.searchQuery();
    if (this.sortField())   params['sortBy']    = this.sortField();
    if (this.sortField())   params['sortOrder'] = this.sortOrder();

    this.foodService.getFoods(params).subscribe({
      next: (apiResponse: any) => {
        this.foods.set(apiResponse.data ?? []);
        this.total.set(apiResponse.pagination?.totalItems ?? 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load foods:', err);
        this.notif.error('Failed to load foods');
        this.foods.set([]);
        this.total.set(0);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.loadFoods();
  }

  onSort(sort: Sort): void {
    if (sort.active && sort.direction) {
      this.sortField.set(sort.active);
      this.sortOrder.set(sort.direction as 'asc' | 'desc');
    } else {
      this.sortField.set('');
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.loadFoods();
  }

  viewFood(food: Food): void {
    this.router.navigate(['/foods', food.id]);
  }

  editFood(food: Food): void {
    this.router.navigate(['/foods/edit', food.id]);
  }

  deleteFood(food: Food): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'custom-dark-dialog', // التعديل الرئيسي هنا
      data: {
        title:       'Delete Food',
        message:     `Are you sure you want to delete "${food.name}"?`,
        confirmText: 'Delete',
        cancelText:  'Cancel',
        danger:      true,
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.foodService.deleteFood(food.id).subscribe({
        next: () => {
          this.notif.success(`${food.name} has been deleted`);
          this.loadFoods();
        },
        error: (err) => {
          console.error('Failed to delete food:', err);
          this.notif.error('Failed to delete food');
        }
      });
    });
  }
}