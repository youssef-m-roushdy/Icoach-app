import {
  Component, Input, Output, EventEmitter, forwardRef,
  signal, computed, HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ControlValueAccessor, NG_VALUE_ACCESSOR,
  ReactiveFormsModule, FormsModule
} from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  emoji?: string;
  icon?: string;
}

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './custom-input.component.html',
  styleUrl: './custom-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true,
    },
  ],
})
export class CustomInputComponent implements ControlValueAccessor {
  // ── Common ───────────────────────────────────────────────────────────────
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' = 'text';
  @Input() label       = '';
  @Input() icon        = '';
  @Input() placeholder = '';
  @Input() hint        = '';
  @Input() loading     = false;
  @Input() readonly    = false;

  // ── Number ───────────────────────────────────────────────────────────────
  @Input() step = 1;
  @Input() min: number | null = null;
  @Input() max: number | null = null;

  // ── Textarea ─────────────────────────────────────────────────────────────
  @Input() rows = 4;

  // ── Password ─────────────────────────────────────────────────────────────
  showPassword = signal(false);

  // ── Select ───────────────────────────────────────────────────────────────
  @Input() options: SelectOption[] = [];
  @Input() searchable = false;
  isOpen   = signal(false);
  search   = signal('');
  isFocused = signal(false);  // replaces document.activeElement check

  filteredOptions = computed(() => {
    const q = this.search().toLowerCase();
    return q ? this.options.filter(o => o.label.toLowerCase().includes(q)) : this.options;
  });

  selectedOption = computed(() =>
    this.options.find(o => o.value === this._value()) ?? null
  );

  // ── CVA — all protected so templates can access them ─────────────────────
  protected _value    = signal<any>('');
  protected _touched  = signal(false);
  protected _disabled = signal(false);

  get disabled(): boolean { return this._disabled(); }

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void      = () => {};

  writeValue(val: any): void         { this._value.set(val ?? ''); }
  registerOnChange(fn: any): void    { this.onChange = fn; }
  registerOnTouched(fn: any): void   { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this._disabled.set(d); }

  // ── Handlers ─────────────────────────────────────────────────────────────
  onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this._value.set(val);
    this.onChange(val);
  }

  onFocus(): void  { this.isFocused.set(true); }

  onBlur(): void {
    this.isFocused.set(false);
    this._touched.set(true);
    this.onTouched();
  }

  // Number stepper
  step_(delta: number): void {
    if (this._disabled()) return;
    const current = parseFloat(this._value()) || 0;
    const next    = parseFloat((current + delta).toFixed(10));
    const clamped =
      this.min !== null && next < this.min ? this.min :
      this.max !== null && next > this.max ? this.max :
      next;
    this._value.set(clamped);
    this.onChange(clamped);
  }

  // Select
  toggleDropdown(): void {
    if (this._disabled()) return;
    this.isOpen.update(v => !v);
    if (!this.isOpen()) this.search.set('');
  }

  selectOption(opt: SelectOption): void {
    this._value.set(opt.value);
    this.onChange(opt.value);
    this._touched.set(true);
    this.onTouched();
    this.isOpen.set(false);
    this.search.set('');
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.search.set('');
  }

  // Password
  togglePassword(): void { this.showPassword.update(v => !v); }

  get inputType(): string {
    if (this.type === 'password') return this.showPassword() ? 'text' : 'password';
    if (this.type === 'number')   return 'number';
    return this.type;
  }
}