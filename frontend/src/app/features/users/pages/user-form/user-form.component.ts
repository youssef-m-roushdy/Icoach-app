import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatSlideToggleModule, 
    MatProgressSpinnerModule, 
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    PageHeaderComponent
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notif = inject(NotificationService);
  private destroy$ = new Subject<void>();

  isLoadingUser = signal(false);
  isSubmitting = signal(false);
  userId = '';

  form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    dateOfBirth: [''],
    gender: [''],
    bio: [''],
    role: ['user', [Validators.required]],
    isEmailVerified: [false],
    isActive: [true],
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (this.userId) {
      this.loadUserData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData(): void {
    this.isLoadingUser.set(true);
    this.userService.getUserById(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.form.patchValue({
              firstName: res.data.firstName || '',
              lastName: res.data.lastName || '',
              username: res.data.username || '',
              email: res.data.email || '',
              phone: res.data.phone || '',
              dateOfBirth: res.data.dateOfBirth || '',
              gender: res.data.gender || '',
              bio: res.data.bio || '',
              role: res.data.role || 'user',
              isEmailVerified: res.data.isEmailVerified || false,
              isActive: res.data.isActive !== undefined ? res.data.isActive : true,
            });
          }
          this.isLoadingUser.set(false);
        },
        error: (error) => {
          console.error('Failed to load user:', error);
          this.notif.error('Failed to load user data');
          this.isLoadingUser.set(false);
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notif.warning('Please fix all validation errors');
      return;
    }

    this.isSubmitting.set(true);

    const updateData = {
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      username: this.form.value.username,
      email: this.form.value.email,
      phone: this.form.value.phone,
      dateOfBirth: this.form.value.dateOfBirth,
      gender: this.form.value.gender,
      bio: this.form.value.bio,
      role: this.form.value.role,
      isEmailVerified: this.form.value.isEmailVerified,
      isActive: this.form.value.isActive,
    };

    this.userService.updateUser(this.userId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notif.success('User updated successfully');
            this.router.navigate(['/users', this.userId]);
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.notif.error(error.error?.message || 'Failed to update user');
          this.isSubmitting.set(false);
        }
      });
  }
}