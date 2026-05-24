import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { TableColumn } from '../../../core/models/pagination.interface';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatInputModule, MatFormFieldModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, FormsModule
  ],
  template: `
    <div class="data-table-wrapper">
      <div class="data-table__toolbar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Search..." [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)">
          @if (searchQuery) {
            <button matSuffix mat-icon-button (click)="searchQuery=''; onSearch('')"><mat-icon>close</mat-icon></button>
          }
        </mat-form-field>
        <ng-content select="[toolbar-actions]"></ng-content>
      </div>

      @if (loading) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

      <div class="table-container">
        <table mat-table [dataSource]="rows" matSort (matSortChange)="onSort($event)">
          @for (col of columns; track col.key) {
            <ng-container [matColumnDef]="col.key">
              <th mat-header-cell *matHeaderCellDef [mat-sort-header]="col.sortable ? col.key : ''">{{ col.label }}</th>
              <td mat-cell *matCellDef="let row">
                @if (col.type === 'badge') {
                  <span class="badge" [class]="'badge--' + (col.badgeClass ? col.badgeClass(row[col.key]) : 'default')">
                    {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
                  </span>
                } @else if (col.type === 'image') {
                  <img [src]="row[col.key] || 'assets/images/placeholder.png'" class="table-img" loading="lazy">
                } @else if (col.type === 'actions') {
                  <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"></ng-container>
                } @else {
                  {{ col.formatter ? col.formatter(row[col.key], row) : row[col.key] }}
                }
              </td>
            </ng-container>
          }
          <tr mat-header-row *matHeaderRowDef="columnKeys"></tr>
          <tr mat-row *matRowDef="let row; columns: columnKeys;" class="data-row"></tr>
          <tr class="mat-mdc-no-data-row" *matNoDataRow>
            <td [attr.colspan]="columns.length" class="no-data">
              <mat-icon>inbox</mat-icon>
              <span>No data found</span>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="total"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)">
      </mat-paginator>
    </div>
    <ng-template #actionsTemplate><ng-content select="[row-actions]"></ng-content></ng-template>
  `,
  styles: [`
    .data-table-wrapper { background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }
    .data-table__toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 240px; }
    .table-container { overflow-x: auto; }
    table { width: 100%; }
    .data-row:hover { background: var(--surface); }
    .table-img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
    .badge { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge--active, .badge--true, .badge--verified { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge--inactive, .badge--false, .badge--unverified { background: rgba(244,63,94,0.1); color: #f43f5e; }
    .badge--admin { background: rgba(139,92,246,0.15); color: #8b5cf6; }
    .badge--user { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .badge--coach { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge--beginner { background: rgba(16,185,129,0.1); color: #10b981; }
    .badge--intermediate { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .badge--advanced { background: rgba(244,63,94,0.1); color: #f43f5e; }
    .no-data { text-align: center; padding: 48px 0; color: var(--text-muted); }
    .no-data mat-icon { display: block; font-size: 40px; width: 40px; height: 40px; margin: 0 auto 8px; }
  `]
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() loading = false;
  @Input() actionsTemplate: any;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() searchChange = new EventEmitter<string>();

  searchQuery = '';

  get columnKeys(): string[] {
    return this.columns.map(c => c.key);
  }

  onSearch(q: string): void { this.searchChange.emit(q); }
  onSort(s: Sort): void { this.sortChange.emit(s); }
  onPage(e: PageEvent): void { this.pageChange.emit(e); }
}
