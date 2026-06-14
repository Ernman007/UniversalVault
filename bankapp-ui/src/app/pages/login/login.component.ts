import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Landmark,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, ButtonComponent],
  template: `
    <div class="bg-slate-50 min-h-screen">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Header -->
      <div
        class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 pt-8 pb-20 rounded-b-3xl"
      >
        <div class="max-w-sm mx-auto">
          <!-- Back button -->
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            <span class="text-sm">Back</span>
          </a>

          <!-- Logo -->
          <div class="text-center">
            <div
              class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <lucide-icon [img]="landmark" class="w-7 h-7"></lucide-icon>
            </div>
            <h1 class="text-xl font-bold">Welcome Back</h1>
            <p class="text-blue-100 text-sm mt-1">Sign in to access your accounts</p>
          </div>
        </div>
      </div>

      <!-- Login Form -->
      <div class="px-6 -mt-12">
        <div class="max-w-sm mx-auto">
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
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

              <!-- Password -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
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
                    autocomplete="current-password"
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
              </div>

              <!-- Remember & Forgot -->
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="remember"
                    name="remember"
                    class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-slate-600">Remember me</span>
                </label>
                <a
                  routerLink="/forgot-password"
                  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >Forgot password?</a
                >
              </div>

              <!-- Error message -->
              @if (error) {
                <div
                  class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                >
                  <lucide-icon [img]="alertCircle" class="w-5 h-5"></lucide-icon>
                  <span>{{ error }}</span>
                </div>
              }

              <!-- Submit -->
              <app-button
                type="submit"
                variant="primary"
                size="lg"
                [fullWidth]="true"
                [loading]="loading"
              >
                <span>Sign In</span>
                <lucide-icon [img]="arrowRight" class="w-5 h-5"></lucide-icon>
              </app-button>
            </form>
          </div>

          <!-- Sign up link -->
          <p class="text-center text-sm text-slate-500 mt-6">
            Don't have an account?
            <a routerLink="/open-account" class="text-blue-600 hover:text-blue-700 font-medium"
              >Open one now</a
            >
          </p>
        </div>
      </div>

      <!-- Safe area bottom -->
      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  remember = false;
  showPassword = false;
  loading = false;
  error = '';

  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  // Icons
  arrowLeft = ArrowLeft;
  landmark = Landmark;
  mail = Mail;
  lock = Lock;
  eye = Eye;
  eyeOff = EyeOff;
  arrowRight = ArrowRight;
  alertCircle = AlertCircle;

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Please enter email and password';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigateByUrl(returnUrl || '/user/dashboard');
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Invalid email or password';
        this.toast.error(this.error);
      },
    });
  }
}
