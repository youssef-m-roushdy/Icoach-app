import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
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
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatDialogModule, MatMenuModule, DataTableComponent, PageHeaderComponent, ConfirmDialogComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private notif = inject(NotificationService);

  users = signal<User[]>([]);
  total = signal(0);
  isLoading = signal(false);
  page = signal(1);
  limit = signal(10);
  search = signal('');
  sortBy = signal('createdAt');
  sortOrder = signal<'asc'|'desc'>('desc');

  private search$ = new Subject<string>();

  columns: TableColumn<User>[] = [
    { key: 'profileImage', label: '', type: 'image' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', type: 'badge', badgeClass: v => v },
    { key: 'isVerified', label: 'Verified', type: 'badge', badgeClass: v => v ? 'verified' : 'unverified', formatter: (v) => v ? 'Verified' : 'Pending' },
    { key: 'createdAt', label: 'Joined', sortable: true, formatter: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', type: 'actions' },
  ];

  ngOnInit(): void {
    this.loadUsers();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(q => {
      this.search.set(q);
      this.page.set(1);
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers({
      page: this.page(),
      limit: this.limit(),
      search: this.search(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    }).subscribe({
      next: res => {
        const data = res.data as any;
        this.users.set(data?.items || data || []);
        this.total.set(data?.total || 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onSearch(q: string): void { this.search$.next(q); }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex + 1);
    this.limit.set(e.pageSize);
    this.loadUsers();
  }

  onSort(s: Sort): void {
    this.sortBy.set(s.active);
    this.sortOrder.set(s.direction as 'asc'|'desc');
    this.loadUsers();
  }

  deleteUser(user: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete User', message: `Are you sure you want to delete ${user.name}?`, danger: true, confirmText: 'Delete' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.deleteUser(user.id).subscribe({
        next: () => { this.notif.success('User deleted'); this.loadUsers(); },
        error: () => {},
      });
    });
  }
}
