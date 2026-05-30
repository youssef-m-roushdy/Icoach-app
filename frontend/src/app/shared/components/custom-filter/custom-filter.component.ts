import {
  Component, Input, Output, EventEmitter,
  signal, computed, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface FilterOption {
  value: any;
  label: string;
  icon?: string;
  dot?: string;
}

@Component({
  selector: 'app-custom-filter',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './custom-filter.component.html',
  styleUrl: './custom-filter.component.scss',
})
export class CustomFilterComponent {
  // Expose String to the template
  protected readonly String = String;

  @Input() label      = '';
  @Input() icon       = '';
  @Input() options: FilterOption[] = [];
  @Input() searchable = false;
  @Input() set value(v: any) { this._value.set(v); }

  @Output() valueChange = new EventEmitter<any>();

  _value   = signal<any>('');
  isOpen   = signal(false);
  search   = signal('');

  filteredOptions = computed(() => {
    const q = this.search().toLowerCase().trim();
    return q
      ? this.options.filter(o => o.label.toLowerCase().includes(q))
      : this.options;
  });

  selectedOption = computed(() =>
    this.options.find(o => String(o.value) === String(this._value())) ?? null
  );

  hasValue = computed(() =>
    this._value() !== '' && this._value() !== null && this._value() !== undefined
  );

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('app-custom-filter')) {
      this.close();
    }
  }

  toggle(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) this.search.set('');
  }

  close(): void {
    this.isOpen.set(false);
    this.search.set('');
  }

  select(opt: FilterOption): void {
    const next = String(opt.value) === String(this._value()) ? '' : opt.value;
    this._value.set(next);
    this.valueChange.emit(next);
    this.close();
  }

  clear(e: MouseEvent): void {
    e.stopPropagation();
    this._value.set('');
    this.valueChange.emit('');
  }
}