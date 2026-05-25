import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { TableColumn } from '../../../core/models/pagination.interface';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    FormsModule,
    MatTooltipModule
  ],
  template: `
    <div class="data-table-wrapper" [class.loading]="loading">
      <!-- Enhanced Toolbar -->
      <div class="data-table__toolbar">
        <div class="search-wrapper">
          <div class="search-icon">
            <mat-icon>search</mat-icon>
          </div>
          <input
            type="text"
            class="search-input"
            placeholder="Search by name, category..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            [disabled]="loading">
          @if (searchQuery) {
            <button class="search-clear" (click)="clearSearch()" matTooltip="Clear search">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <div class="toolbar-actions">
          <ng-content select="[toolbar-actions]"></ng-content>
        </div>
      </div>

      <!-- Loading Progress -->
      @if (loading) {
        <mat-progress-bar mode="indeterminate" class="loading-bar"></mat-progress-bar>
      }

      <!-- Table Container -->
      <div class="table-container">
        <table mat-table [dataSource]="rows" matSort (matSortChange)="onSort($event)" [matSortActive]="sortActive" [matSortDirection]="sortDirection">

          <!-- Dynamic Columns -->
          @for (col of columns; track col.key) {
            <ng-container [matColumnDef]="col.key">
              <th mat-header-cell *matHeaderCellDef [mat-sort-header]="col.sortable ? col.key : ''" [style.width]="col.width">
                <div class="header-cell">
                  @if (col.icon) {
                    <mat-icon>{{ col.icon }}</mat-icon>
                  }
                  {{ col.label }}
                </div>
              </th>

              <td mat-cell *matCellDef="let row" [style.width]="col.width">
                @if (col.type === 'badge') {
                  <span class="badge" [ngClass]="getBadgeClass(col, row)">
                    {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
                  </span>
                }
                @else if (col.type === 'image') {
                  @if (row[col.key]) {
                    <img
                      [src]="row[col.key]"
                      class="table-img"
                      loading="lazy"
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      (error)="onImageError($event)">
                  } @else {
                    <img
                      [src]="getPlaceholderImage()"
                      class="table-img"
                      loading="lazy">
                  }
                }
                @else if (col.type === 'actions') {
                  <div class="action-buttons">
                    <ng-container *ngTemplateOutlet="rowActionsTpl; context: { $implicit: row }"></ng-container>
                  </div>
                }
                @else if (col.type === 'status') {
                  <span class="status-badge" [class]="getStatusClass(row[col.key])">
                    <span class="status-dot"></span>
                    {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
                  </span>
                }
                @else {
                  <span class="cell-value" [class.truncate]="col.truncate" [matTooltip]="col.truncate ? row[col.key] : ''">
                    {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
                  </span>
                }
              </td>
            </ng-container>
          }

          <tr mat-header-row *matHeaderRowDef="columnKeys; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columnKeys;" class="data-row" [class.clickable]="rowClickable" (click)="onRowClick(row)"></tr>

          <!-- No Data Row -->
          <tr class="mat-mdc-no-data-row" *matNoDataRow>
            <td [attr.colspan]="columns.length" class="no-data">
              <mat-icon>inbox</mat-icon>
              <span>No data found</span>
              @if (searchQuery) {
                <button class="clear-search-btn" (click)="clearSearch()">
                  <mat-icon>clear</mat-icon>
                  Clear search
                </button>
              }
            </td>
          </tr>
        </table>
      </div>

      <!-- Custom Pagination -->
      @if (total > 0) {
        <div class="custom-paginator">
          <div class="paginator-info">
            Showing {{ getStartIndex() }} to {{ getEndIndex() }} of {{ total }} entries
          </div>

          <div class="paginator-controls">
            <button
              class="paginator-btn"
              [disabled]="pageIndex === 0"
              (click)="goToFirstPage()"
              matTooltip="First page">
              <mat-icon>first_page</mat-icon>
            </button>

            <button
              class="paginator-btn"
              [disabled]="pageIndex === 0"
              (click)="goToPreviousPage()"
              matTooltip="Previous page">
              <mat-icon>chevron_left</mat-icon>
            </button>

            <div class="paginator-pages">
              @for (page of getVisiblePages(); track page) {
                <button
                  class="page-btn"
                  [class.active]="page === pageIndex + 1"
                  (click)="goToPage(page - 1)">
                  {{ page }}
                </button>
              }
            </div>

            <button
              class="paginator-btn"
              [disabled]="getEndIndex() >= total"
              (click)="goToNextPage()"
              matTooltip="Next page">
              <mat-icon>chevron_right</mat-icon>
            </button>

            <button
              class="paginator-btn"
              [disabled]="getEndIndex() >= total"
              (click)="goToLastPage()"
              matTooltip="Last page">
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-table-wrapper {
      background: var(--card-bg);
      border-radius: 20px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: all 0.3s ease;

      &.loading {
        opacity: 0.8;
      }
    }

    .data-table__toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-light);
      flex-wrap: wrap;
      background: var(--bg-secondary);

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
      }
    }

    .search-wrapper {
      flex: 1;
      min-width: 320px;
      position: relative;
      display: flex;
      align-items: center;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 14px;
      transition: all 0.3s ease;

      &:focus-within {
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px var(--accent-light);
      }

      &:hover {
        border-color: var(--border-accent);
      }

      .search-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px 0 16px;
        color: var(--text-secondary);

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .search-input {
        flex: 1;
        padding: 12px 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 14px;

        &::placeholder {
          color: var(--text-tertiary);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .search-clear {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 8px 16px 8px 8px;
        color: var(--text-secondary);
        transition: all 0.2s ease;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          color: var(--error);
        }
      }
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .loading-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    .table-container {
      overflow-x: auto;
      position: relative;

      &::-webkit-scrollbar {
        height: 6px;
      }

      &::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 3px;

        &:hover {
          background: var(--accent-color);
        }
      }
    }

    table {
      width: 100%;
      min-width: 600px;
    }

    .mat-mdc-header-row {
      background: var(--bg-secondary);
    }

    .mat-mdc-header-cell {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.875rem;
      border-bottom-color: var(--border);
      white-space: nowrap;
      padding: 16px;
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--accent-color);
      }
    }

    .mat-mdc-cell {
      color: var(--text-secondary);
      border-bottom-color: var(--border-light);
      padding: 14px 16px;
      font-size: 0.875rem;
    }

    .data-row {
      transition: background 0.2s ease;
      cursor: pointer;

      &:hover {
        background: var(--bg-secondary);
      }

      &.clickable {
        cursor: pointer;
      }
    }

    .table-img {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      object-fit: cover;
      border: 1px solid var(--border-light);
      background: var(--bg-secondary);
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;

      &--active   { background: rgba(16, 185, 129, 0.12); color: #10b981; }
      &--inactive { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
      &--admin    { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
      &--user     { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
      &--info     { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
      &--warning  { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
      &--success  { background: rgba(16, 185, 129, 0.12); color: #10b981; }
      &--default  { background: var(--accent-light);       color: var(--accent-color); }
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      &.status--active   { background: rgba(16, 185, 129, 0.12); color: #10b981; }
      &.status--inactive { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
      &.status--pending  { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
      &.status--default  { background: var(--accent-light);       color: var(--accent-color); }
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .no-data {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-tertiary);

      mat-icon {
        display: block;
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
      }
    }

    .custom-paginator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-top: 1px solid var(--border-light);
      background: var(--card-bg);
      flex-wrap: wrap;
      gap: 16px;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: center;
      }
    }

    .paginator-info {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .paginator-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .paginator-btn, .page-btn {
      min-width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.2s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: var(--accent-light);
        border-color: var(--accent-color);
        color: var(--accent-color);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .paginator-pages {
      display: flex;
      gap: 4px;
      margin: 0 4px;
    }

    .page-btn.active {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-dark));
      border-color: var(--accent-color);
      color: white;
    }
  `]
})
export class DataTableComponent {
  @ContentChild('rowActions', { read: TemplateRef }) rowActionsTpl?: TemplateRef<any>;
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() loading = false;
  @Input() rowClickable = false;
  @Input() sortActive = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';

  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<any>();

