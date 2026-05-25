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
import { WorkoutService } from '../../services/workout.service';
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
  selector: 'app-workout-form',
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

  // File input reference
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // State signals
  isEdit = signal(false);
  workoutId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedGif = signal<File | null>(null);
  existingGif = signal<string | null>(null);
  gifPreview = signal<string | null>(null);

  // Custom select states
  isBodyPartOpen = false;
  isEquipmentOpen = false;
  isLevelOpen = false;
  bodyPartSearch = '';
  equipmentSearch = '';

  // Options for selects with icons
  bodyPartOptions = [
    { value: 'chest', label: 'Chest', icon: '💪' },
    { value: 'back', label: 'Back', icon: '🔙' },
    { value: 'shoulders', label: 'Shoulders', icon: '🦾' },
    { value: 'arms', label: 'Arms', icon: '💪' },
    { value: 'legs', label: 'Legs', icon: '🦵' },
    { value: 'core', label: 'Core', icon: '🎯' },
    { value: 'full-body', label: 'Full Body', icon: '🧍' },
    { value: 'cardio', label: 'Cardio', icon: '🏃' }
  ];
  
  equipmentOptions = [
    { value: 'barbell', label: 'Barbell', icon: '🏋️' },
    { value: 'dumbbell', label: 'Dumbbell', icon: '🏋️' },
    { value: 'machine', label: 'Machine', icon: '⚙️' },
    { value: 'cable', label: 'Cable', icon: '🔌' },
    { value: 'bodyweight', label: 'Bodyweight', icon: '🧍' },
    { value: 'bands', label: 'Resistance Bands', icon: '🩹' },
    { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
    { value: 'resistance band', label: 'Resistance Band', icon: '🩹' }
  ];
  
  levelOptions = [
    { value: 'beginner', label: 'Beginner', color: '#10b981' },
    { value: 'intermediate', label: 'Intermediate', color: '#f59e0b' },
    { value: 'advanced', label: 'Advanced', color: '#ef4444' },
    { value: 'expert', label: 'Expert', color: '#8b5cf6' }
  ];

  // Form group
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

  // Custom select methods
  get filteredBodyParts() {
    const q = this.bodyPartSearch.toLowerCase();
    return q
      ? this.bodyPartOptions.filter(b => b.label.toLowerCase().includes(q))
      : this.bodyPartOptions;
  }

  get filteredEquipment() {
    const q = this.equipmentSearch.toLowerCase();
    return q
      ? this.equipmentOptions.filter(e => e.label.toLowerCase().includes(q))
      : this.equipmentOptions;
  }

  getSelectedBodyPartLabel(): string {
    const val = this.form.get('body_part')?.value;
    return this.bodyPartOptions.find(b => b.value === val)?.label || '';
  }

  getSelectedEquipmentLabel(): string {
    const val = this.form.get('equipment')?.value;
    return this.equipmentOptions.find(e => e.value === val)?.label || '';
  }

  getSelectedLevelLabel(): string {
    const val = this.form.get('level')?.value;
    return this.levelOptions.find(l => l.value === val)?.label || '';
  }

  getLevelColor(value: string): string {
    return this.levelOptions.find(l => l.value === value)?.color || '#6b7280';
  }

  selectBodyPart(value: string) {
    this.form.get('body_part')?.setValue(value);
    this.form.get('body_part')?.markAsTouched();
    this.isBodyPartOpen = false;
    this.bodyPartSearch = '';
  }

  selectEquipment(value: string) {
    this.form.get('equipment')?.setValue(value);
    this.form.get('equipment')?.markAsTouched();
    this.isEquipmentOpen = false;
    this.equipmentSearch = '';
  }

  selectLevel(value: string) {
    this.form.get('level')?.setValue(value);
    this.form.get('level')?.markAsTouched();
    this.isLevelOpen = false;
  }

  // Handle file selection from the upload area
  onGifFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.notif.error('Invalid file type. Please upload GIF or image files only.');
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.notif.error('File size exceeds 10MB limit');
        return;
      }

      this.selectedGif.set(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.gifPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeGif(): void {
    this.selectedGif.set(null);
    this.gifPreview.set(null);
    this.existingGif.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Check if the selected file is a GIF
  isGifFile(): boolean {
    const file = this.selectedGif();
    if (file) {
      return file.type === 'image/gif';
    }
    const existing = this.existingGif();
    if (existing) {
      return existing.toLowerCase().endsWith('.gif') || existing.includes('gif');
    }
    return false;
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
        formData.append(key, value.toString().trim());
      }
    });

    // Append gif if selected
    if (this.selectedGif()) {
      formData.append('gif', this.selectedGif() as File);
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
