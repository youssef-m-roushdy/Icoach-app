import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
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
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatDialogModule, DataTableComponent, PageHeaderComponent],
  template: `
    <div class="food-list">
      <app-page-header title="Foods" [breadcrumbs]="[{label:'Dashboard',link:'/dashboard'},{label:'Foods'}]">
        <a mat-flat-button color="primary" routerLink="/foods/create">
          <mat-icon>add</mat-icon> Add Food
        </a>
      </app-page-header>

      <app-data-table
        [columns]="columns"
        [rows]="foods()"
        [total]="total()"
        [loading]="isLoading()"
        (searchChange)="onSearch($event)"
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)">
      </app-data-table>
    </div>
  `,
  styles: [`.food-list { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`]
})
export class FoodListComponent implements OnInit {
  private foodService = inject(FoodService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);

  foods = signal<Food[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  private search$ = new Subject<string>();

  columns: TableColumn<Food>[] = [
    { key: 'imageUrl', label: '', type: 'image' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', type: 'badge', badgeClass: () => 'user' },
    { key: 'calories', label: 'Calories', sortable: true, formatter: v => `${v} kcal` },
    { key: 'protein', label: 'Protein', formatter: v => `${v}g` },
    { key: 'carbs', label: 'Carbs', formatter: v => `${v}g` },
    { key: 'fat', label: 'Fat', formatter: v => `${v}g` },
    { key: 'actions', label: '', type: 'actions' },
  ];

  ngOnInit(): void {
    this.loadFoods();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { this.page.set(1); this.loadFoods(); });
  }

  loadFoods(): void {
    this.isLoading.set(true);
    this.foodService.getFoods({ page: this.page(), limit: this.limit() }).subscribe({
      next: res => { const d = res.data as any; this.foods.set(d?.items || d || []); this.total.set(d?.total || 0); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  onSearch(q: string): void { this.search$.next(q); }
  onPage(e: PageEvent): void { this.page.set(e.pageIndex + 1); this.limit.set(e.pageSize); this.loadFoods(); }
  onSort(s: Sort): void { this.loadFoods(); }

  deleteFood(food: Food): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Food', message: `Delete "${food.name}"?`, danger: true, confirmText: 'Delete' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) this.foodService.deleteFood(food.id).subscribe({ next: () => { this.notif.success('Food deleted'); this.loadFoods(); } });
    });
  }
}