  searchQuery = '';

  get columnKeys(): string[] {
    return this.columns.map(c => c.key);
  }

  getStartIndex(): number {
    return this.pageIndex * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.total);
  }

  getPlaceholderImage(): string {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="1.5"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
  }

  getBadgeClass(col: TableColumn, row: any): string {
    if (col.badgeClass) {
      return `badge--${col.badgeClass(row[col.key])}`;
    }
    return 'badge--default';
  }

  // ✅ FIX 1: Added missing getStatusClass method
  getStatusClass(value: string): string {
    const map: Record<string, string> = {
      'active':   'status--active',
      'inactive': 'status--inactive',
      'pending':  'status--pending',
    };
    return map[value?.toLowerCase()] ?? 'status--default';
  }

  getVisiblePages(): number[] {
    const totalPages = Math.ceil(this.total / this.pageSize);
    const currentPage = this.pageIndex + 1;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToFirstPage(): void {
    this.pageChange.emit({ pageIndex: 0, pageSize: this.pageSize });
  }

  goToPreviousPage(): void {
    this.pageChange.emit({ pageIndex: this.pageIndex - 1, pageSize: this.pageSize });
  }

  goToNextPage(): void {
    this.pageChange.emit({ pageIndex: this.pageIndex + 1, pageSize: this.pageSize });
  }

  goToLastPage(): void {
    const totalPages = Math.ceil(this.total / this.pageSize);
    this.pageChange.emit({ pageIndex: totalPages - 1, pageSize: this.pageSize });
  }

  goToPage(pageIndex: number): void {
    this.pageChange.emit({ pageIndex, pageSize: this.pageSize });
  }

  onSearch(query: string): void {
    this.searchChange.emit(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchChange.emit('');
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onRowClick(row: any): void {
    if (this.rowClickable) {
      this.rowClick.emit(row);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getPlaceholderImage();
  }
}