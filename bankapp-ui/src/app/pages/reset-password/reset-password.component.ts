import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, ButtonComponent],
  template: `
    <div class="bg-slate-50 min-h-screen">
      <div class="status-bar-spacer bg-blue-600"></div>

      <div
        class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 pt-8 pb-20 rounded-b-3xl"
      >
        <div class="max-w-sm mx-auto">
          <a
            routerLink="/login"
            class="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            <span class="text-sm">Back</span>
          </a>
          <div class="text-center">
            <div
              class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <lucide-icon [img]="lock" class="w-7 h-7"></lucide-icon>
            </div>
            <h1 class="text-xl font-bold">Set New Password</h1>
            <p class="text-blue-100 text-sm mt-1">Create a strong password for your account</p>
          </div>
        </div>
      </div>

      <div class="px-6 -mt-12">
        <div class="max-w-sm mx-auto">
          @if (!isTokenValid) {
            <div class="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div
                class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <lucide-icon [img]="alertCircle" class="w-8 h-8 text-red-600"></lucide-icon>
              </div>
              <h2 class="text-xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h2>
              <p class="text-slate-600 text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <a
                routerLink="/forgot-password"
                class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Request New Link
              </a>
            </div>
          } @else if (!resetSuccess) {
            <div class="bg-white rounded-2xl shadow-lg p-6">
              @if (tokenError) {
                <div
                  class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4"
                >
                  <lucide-icon [img]="alertCircle" class="w-5 h-5"></lucide-icon>
                  <span>{{ tokenError }}</span>
                </div>
              }

              <form (ngSubmit)="onSubmit()" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <div class="relative">
                    <lucide-icon
                      [img]="lock"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    ></lucide-icon>
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      [(ngModel)]="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      autocomplete="new-password"
                      class="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      (click)="showPassword = !showPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      @if (showPassword) {
                        <lucide-icon [img]="eyeOff" class="w-5 h-5"></lucide-icon>
                      } @else {
                        <lucide-icon [img]="eye" class="w-5 h-5"></lucide-icon>
                      }
                    </button>
                  </div>
                  @if (password && !isPasswordStrong()) {
                    <p class="text-red-600 text-xs mt-1">
                      Minimum 8 characters with uppercase, lowercase and number
                    </p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Confirm Password</label
                  >
                  <div class="relative">
                    <lucide-icon
                      [img]="lock"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    ></lucide-icon>
                    <input
                      [type]="showConfirm ? 'text' : 'password'"
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      required
                      autocomplete="new-password"
                      class="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      (click)="showConfirm = !showConfirm"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      @if (showConfirm) {
                        <lucide-icon [img]="eyeOff" class="w-5 h-5"></lucide-icon>
                      } @else {
                        <lucide-icon [img]="eye" class="w-5 h-5"></lucide-icon>
                      }
                    </button>
                  </div>
                  @if (confirmPassword && password !== confirmPassword) {
                    <p class="text-red-600 text-xs mt-1">Passwords do not match</p>
                  }
                </div>

                @if (error) {
                  <div
                    class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <lucide-icon [img]="alertCircle" class="w-5 h-5"></lucide-icon>
                    <span>{{ error }}</span>
                  </div>
                }

                <app-button
                  type="submit"
                  variant="primary"
                  size="lg"
                  [fullWidth]="true"
                  [loading]="loading"
                  [disabled]="!isFormValid()"
                >
                  <span>Reset Password</span>
                </app-button>
              </form>
            </div>
          } @else {
            <div class="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div
                class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <lucide-icon [img]="checkCircle" class="w-8 h-8 text-green-600"></lucide-icon>
              </div>
              <h2 class="text-xl font-bold text-slate-900 mb-2">Password Reset Complete</h2>
              <p class="text-slate-600 text-sm mb-6">
                Your password has been successfully reset. You can now sign in with your new
                password.
              </p>
              <a
                routerLink="/login"
                class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </a>
            </div>
          }

          <p class="text-center text-sm text-slate-500 mt-6">
            Remember your password?
            <a routerLink="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
          </p>
        </div>
      </div>

      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  tokenError = '';
  isTokenValid = false;
  resetSuccess = false;
  showPassword = false;
  showConfirm = false;

  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  arrowLeft = ArrowLeft;
  lock = Lock;
  eye = Eye;
  eyeOff = EyeOff;
  alertCircle = AlertCircle;
  checkCircle = CheckCircle;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.tokenError = 'No reset token provided';
    } else {
      this.isTokenValid = true;
    }
  }

  isPasswordStrong(): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(this.password);
  }

  isFormValid(): boolean {
    return (
      !!this.password &&
      !!this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.isPasswordStrong()
    );
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.error = 'Please fill in all fields correctly';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.resetSuccess = true;
        this.toast.success('Password reset successful. Please sign in.');
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Failed to reset password. The link may have expired.';
        if (msg.includes('expired') || msg.includes('invalid')) {
          this.tokenError = msg;
          this.isTokenValid = false;
        } else {
          this.error = msg;
        }
      },
    });
  }
}
