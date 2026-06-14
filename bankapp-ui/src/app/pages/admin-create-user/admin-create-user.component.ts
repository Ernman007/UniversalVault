import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, UserPlus } from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';
import { UsersService } from '../../services/users/users.service';

@Component({
  selector: 'app-admin-create-user',
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
          <h1 class="text-lg font-bold">Create User</h1>
          <div class="w-10"></div>
          <!-- Spacer for centering -->
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-6">
        <div class="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-6">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
            <lucide-icon [img]="userPlus" class="w-6 h-6 text-blue-600"></lucide-icon>
          </div>

          <h2 class="text-xl font-bold text-slate-900 mb-2">New Account Profile</h2>
          <p class="text-slate-500 text-sm mb-6">Enter details to generate a new user profile.</p>

          <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                formControlName="name"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                formControlName="email"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                placeholder="e.g. john@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Initial Password</label>
              <input
                type="password"
                formControlName="password"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                formControlName="role"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="user">Customer (User)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <!-- Error Notification -->
            @if (errorMsg) {
              <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <p class="text-sm text-red-600 flex-1">{{ errorMsg }}</p>
              </div>
            }

            <button
              type="submit"
              [disabled]="userForm.invalid || isSubmitting"
              class="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex justify-center items-center gap-2"
            >
              @if (isSubmitting) {
                <span
                  class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></span>
              } @else {
                Create Account
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminCreateUserComponent {
  arrowLeft = ArrowLeft;
  userPlus = UserPlus;

  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isSubmitting = false;
  errorMsg = '';

  userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user', Validators.required],
  });

  onSubmit() {
    if (this.userForm.invalid) return;
    this.isSubmitting = true;
    this.errorMsg = '';

    const payload = this.userForm.value;

    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('User created successfully');
        this.router.navigate(['/admin/users']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.message || 'Failed to create user. Please try again.';
      },
    });
  }
}
