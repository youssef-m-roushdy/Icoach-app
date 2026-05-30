import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.interface';
import { TableColumn } from '../../../../core/models/pagination.interface';
import { CustomFilterComponent, FilterOption } from '../../../../shared/components/custom-filter/custom-filter.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    DataTableComponent,
    PageHeaderComponent,
    CustomFilterComponent,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private notif      = inject(NotificationService);
  private router     = inject(Router);
  private destroy$   = new Subject<void>();

  users      = signal<User[]>([]);
  total      = signal(0);
  isLoading  = signal(false);
  page       = signal(1);
  limit      = signal(10);
  searchQuery = signal('');
  sortField  = signal('createdAt');
  sortOrder  = signal<'asc' | 'desc'>('desc');

  // Tracks which user ids are mid-toggle so we can show a spinner
  togglingUsers = new Set<number | string>();

  // Filter form controls
  roleFilter          = new FormControl<string>('');
  emailVerifiedFilter = new FormControl<boolean | ''>('');
  isActiveFilter      = new FormControl<boolean | ''>('');

  private searchSubject = new Subject<string>();

  columns: TableColumn<User>[] = [
    { key: 'avatar',    label: '',           type: 'image',   width: '70px'  },
    { key: 'firstName', label: 'First Name', sortable: true,  width: '120px' },
    { key: 'lastName',  label: 'Last Name',  sortable: true,  width: '120px' },
    { key: 'username',  label: 'Username',   sortable: true,  width: '150px' },
    { key: 'email',     label: 'Email',      sortable: true,  width: '200px' },
    {
      key: 'role',
      label: 'Role',
      type: 'badge',
      sortable: true,
      badgeClass: (value: string) => this.getRoleClass(value),
    },
    {
      key: 'isEmailVerified',
      label: 'Verified',
      type: 'badge',
      badgeClass: (value: boolean) => (value ? 'verified' : 'unverified'),
      formatter:  (value: boolean) => (value ? 'Verified' : 'Pending'),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      formatter: (value: string) => new Date(value).toLocaleDateString(),
    },
    // Status toggle — rendered via #statusCell projected template
    { key: 'isActive', label: 'Status', type: 'custom', width: '150px' },
    { key: 'actions',  label: '',       type: 'actions', width: '100px' },
  ];

    roleOptions: FilterOption[] = [
    { value: 'user',  label: 'User',  icon: 'person',          dot: '#3b82f6' },
    { value: 'coach', label: 'Coach', icon: 'fitness_center',  dot: '#8b5cf6' },
    { value: 'admin', label: 'Admin', icon: 'shield',          dot: '#f97316' },
  ];

  emailStatusOptions: FilterOption[] = [
    { value: true,  label: 'Verified', icon: 'verified',      dot: '#22c55e' },
    { value: false, label: 'Pending',  icon: 'schedule',      dot: '#f59e0b' },
  ];

  activeStatusOptions: FilterOption[] = [
    { value: true,  label: 'Active',   icon: 'check_circle',  dot: '#22c55e' },
    { value: false, label: 'Inactive', icon: 'cancel',        dot: '#ef4444' },
  ];

  ngOnInit(): void {
    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
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
    const map: Record<string, string> = {
      admin:   'admin',
      user:    'user',
      coach:   'coach',
      trainer: 'coach',
    };
    return map[role?.toLowerCase()] ?? 'default';
  }

  loadUsers(): void {
    this.isLoading.set(true);

    const params: Record<string, any> = {
      page:  this.page(),
      limit: this.limit(),
    };

    if (this.searchQuery().trim()) {
      params['search'] = this.searchQuery().trim();
    }

    if (this.sortField()) {
      params['sortBy']    = this.sortField();
      params['sortOrder'] = this.sortOrder();
    }

    const role = this.roleFilter.value;
    if (role) params['role'] = role;

    const emailVerified = this.emailVerifiedFilter.value;
    if (emailVerified !== '' && emailVerified !== null) {
      params['isEmailVerified'] = emailVerified;
    }

    const isActive = this.isActiveFilter.value;
    if (isActive !== '' && isActive !== null) {
      params['isActive'] = isActive;
    }

    this.userService.getUsers(params).subscribe({
      next: (response: any) => {
        let usersData: User[] = [];
        let totalCount = 0;

        if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            usersData  = response.data;
            totalCount = response.data.length;
          } else if (response.data.items) {
            usersData  = response.data.items;
            totalCount = response.data.total ?? 0;
          } else if (response.data.users) {
            usersData  = response.data.users;
            totalCount = response.data.total ?? 0;
          } else {
            usersData  = [response.data];
            totalCount = response.pagination?.total ?? 1;
          }
        }

        if (response.pagination?.total) {
          totalCount = response.pagination.total;
        }

        this.users.set(usersData);
        this.total.set(totalCount);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.notif.error('Failed to load users');
        this.users.set([]);
        this.total.set(0);
        this.isLoading.set(false);
      },
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
    this.sortField.set(sort.active && sort.direction ? sort.active : 'createdAt');
    this.sortOrder.set((sort.direction as 'asc' | 'desc') || 'desc');
    this.page.set(1);
    this.loadUsers();
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadUsers();
  }

  clearFilters(): void {
    this.roleFilter.setValue('');
    this.emailVerifiedFilter.setValue('');
    this.isActiveFilter.setValue('');
    this.page.set(1);
    this.loadUsers();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.roleFilter.value ||
      this.emailVerifiedFilter.value !== '' ||
      this.isActiveFilter.value !== ''
    );
  }

  toggleUserStatus(user: User): void {
    if (this.togglingUsers.has(user.id)) return;

    this.togglingUsers.add(user.id);

    const action$ = user.isActive
      ? this.userService.deactivateUser(user.id)
      : this.userService.activateUser(user.id);

    action$.subscribe({
      next: () => {
        this.togglingUsers.delete(user.id);
        // Optimistic update — no full reload needed
        this.users.update(list =>
          list.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
        );
        this.notif.success(
          `${user.firstName} ${user.lastName} ${user.isActive ? 'deactivated' : 'activated'} successfully`
        );
      },
      error: (err) => {
        console.error('Failed to toggle user status:', err);
        this.togglingUsers.delete(user.id);
        this.notif.error('Failed to update user status');
      },
    });
  }

  viewUser(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/users/edit', user.id]);
  }
}