import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
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
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { FoodService } from '../../services/food.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface FoodForm {
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;  // Changed from 'carbs' to 'carbohydrate' to match API
  fat: number;
  fiber?: number;
  sugar?: number;
  category: string;
  servingSize: number;
  servingUnit: string;
}

@Component({
  selector: 'app-food-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    PageHeaderComponent, 
    FileUploadComponent
  ],
  templateUrl: './food-form.component.html',
  styleUrl: './food-form.component.scss',
})
export class FoodFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private foodService = inject(FoodService);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  isEdit = signal(false);
  foodId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedImage = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  existingImage = signal<string | null>(null);

  categories = [
    'Protein', 
    'Carbohydrates', 
    'Fats', 
    'Vegetables', 
    'Fruits', 
    'Dairy', 
    'Beverages', 
    'Snacks',
    'Grains',
    'Legumes',
    'Nuts & Seeds',
    'Herbs & Spices'
  ];

  servingUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'];

  // Updated form fields to match API (using 'carbohydrate' instead of 'carbs')
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    calories: [0, [Validators.required, Validators.min(0), Validators.max(2000)]],
    protein: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    carbohydrate: [0, [Validators.required, Validators.min(0), Validators.max(200)]], // Changed from 'carbs'
    fat: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    fiber: [0, [Validators.min(0), Validators.max(100)]],
    sugar: [0, [Validators.min(0), Validators.max(100)]], // Added sugar field
    category: ['', Validators.required],
    servingSize: [100, [Validators.required, Validators.min(1), Validators.max(5000)]],
    servingUnit: ['g', Validators.required],
  });

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
    this.foodService.getFoodById(parseInt(this.foodId)) // Convert to number
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.form.patchValue(res.data);
            if (res.data.pic) {  // Changed from 'imageUrl' to 'pic'
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

  onImageSelected(file: File | null): void {
    this.selectedImage.set(file);
    if (file) {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.imagePreview.set(null);
    }
  }

  removeImage(): void {
    this.selectedImage.set(null);
    this.imagePreview.set(null);
  }

  getNutritionTotal(): number {
    const calories = this.form.get('calories')?.value || 0;
    const protein = this.form.get('protein')?.value || 0;
    const carbohydrate = this.form.get('carbohydrate')?.value || 0;  // Changed from 'carbs'
    const fat = this.form.get('fat')?.value || 0;
    return (protein * 4) + (carbohydrate * 4) + (fat * 9);
  }

  getCalorieDifference(): number {
    const calories = this.form.get('calories')?.value || 0;
    const total = this.getNutritionTotal();
    return calories - total;
  }

  isCalorieWarning(): boolean {
    const diff = Math.abs(this.getCalorieDifference());
    return diff > 50;
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
    
    // Append form fields
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Append image if selected (using 'pic' field name to match API)
    if (this.selectedImage()) {
      formData.append('pic', this.selectedImage() as File);
    }

    const request = this.isEdit()
      ? this.foodService.updateFood(parseInt(this.foodId), formData as any)
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
          // Handle upload progress
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            this.uploadProgress.set(progress);
          } 
          // Handle response
          else if (event.type === HttpEventType.Response) {
            const message = this.isEdit() 
              ? `${this.form.get('name')?.value} has been updated successfully!`
              : `${this.form.get('name')?.value} has been created successfully!`;
            this.notif.success(message);
            this.router.navigate(['/foods']);
          }
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = error.error?.message || error.message || 'Operation failed';
          this.notif.error(errorMessage);
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
        servingSize: 100,
        servingUnit: 'g',
      });
    }
    this.removeImage();
    this.notif.info('Form has been reset');
  }

  // Helper method to check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.isSubmitting();
  }

  // Get validation error message
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