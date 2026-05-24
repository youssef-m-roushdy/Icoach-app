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
import { WorkoutService } from '../../services/workout.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-workout-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatIconModule, PageHeaderComponent, FileUploadComponent],
  templateUrl: './workout-form.component.html',
  styleUrl: './workout-form.component.scss',
})
export class WorkoutFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private workoutService = inject(WorkoutService);
  private notif = inject(NotificationService);

  isEdit = signal(false);
  workoutId = '';
  isLoading = signal(false);
  isSubmitting = signal(false);
  uploadProgress = signal(0);
  selectedGif = signal<File | null>(null);

  categories = ['strength', 'cardio', 'flexibility', 'hiit', 'yoga'];
  bodyParts = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full-body'];
  difficulties = ['beginner', 'intermediate', 'advanced'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', Validators.required],
    category: ['', Validators.required],
    bodyPart: ['', Validators.required],
    difficulty: ['', Validators.required],
    duration: [30, [Validators.required, Validators.min(1)]],
    calories: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.workoutId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit.set(!!this.workoutId);
    if (this.isEdit()) {
      this.isLoading.set(true);
      this.workoutService.getWorkoutById(this.workoutId).subscribe({
        next: res => { this.form.patchValue(res.data as any); this.isLoading.set(false); },
        error: () => this.isLoading.set(false),
      });
    }
  }

  onGifSelected(file: File | null): void { this.selectedGif.set(file); }

  submit(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    const payload = { ...this.form.value, gif: this.selectedGif() };
    const obs = this.isEdit()
      ? this.workoutService.updateWorkout(this.workoutId, payload as any)
      : this.workoutService.createWorkout(payload as any);

    obs.subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.notif.success(this.isEdit() ? 'Workout updated' : 'Workout created');
          this.router.navigate(['/workouts']);
        }
      },
      error: () => this.isSubmitting.set(false),
    });
  }
}
