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
import { WorkoutService } from '../../services/workout.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-workout-form',
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
  templateUrl: './workout-form.component.html',
  styleUrl: './workout-form.component.scss',
})
export class WorkoutFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private workoutService = inject(WorkoutService);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  isEdit = signal(false);
  workoutId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedGif = signal<File | null>(null);
  existingGif = signal<string | null>(null);

  // Options for selects
  bodyParts = [
    'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full-body', 'cardio'
  ];
  
  equipmentOptions = [
    'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'bands', 'kettlebell', 'resistance band'
  ];
  
  levelOptions = [
    'beginner', 'intermediate', 'advanced', 'expert'
  ];

  // Updated form to match API field names
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    body_part: ['', [Validators.required]],
    target_area: ['', [Validators.required]],
    equipment: ['', [Validators.required]],
    level: ['', [Validators.required]],
    description: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.workoutId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit.set(!!this.workoutId);
    
    if (this.isEdit()) {
      this.loadWorkoutData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWorkoutData(): void {
    this.isLoading.set(true);
    this.workoutService.getWorkoutById(this.workoutId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.form.patchValue(res.data);
            if (res.data.gif_link) {
              this.existingGif.set(res.data.gif_link);
            }
          }
        },
        error: (error: HttpErrorResponse) => {
          this.notif.error(error.error?.message || 'Failed to load workout data');
          this.router.navigate(['/workouts']);
        },
      });
  }

  onGifSelected(file: File | null): void {
    this.selectedGif.set(file);
  }

  removeGif(): void {
    this.selectedGif.set(null);
    this.existingGif.set(null);
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

    // Append gif if selected
    if (this.selectedGif()) {
      formData.append('gif_link', this.selectedGif() as File);
    }

    const request = this.isEdit()
      ? this.workoutService.updateWorkout(this.workoutId, formData as any)
      : this.workoutService.createWorkout(formData as any);

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
            this.router.navigate(['/workouts']);
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
      this.loadWorkoutData();
    } else {
      this.form.reset({
        name: '',
        body_part: '',
        target_area: '',
        equipment: '',
        level: '',
        description: '',
      });
    }
    this.removeGif();
    this.notif.info('Form has been reset');
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors || !field.touched) return '';

    if (field.errors['required']) return `${fieldName.replace('_', ' ')} is required`;
    if (field.errors['minlength']) return `${fieldName.replace('_', ' ')} must be at least ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['maxlength']) return `${fieldName.replace('_', ' ')} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    
    return 'Invalid value';
  }
}