import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
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
  imports: [
    CommonModule, 
    RouterModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDialogModule, 
    MatSelectModule, 
    MatFormFieldModule, 
    FormsModule, 
    DataTableComponent, 
    PageHeaderComponent
  ],
  template: `
    <div class="workout-list-page">
      <app-page-header 
        title="Workouts" 
        [breadcrumbs]="[
          {label:'Dashboard', link:'/dashboard'},
          {label:'Workouts'}
        ]">
        <a mat-flat-button class="add-btn" routerLink="/workouts/create">
          <mat-icon>add</mat-icon> 
          Add Workout
        </a>
      </app-page-header>

      <div class="table-wrapper">
        <app-data-table
          [columns]="columns"
          [rows]="workouts()"
          [total]="total()"
          [loading]="isLoading()"
          [pageSize]="limit()"
          [pageIndex]="page() - 1"
          (searchChange)="onSearch($event)"
          (pageChange)="onPage($event)"
          (sortChange)="onSort($event)">
          <div *rowActions="let workout" class="action-buttons">
            <button mat-icon-button matTooltip="View" (click)="viewWorkout(workout)">
              <mat-icon>visibility</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Edit" (click)="editWorkout(workout)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Delete" (click)="deleteWorkout(workout)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </app-data-table>
      </div>
    </div>
  `,
  styles: [`
    .workout-list-page {
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
      
      mat-icon {
        color: white;
      }
      
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
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class WorkoutListComponent implements OnInit, OnDestroy {
  private workoutService = inject(WorkoutService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  workouts = signal<Workout[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  searchQuery = signal('');
  sortField = signal('');
  sortOrder = signal<'asc' | 'desc'>('asc');
  
  private searchSubject = new Subject<string>();

  columns: TableColumn<Workout>[] = [
    { 
      key: 'gif_link', 
      label: '', 
      type: 'image',
      width: '80px'
    },
    { 
      key: 'name', 
      label: 'Name', 
      sortable: true,
      width: '200px'
    },
    { 
      key: 'body_part', 
      label: 'Body Part', 
      type: 'badge',
      sortable: true,
      badgeClass: (value: string) => this.getBodyPartClass(value)
    },
    { 
      key: 'target_area', 
      label: 'Target Area',
      formatter: (value: string) => value || '—'
    },
    { 
      key: 'equipment', 
      label: 'Equipment',
      type: 'badge',
      badgeClass: (value: string) => this.getEquipmentClass(value)
    },
    { 
      key: 'level', 
      label: 'Level',
      type: 'badge',
      sortable: true,
      badgeClass: (value: string) => this.getLevelClass(value)
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      type: 'actions',
      width: '100px'
    },
  ];

  ngOnInit(): void {
    this.loadWorkouts();
    
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.page.set(1);
        this.loadWorkouts();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getBodyPartClass(bodyPart: string): string {
    const classes: Record<string, string> = {
      'chest': 'active',
      'back': 'info',
      'shoulders': 'warning',
      'legs': 'success',
      'arms': 'info',
      'core': 'active',
      'cardio': 'default'
    };
    return classes[bodyPart?.toLowerCase()] || 'default';
  }

  private getEquipmentClass(equipment: string): string {
    const classes: Record<string, string> = {
      'barbell': 'active',
      'dumbbell': 'info',
      'machine': 'warning',
      'cable': 'info',
      'bodyweight': 'success',
      'bands': 'default',
      'kettlebell': 'warning',
      'resistance band': 'default'
    };
    return classes[equipment?.toLowerCase()] || 'default';
  }

  private getLevelClass(level: string): string {
    const classes: Record<string, string> = {
      'beginner': 'success',
      'intermediate': 'warning',
      'advanced': 'active',
      'expert': 'active'
    };
    return classes[level?.toLowerCase()] || 'default';
  }

  loadWorkouts(): void {
    this.isLoading.set(true);
    
    const params: any = {
      page: this.page(),
      limit: this.limit()
    };
    
    // Add search query if present
    if (this.searchQuery() && this.searchQuery().trim() !== '') {
      params['search'] = this.searchQuery().trim();
    }
    
    // Add sort if present
    if (this.sortField()) {
      params['sortBy'] = this.sortField();
      params['sortOrder'] = this.sortOrder();
    }
    
    console.log('API Request Params:', params);
    
    this.workoutService.getWorkouts(params).subscribe({
      next: (apiResponse: any) => {
        console.log('API Response:', apiResponse);
        
        if (apiResponse.success && apiResponse.data) {
          // Handle paginated response
          const responseData = apiResponse.data;
          
          // Check if data is array or has items property
          let workoutsData: Workout[] = [];
          let totalItems = 0;
          
          if (Array.isArray(responseData)) {
            workoutsData = responseData;
            totalItems = responseData.length;
          } else if (responseData.items) {
            workoutsData = responseData.items;
            totalItems = responseData.total || responseData.items.length;
          } else if (responseData.data) {
            workoutsData = responseData.data;
            totalItems = responseData.pagination?.total || responseData.data.length;
          } else {
            workoutsData = responseData;
            totalItems = responseData.length;
          }
          
          // Also check for pagination object at root level
          if (apiResponse.pagination?.total) {
            totalItems = apiResponse.pagination.total;
          }
          
          this.workouts.set(workoutsData);
          this.total.set(totalItems);
          
          console.log(`Loaded ${workoutsData.length} workouts`);
          console.log(`Total items in DB: ${totalItems}`);
          console.log(`Current page: ${this.page()}`);
        } else {
          this.workouts.set([]);
          this.total.set(0);
        }
        
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load workouts:', error);
        this.notif.error('Failed to load workouts');
        this.workouts.set([]);
        this.total.set(0);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(query: string): void {
    console.log('Search query:', query);
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    console.log('Page change:', event);
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.loadWorkouts();
  }

  onSort(sort: Sort): void {
    console.log('Sort change:', sort);
    if (sort.active && sort.direction) {
      this.sortField.set(sort.active);
      this.sortOrder.set(sort.direction as 'asc' | 'desc');
    } else {
      this.sortField.set('');
      this.sortOrder.set('asc');
    }
    this.page.set(1);
    this.loadWorkouts();
  }

  viewWorkout(workout: Workout): void {
    this.router.navigate(['/workouts', workout.id]);
  }

  editWorkout(workout: Workout): void {
    this.router.navigate(['/workouts/edit', workout.id]);
  }

  deleteWorkout(workout: Workout): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Workout',
        message: `Are you sure you want to delete "${workout.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true
      }
    });
    
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.workoutService.deleteWorkout(workout.id).subscribe({
          next: () => {
            this.notif.success(`${workout.name} has been deleted`);
            this.loadWorkouts();
          },
          error: (error) => {
            console.error('Failed to delete workout:', error);
            this.notif.error('Failed to delete workout');
          }
        });
      }
    });
  }
}