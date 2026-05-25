import { Component, OnInit, inject, signal, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FoodService } from '../../services/food.service';
import { NotificationService } from '../../../../core/services/notification.service';

// Click outside directive
import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  onClick(target: any) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}

@Component({
  selector: 'app-food-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule,
    RouterModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    PageHeaderComponent,
    ClickOutsideDirective
  ],
  templateUrl: './food-form.component.html',
  styleUrls: ['./food-form.component.scss']
})
export class FoodFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private foodService = inject(FoodService);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isEdit = signal(false);
  foodId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedImage = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  existingImage = signal<string | null>(null);

  categories = [
    'Protein', 'Carbohydrates', 'Fats', 'Vegetables', 'Fruits', 
    'Dairy', 'Beverages', 'Snacks', 'Grains', 'Legumes', 'Nuts & Seeds', 'Herbs & Spices'
  ];

  // FIXED: Removed Validators.required from category since it's a dummy field
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    calories: [0, [Validators.required, Validators.min(0), Validators.max(2000)]],
    protein: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    carbohydrate: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    fat: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    fiber: [0, [Validators.min(0), Validators.max(100)]],
    sugar: [0, [Validators.min(0), Validators.max(100)]],
    category: [''], // No validators - optional field
  });

  // Custom category select
  isCategoryOpen = false;
  categorySearch = '';

  categoryOptions = [
    { value: 'Protein',       label: 'Protein',       emoji: '🥩' },
    { value: 'Carbohydrates', label: 'Carbohydrates',  emoji: '🌾' },
    { value: 'Fats',          label: 'Fats',           emoji: '🫒' },
    { value: 'Vegetables',    label: 'Vegetables',     emoji: '🥦' },
    { value: 'Fruits',        label: 'Fruits',         emoji: '🍎' },
    { value: 'Dairy',         label: 'Dairy',          emoji: '🥛' },
    { value: 'Beverages',     label: 'Beverages',      emoji: '🥤' },
    { value: 'Snacks',        label: 'Snacks',         emoji: '🍿' },
    { value: 'Grains',        label: 'Grains',         emoji: '🌽' },
    { value: 'Legumes',       label: 'Legumes',        emoji: '🫘' },
    { value: 'Nuts & Seeds',  label: 'Nuts & Seeds',   emoji: '🥜' },
    { value: 'Herbs & Spices',label: 'Herbs & Spices', emoji: '🌿' },
  ];

  ngOnInit(): void {
    this.foodId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit.set(!!this.foodId);
    
    if (this.isEdit()) {
      this.loadFoodData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFoodData(): void {
    this.isLoading.set(true);
    this.foodService.getFoodById(this.foodId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.form.patchValue(res.data);
            if (res.data.pic) {
              this.existingImage.set(res.data.pic);
            }
          }
        },
        error: (error: HttpErrorResponse) => {
          this.notif.error(error.error?.message || 'Failed to load food data');
          this.router.navigate(['/foods']);
        },
      });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImage.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImage.set(null);
    this.imagePreview.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  getNutritionTotal(): number {
    const protein = this.form.get('protein')?.value || 0;
    const carbs = this.form.get('carbohydrate')?.value || 0;
    const fat = this.form.get('fat')?.value || 0;
    return (protein * 4) + (carbs * 4) + (fat * 9);
  }

  getCalorieDifference(): number {
    const calories = this.form.get('calories')?.value || 0;
    return calories - this.getNutritionTotal();
  }

  isCalorieWarning(): boolean {
    return Math.abs(this.getCalorieDifference()) > 50;
  }

  get filteredCategories() {
    const q = this.categorySearch.toLowerCase();
    return q
      ? this.categoryOptions.filter(c => c.label.toLowerCase().includes(q))
      : this.categoryOptions;
  }

  getSelectedCategoryLabel(): string {
    const val = this.form.get('category')?.value;
    return this.categoryOptions.find(c => c.value === val)?.label ?? '';
  }

  selectCategory(value: string) {
    this.form.get('category')?.setValue(value);
    this.form.get('category')?.markAsTouched();
    this.isCategoryOpen = false;
    this.categorySearch = '';
  }

  stepInput(field: string, delta: number) {
    const ctrl = this.form.get(field);
    if (!ctrl) return;
    const current = parseFloat(ctrl.value) || 0;
    ctrl.setValue(parseFloat((current + delta).toFixed(2)));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notif.warning('Please fix all validation errors');
      return;
    }

    this.isSubmitting.set(true);
    this.uploadProgress.set(0);

    const formValue = this.form.value;
    const formData = new FormData();
    
    // Exclude category from submission since it's dummy
    Object.keys(formValue).forEach(key => {
      if (key === 'category') return; // Skip category field
      const value = formValue[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    if (this.selectedImage()) {
      formData.append('foodImage', this.selectedImage() as File);
    }

    const request = this.isEdit()
      ? this.foodService.updateFood(this.foodId, formData as any)
      : this.foodService.createFood(formData as any);

    request
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          setTimeout(() => {
            this.isSubmitting.set(false);
            this.uploadProgress.set(0);
          }, 500);
        })
      )
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            this.uploadProgress.set(progress);
          } else if (event.type === HttpEventType.Response) {
            const message = this.isEdit() 
              ? `${this.form.get('name')?.value} has been updated successfully!`
              : `${this.form.get('name')?.value} has been created successfully!`;
            this.notif.success(message);
            this.router.navigate(['/foods']);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.uploadProgress.set(0);
        },
      });
  }

  resetForm(): void {
    if (this.isEdit()) {
      this.loadFoodData();
    } else {
      this.form.reset({
        name: '',
        calories: 0,
        protein: 0,
        carbohydrate: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        category: '',
      });
    }
    this.removeImage();
    this.notif.info('Form has been reset');
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors || !field.touched) return '';

    if (field.errors['required']) return `${fieldName} is required`;
    if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['maxlength']) return `${fieldName} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
    if (field.errors['max']) return `${fieldName} cannot exceed ${field.errors['max'].max}`;
    
    return 'Invalid value';
  }
}
