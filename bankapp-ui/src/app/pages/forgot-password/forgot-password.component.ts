import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-forgot-password',
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
              <lucide-icon [img]="mail" class="w-7 h-7"></lucide-icon>
            </div>
            <h1 class="text-xl font-bold">Reset Password</h1>
            <p class="text-blue-100 text-sm mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>
        </div>
      </div>

      <div class="px-6 -mt-12">
        <div class="max-w-sm mx-auto">
          @if (!emailSent) {
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <form (ngSubmit)="onSubmit()" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <div class="relative">
                    <lucide-icon
                      [img]="mail"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                    ></lucide-icon>
                    <input
                      type="email"
                      [(ngModel)]="email"
                      name="email"
                      placeholder="you@example.com"
                      required
                      autocomplete="email"
                      class="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                    />
                  </div>
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
                >
                  <span>Send Reset Link</span>
                  <lucide-icon [img]="arrowRight" class="w-5 h-5"></lucide-icon>
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
              <h2 class="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p class="text-slate-600 text-sm mb-6">
                We've sent a password reset link to <strong>{{ email }}</strong
                >. Please check your inbox and spam folder.
              </p>
              <button
                (click)="emailSent = false"
                class="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Didn't receive it? Try again
              </button>

              <div class="mt-6 pt-6 border-t border-slate-200">
                <a routerLink="/login" class="text-slate-600 hover:text-slate-800 text-sm">
                  Back to sign in
                </a>
              </div>
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
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  error = '';
  emailSent = false;

  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  arrowLeft = ArrowLeft;
  mail = Mail;
  arrowRight = ArrowRight;
  alertCircle = AlertCircle;
  checkCircle = CheckCircle;
  loader = Loader;

  onSubmit(): void {
    if (!this.email) {
      this.error = 'Please enter your email address';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.emailSent = true;
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Failed to send reset email. Please try again.';
        if (msg.includes('not found') || msg.includes('No account')) {
          this.error = 'No account found with this email address';
        } else {
          this.error = msg;
        }
      },
    });
  }
}
