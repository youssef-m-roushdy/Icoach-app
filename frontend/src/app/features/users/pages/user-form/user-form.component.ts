import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule, MatProgressSpinnerModule, MatIconModule, PageHeaderComponent],
  template: `
    <div class="user-form-page">
      <app-page-header title="Edit User" [breadcrumbs]="[{label:'Dashboard',link:'/dashboard'},{label:'Users',link:'/users'},{label:'Edit'}]">
        <a mat-button routerLink="/users"><mat-icon>arrow_back</mat-icon> Back</a>
      </app-page-header>
      @if (isLoadingUser()) {
        <div class="center"><mat-spinner></mat-spinner></div>
      } @else {
        <div class="form-card">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                <mat-option value="user">User</mat-option>
                <mat-option value="coach">Coach</mat-option>
                <mat-option value="admin">Admin</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="toggles">
              <mat-slide-toggle formControlName="isVerified" color="primary">Email Verified</mat-slide-toggle>
              <mat-slide-toggle formControlName="isActive" color="primary">Active Account</mat-slide-toggle>
            </div>

            <div class="form-actions">
              <a mat-button routerLink="/users">Cancel</a>
              <button mat-flat-button type="submit" color="primary" [disabled]="form.invalid || isSubmitting()">
                @if (isSubmitting()) { <mat-spinner diameter="18"></mat-spinner> } @else { Save Changes }
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 60px; }
    .form-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 28px; max-width: 520px; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .full { width: 100%; }
    .toggles { display: flex; gap: 24px; flex-wrap: wrap; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `]
})
export class UserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notif = inject(NotificationService);

  isLoadingUser = signal(false);
  isSubmitting = signal(false);
  userId = '';

  form = this.fb.group({
    role: ['user', Validators.required],
    isVerified: [false],
    isActive: [true],
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    if (this.userId) {
      this.isLoadingUser.set(true);
      this.userService.getUserById(this.userId).subscribe({
        next: res => {
          this.form.patchValue({ role: res.data.role, isVerified: res.data.isVerified, isActive: res.data.isActive });
          this.isLoadingUser.set(false);
        },
        error: () => this.isLoadingUser.set(false),
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    this.userService.updateUser(this.userId, this.form.value as any).subscribe({
      next: () => { this.notif.success('User updated'); this.router.navigate(['/users']); },
      error: () => this.isSubmitting.set(false),
    });
  }
}
