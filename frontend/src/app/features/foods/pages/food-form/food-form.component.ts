import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpEventType } from '@angular/common/http';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { FoodService } from '../../services/food.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-food-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatIconModule, PageHeaderComponent, FileUploadComponent],
  templateUrl: './food-form.component.html',
  styleUrl: './food-form.component.scss',
})
export class FoodFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private foodService = inject(FoodService);
  private notif = inject(NotificationService);

  isEdit = signal(false);
  foodId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedImage = signal<File | null>(null);

  categories = ['Protein', 'Carbohydrates', 'Fats', 'Vegetables', 'Fruits', 'Dairy', 'Beverages', 'Snacks'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
    fiber: [0],
    category: ['', Validators.required],
    servingSize: [100],
    servingUnit: ['g'],
  });

  ngOnInit(): void {
    this.foodId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit.set(!!this.foodId);
    if (this.isEdit()) {
      this.isLoading.set(true);
      this.foodService.getFoodById(this.foodId).subscribe({
        next: res => { this.form.patchValue(res.data as any); this.isLoading.set(false); },
        error: () => this.isLoading.set(false),
      });
    }
  }

  onImageSelected(file: File | null): void { this.selectedImage.set(file); }

  submit(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    const payload = { ...this.form.value, image: this.selectedImage() };
    const obs = this.isEdit()
      ? this.foodService.updateFood(this.foodId, payload as any)
      : this.foodService.createFood(payload as any);

    obs.subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.notif.success(this.isEdit() ? 'Food updated' : 'Food created');
          this.router.navigate(['/foods']);
        }
      },
      error: () => this.isSubmitting.set(false),
    });
  }
}
