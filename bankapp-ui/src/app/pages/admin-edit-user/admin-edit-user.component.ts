import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, ArrowLeft, User, Save, Loader } from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';
import { UsersService, UserResponse } from '../../services/users/users.service';

@Component({
  selector: 'app-admin-edit-user',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>

      <!-- Header -->
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30 shadow-md">
        <div class="max-w-lg mx-auto flex items-center justify-between">
          <a
            routerLink="/admin/users"
            class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors touch-active"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
          </a>
          <h1 class="text-lg font-bold">Edit User</h1>
          <div class="w-10"></div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-6">
        <div class="max-w-lg mx-auto">
          @if (loading()) {
            <div class="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-center">
              <lucide-icon [img]="loaderIcon" class="w-6 h-6 animate-spin text-blue-600"></lucide-icon>
              <span class="ml-2 text-slate-600">Loading user data...</span>
            </div>
          } @else if (user()) {
            <!-- User Avatar & Info Header -->
            <div class="bg-white rounded-2xl shadow-sm p-6 mb-4">
              <div class="flex items-center gap-4">
                <img
                  [src]="'https://api.dicebear.com/9.x/avataaars/svg?seed=' + user()?.name + '&size=64'"
                  alt="Avatar"
                  class="w-16 h-16 rounded-full bg-slate-100"
                />
                <div>
                  <h2 class="text-xl font-bold text-slate-900">{{ user()?.name }}</h2>
                  <p class="text-slate-500 text-sm">{{ user()?.email }}</p>
                  <span
                    class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                    [ngClass]="{
                      'bg-purple-100 text-purple-700': user()?.role === 'admin',
                      'bg-emerald-100 text-emerald-700': user()?.role === 'user' && user()?.status === 'active',
                      'bg-amber-100 text-amber-700': user()?.status === 'pending',
                      'bg-slate-100 text-slate-700': user()?.status === 'inactive'
                    }"
                  >
                    {{ user()?.role === 'admin' ? 'Admin' : (user()?.status | titlecase) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Edit Form -->
            <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="userIcon" class="w-5 h-5 text-blue-600"></lucide-icon>
                </div>
                <div>
                  <h3 class="font-semibold text-slate-900">Profile Details</h3>
                  <p class="text-xs text-slate-500">Update user information</p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  formControlName="name"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  placeholder="e.g. John Doe"
                />
                @if (userForm.get('name')?.touched && userForm.get('name')?.invalid) {
                  <p class="text-red-600 text-xs mt-1">Name is required</p>
                }
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  formControlName="email"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  placeholder="e.g. john@example.com"
                />
                @if (userForm.get('email')?.touched && userForm.get('email')?.invalid) {
                  <p class="text-red-600 text-xs mt-1">Valid email is required</p>
                }
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    formControlName="role"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="user">Customer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    formControlName="status"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <!-- Password Section -->
              <div class="border-t border-slate-200 pt-4 mt-4">
                <label class="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    [checked]="showPasswordFields()"
                    (change)="togglePasswordFields()"
                    class="w-4 h-4 text-blue-600 rounded"
                  />
                  <span class="text-sm font-medium text-slate-700">Change Password</span>
                </label>

                @if (showPasswordFields()) {
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                      <input
                        type="password"
                        formControlName="password"
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                        placeholder="Enter new password"
                      />
                      @if (userForm.get('password')?.touched && userForm.get('password')?.invalid && userForm.get('password')?.value) {
                        <p class="text-red-600 text-xs mt-1">Password must be at least 6 characters</p>
                      }
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        formControlName="confirmPassword"
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                        placeholder="Confirm new password"
                      />
                      @if (passwordMismatch()) {
                        <p class="text-red-600 text-xs mt-1">Passwords do not match</p>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Error Notification -->
              @if (errorMsg) {
                <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <p class="text-sm text-red-600 flex-1">{{ errorMsg }}</p>
                </div>
              }

              <!-- Form Actions -->
              <div class="flex gap-3 pt-4">
                <a
                  routerLink="/admin/users"
                  class="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors text-center"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  [disabled]="userForm.invalid || isSubmitting || passwordMismatch()"
                  class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  @if (isSubmitting) {
                    <lucide-icon [img]="loaderIcon" class="w-5 h-5 animate-spin"></lucide-icon>
                    <span>Saving...</span>
                  } @else {
                    <lucide-icon [img]="saveIcon" class="w-5 h-5"></lucide-icon>
                    <span>Save Changes</span>
                  }
                </button>
              </div>
            </form>

            <!-- Account Info -->
            <div class="bg-white rounded-2xl shadow-sm p-6 mt-4">
              <h3 class="font-semibold text-slate-900 mb-3">Account Information</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-slate-50 rounded-lg p-3">
                  <p class="text-xs text-slate-500">User ID</p>
                  <p class="font-mono text-slate-900 truncate">{{ user()?._id }}</p>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <p class="text-xs text-slate-500">Created</p>
                  <p class="text-slate-900">{{ user()?.createdAt | date: 'mediumDate' }}</p>
                </div>
              </div>
            </div>
          } @else if (notFound()) {
            <div class="bg-white rounded-2xl shadow-sm p-6 text-center">
              <p class="text-slate-500">User not found</p>
              <a
                routerLink="/admin/users"
                class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Back to Users
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminEditUserComponent implements OnInit {
  arrowLeft = ArrowLeft;
  userIcon = User;
  saveIcon = Save;
  loaderIcon = Loader;

  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  notFound = signal(false);
  user = signal<UserResponse | null>(null);
  isSubmitting = false;
  errorMsg = '';
  showPasswordFields = signal(false);

  userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['user', Validators.required],
    status: ['active', Validators.required],
    password: ['', [Validators.minLength(6)]],
    confirmPassword: [''],
  });

  passwordMismatch = signal(false);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    console.log('[ADMIN-EDIT-USER] ngOnInit - userId from route:', userId);
    
    if (!userId) {
      console.error('[ADMIN-EDIT-USER] No userId in route!');
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    console.log('[ADMIN-EDIT-USER] Calling getUserById...');
    this.usersService.getUserById(userId).subscribe({
      next: (userData: UserResponse) => {
        console.log('[ADMIN-EDIT-USER] getUserById response:', userData);
        this.user.set(userData);
        
        console.log('[ADMIN-EDIT-USER] Patching form with values:', {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: userData.status || 'active'
        });
        
        this.userForm.patchValue({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: userData.status || 'active',
        });
        
        console.log('[ADMIN-EDIT-USER] Form values after patch:', this.userForm.value);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('[ADMIN-EDIT-USER] Failed to load user:', err);
        console.error('[ADMIN-EDIT-USER] Error status:', err.status, 'Error message:', err.message);
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  togglePasswordFields(): void {
    this.showPasswordFields.update((v) => !v);
    if (!this.showPasswordFields()) {
      this.userForm.patchValue({ password: '', confirmPassword: '' });
      this.passwordMismatch.set(false);
    }
  }

  private checkPasswordMismatch(): boolean {
    const password = this.userForm.get('password')?.value;
    const confirmPassword = this.userForm.get('confirmPassword')?.value;
    if (this.showPasswordFields() && password && confirmPassword) {
      return password !== confirmPassword;
    }
    return false;
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      Object.values(this.userForm.controls).forEach((control) => control.markAsTouched());
      return;
    }

    // Check password mismatch
    if (this.checkPasswordMismatch()) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.isSubmitting = true;
    this.errorMsg = '';

    const userId = this.user()?._id;
    if (!userId) return;

    const formValue = this.userForm.value;
    const payload: any = {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role,
      status: formValue.status,
    };

    // Only include password if it's being changed
    if (this.showPasswordFields() && formValue.password) {
      payload.password = formValue.password;
    }

    console.log('[ADMIN-EDIT-USER] Updating user:', { userId, payload: { ...payload, password: payload.password ? '[REDACTED]' : undefined } });

    this.usersService.updateUser(userId, payload).subscribe({
      next: (updatedUser) => {
        this.isSubmitting = false;
        this.toastService.success('User updated successfully');
        this.user.set(updatedUser);
        // Reset password fields after successful update
        this.showPasswordFields.set(false);
        this.userForm.patchValue({ password: '', confirmPassword: '' });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.message || 'Failed to update user. Please try again.';
        console.error('[ADMIN-EDIT-USER] Update error:', err);
      },
    });
  }
}
