import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.interface';
import { TableColumn } from '../../../../core/models/pagination.interface';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDialogModule, 
    MatMenuModule, 
    MatTooltipModule, 
    DataTableComponent, 
    PageHeaderComponent
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  users = signal<User[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  searchQuery = signal('');
  sortField = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  private searchSubject = new Subject<string>();

  columns: TableColumn<User>[] = [
    { 
      key: 'avatar', 
      label: '', 
      type: 'image',
      width: '70px'
    },
    { 
      key: 'firstName', 
      label: 'First Name', 
      sortable: true,
      width: '120px'
    },
    { 
      key: 'lastName', 
      label: 'Last Name', 
      sortable: true,
      width: '120px'
    },
    { 
      key: 'username', 
      label: 'Username', 
      sortable: true,
      width: '150px'
    },
    { 
      key: 'email', 
      label: 'Email', 
      sortable: true,
      width: '200px'
    },
    { 
      key: 'role', 
      label: 'Role', 
      type: 'badge',
      sortable: true,
      badgeClass: (value: string) => this.getRoleClass(value)
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      type: 'badge',
      sortable: true,
      badgeClass: (value: boolean) => value ? 'active' : 'inactive',
      formatter: (value: boolean) => value ? 'Active' : 'Inactive'
    },
    { 
      key: 'isEmailVerified', 
      label: 'Verified', 
      type: 'badge',
      badgeClass: (value: boolean) => value ? 'verified' : 'unverified',
      formatter: (value: boolean) => value ? 'Verified' : 'Pending'
    },
    { 
      key: 'createdAt', 
      label: 'Joined', 
      sortable: true,
      formatter: (value: string) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'actions', 
      label: '', 
      type: 'actions',
      width: '100px'
    },
  ];

  ngOnInit(): void {
    this.loadUsers();
    
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.page.set(1);
        this.loadUsers();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      'admin': 'admin',
      'user': 'user',
      'coach': 'coach',
      'trainer': 'coach'
    };
    return classes[role?.toLowerCase()] || 'default';
  }

  loadUsers(): void {
    this.isLoading.set(true);
    
    const params: any = {
      page: this.page(),
      limit: this.limit()
    };
    
    if (this.searchQuery() && this.searchQuery().trim() !== '') {
      params['search'] = this.searchQuery().trim();
    }
    
    if (this.sortField()) {
      params['sortBy'] = this.sortField();
      params['sortOrder'] = this.sortOrder();
    }
    
    this.userService.getUsers(params).subscribe({
      next: (response: any) => {
        let usersData: User[] = [];
        let totalCount = 0;
        
        if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            usersData = response.data;
            totalCount = response.data.length;
          } else if (response.data.items) {
            usersData = response.data.items;
            totalCount = response.data.total || 0;
          } else if (response.data.users) {
            usersData = response.data.users;
            totalCount = response.data.total || 0;
          } else if (response.pagination) {
            usersData = [response.data];
            totalCount = response.pagination.total || 0;
          } else {
            usersData = [response.data];
            totalCount = 1;
          }
        }
        
        if (response.pagination?.total) {
          totalCount = response.pagination.total;
        }
        
        this.users.set(usersData);
        this.total.set(totalCount);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.notif.error('Failed to load users');
        this.users.set([]);
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
    this.loadUsers();
  }

  onSort(sort: Sort): void {
    if (sort.active && sort.direction) {
      this.sortField.set(sort.active);
      this.sortOrder.set(sort.direction as 'asc' | 'desc');
    } else {
      this.sortField.set('createdAt');
      this.sortOrder.set('desc');
    }
    this.page.set(1);
    this.loadUsers();
  }

  viewUser(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/users/edit', user.id]);
  }

  deleteUser(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete User',
        message: `Are you sure you want to delete ${user.firstName} ${user.lastName}?`,
        danger: true,
        confirmText: 'Delete'
      }
    });
    
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.notif.success(`${user.firstName} ${user.lastName} has been deleted`);
            this.loadUsers();
          },
          error: (error) => {
            console.error('Failed to delete user:', error);
            this.notif.error('Failed to delete user');
          }
        });
      }
    });
  }
}