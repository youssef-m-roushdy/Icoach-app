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
import { takeUntil, finalize } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreateUserByAdminDto } from '../../services/user.service';

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

  // State signals
  isEdit = signal(false);
  isLoadingUser = signal(false);
  isSubmitting = signal(false);
  userId = '';

  // Computed page title
  pageTitle = signal('Add New User');

  form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // These fields are for display only in edit mode
    phone: [''],
    dateOfBirth: [''],
    gender: [''],
    bio: [''],
    isEmailVerified: [false],
    isActive: [true],
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    
    // Check if we're in edit mode (has id) or create mode (no id)
    if (this.userId) {
      this.isEdit.set(true);
      this.pageTitle.set('Edit User');
      this.loadUserData();
      
      // Remove password requirement for edit mode
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    } else {
      this.isEdit.set(false);
      this.pageTitle.set('Add New User');
      
      // Make password required for new users
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData(): void {
    this.isLoadingUser.set(true);
    this.userService.getUserById(this.userId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingUser.set(false))
      )
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
        },
        error: (error) => {
          console.error('Failed to load user:', error);
          this.notif.error('Failed to load user data');
          this.router.navigate(['/users']);
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

    if (this.isEdit()) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  private createUser(): void {
    // Only send the required fields for creating a user
    const createData: CreateUserByAdminDto = {
      email: this.form.value.email,
      username: this.form.value.username,
      password: this.form.value.password,
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      role: this.form.value.role,
    };

    this.userService.createUserByAdmin(createData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notif.success('User created successfully');
            this.router.navigate(['/users']);
          }
        },
        error: (error) => {
          console.error('Failed to create user:', error);
          this.notif.error(error.error?.message || 'Failed to create user');
        }
      });
  }

  private updateUser(): void {
    const updateData: any = {
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

    // Only include password if it's provided
    if (this.form.value.password) {
      updateData['password'] = this.form.value.password;
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    this.userService.updateUser(this.userId, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notif.success('User updated successfully');
            this.router.navigate(['/users', this.userId]);
          }
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.notif.error(error.error?.message || 'Failed to update user');
        }
      });
  }

  resetForm(): void {
    if (this.isEdit()) {
      this.loadUserData();
    } else {
      this.form.reset({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        role: 'user',
        password: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        bio: '',
        isEmailVerified: false,
        isActive: true,
      });
    }
    this.notif.info('Form has been reset');
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field?.errors || !field.touched) return '';

    if (field.errors['required']) return `${this.formatFieldName(fieldName)} is required`;
    if (field.errors['email']) return 'Please enter a valid email address';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
    
    return 'Invalid value';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}