import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutService } from '../../services/workout.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Workout } from '../../../../core/models/workout.interface';
import { TableColumn } from '../../../../core/models/pagination.interface';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatDialogModule, MatSelectModule, MatFormFieldModule, FormsModule, DataTableComponent, PageHeaderComponent],
  template: `
    <div class="workout-list">
      <app-page-header title="Workouts" [breadcrumbs]="[{label:'Dashboard',link:'/dashboard'},{label:'Workouts'}]">
        <a mat-flat-button color="primary" routerLink="/workouts/create">
          <mat-icon>add</mat-icon> Add Workout
        </a>
      </app-page-header>

      <app-data-table
        [columns]="columns"
        [rows]="workouts()"
        [total]="total()"
        [loading]="isLoading()"
        (searchChange)="onSearch($event)"
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)">
      </app-data-table>
    </div>
  `,
  styles: [`.workout-list { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`]
})
export class WorkoutListComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);

  workouts = signal<Workout[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  private search$ = new Subject<string>();

  columns: TableColumn<Workout>[] = [
    { key: 'gifUrl', label: '', type: 'image' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', type: 'badge', badgeClass: () => 'user' },
    { key: 'bodyPart', label: 'Body Part', type: 'badge', badgeClass: () => 'coach' },
    { key: 'difficulty', label: 'Difficulty', type: 'badge', badgeClass: v => v },
    { key: 'duration', label: 'Duration', formatter: v => `${v} min` },
    { key: 'calories', label: 'Calories', formatter: v => `${v} kcal` },
    { key: 'actions', label: '', type: 'actions' },
  ];

  ngOnInit(): void {
    this.loadWorkouts();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => { this.page.set(1); this.loadWorkouts(); });
  }

  loadWorkouts(): void {
    this.isLoading.set(true);
    this.workoutService.getWorkouts({ page: this.page(), limit: this.limit() }).subscribe({
      next: res => { const d = res.data as any; this.workouts.set(d?.items || d || []); this.total.set(d?.total || 0); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  onSearch(q: string): void { this.search$.next(q); }
  onPage(e: PageEvent): void { this.page.set(e.pageIndex + 1); this.limit.set(e.pageSize); this.loadWorkouts(); }
  onSort(s: Sort): void { this.loadWorkouts(); }

  deleteWorkout(w: Workout): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Workout', message: `Delete "${w.name}"?`, danger: true, confirmText: 'Delete' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) this.workoutService.deleteWorkout(w.id).subscribe({ next: () => { this.notif.success('Workout deleted'); this.loadWorkouts(); } });
    });
  }
}
