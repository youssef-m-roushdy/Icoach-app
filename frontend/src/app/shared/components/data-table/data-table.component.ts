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
    MatTooltipModule,
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent {
  @ContentChild('rowActions', { read: TemplateRef }) rowActionsTpl?: TemplateRef<any>;
  @ContentChild('statusCell',  { read: TemplateRef }) statusCellTpl?: TemplateRef<any>;

  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() loading = false;
  @Input() rowClickable = false;
  @Input() sortActive = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';

  @Output() pageChange  = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() sortChange  = new EventEmitter<Sort>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() rowClick    = new EventEmitter<any>();

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

  getStatusClass(value: string): string {
    const map: Record<string, string> = {
      active:   'status--active',
      inactive: 'status--inactive',
      pending:  'status--pending',
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

  goToFirstPage():    void { this.pageChange.emit({ pageIndex: 0, pageSize: this.pageSize }); }
  goToPreviousPage(): void { this.pageChange.emit({ pageIndex: this.pageIndex - 1, pageSize: this.pageSize }); }
  goToNextPage():     void { this.pageChange.emit({ pageIndex: this.pageIndex + 1, pageSize: this.pageSize }); }
  goToLastPage():     void {
    const totalPages = Math.ceil(this.total / this.pageSize);
    this.pageChange.emit({ pageIndex: totalPages - 1, pageSize: this.pageSize });
  }
  goToPage(pageIndex: number): void { this.pageChange.emit({ pageIndex, pageSize: this.pageSize }); }

  onSearch(query: string): void { this.searchChange.emit(query); }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchChange.emit('');
  }

  onSort(sort: Sort): void { this.sortChange.emit(sort); }

  onRowClick(row: any): void {
    if (this.rowClickable) this.rowClick.emit(row);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getPlaceholderImage();
  }
}