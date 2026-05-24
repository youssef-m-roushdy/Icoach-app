import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FileSizePipe } from '../../pipes/file-size.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FileSizePipe],
  template: `
    <div class="upload-zone"
         [class.upload-zone--drag]="isDragging()"
         [class.upload-zone--has-file]="selectedFile()"
         (dragover)="onDragOver($event)"
         (dragleave)="isDragging.set(false)"
         (drop)="onDrop($event)">
      @if (!selectedFile()) {
        <div class="upload-zone__placeholder">
          <mat-icon class="upload-zone__icon">cloud_upload</mat-icon>
          <p>Drag & drop or <label class="browse-btn">browse<input type="file" [accept]="accept" (change)="onFileChange($event)" hidden></label></p>
          <span class="upload-zone__hint">{{ hint }}</span>
        </div>
      } @else {
        <div class="upload-zone__preview">
          @if (previewUrl()) {
            <img [src]="previewUrl()" [alt]="selectedFile()!.name" class="upload-preview-img">
          }
          <div class="upload-zone__file-info">
            <span class="file-name">{{ selectedFile()!.name }}</span>
            <span class="file-size">{{ selectedFile()!.size | fileSize }}</span>
          </div>
          <button mat-icon-button class="remove-btn" (click)="clearFile()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
      background: var(--surface);
    }
    .upload-zone--drag { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.05); }
    .upload-zone__icon { font-size: 40px !important; width: 40px; height: 40px; color: var(--text-muted); }
    .upload-zone p { color: var(--text-secondary); margin: 8px 0 4px; font-size: 0.9rem; }
    .browse-btn { color: var(--accent); cursor: pointer; text-decoration: underline; }
    .upload-zone__hint { font-size: 0.75rem; color: var(--text-muted); }
    .upload-zone__preview { display: flex; align-items: center; gap: 12px; text-align: left; }
    .upload-preview-img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .upload-zone__file-info { flex: 1; }
    .file-name { display: block; font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
    .file-size { font-size: 0.75rem; color: var(--text-muted); }
    .remove-btn { color: var(--text-muted); }
  `]
})
export class FileUploadComponent {
  @Input() accept = 'image/*';
  @Input() hint = 'PNG, JPG, GIF up to 5MB';
  @Output() fileSelected = new EventEmitter<File | null>();

  isDragging = signal(false);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  setFile(file: File): void {
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileSelected.emit(null);
  }
}
