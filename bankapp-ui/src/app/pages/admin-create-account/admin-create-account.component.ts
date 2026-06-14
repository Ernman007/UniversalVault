import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Loader, User, CreditCard } from 'lucide-angular';

import { AccountService } from '../../services/account/account.service';
import { AdminService } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { PendingAccountService } from '../../services/pending-account/pending-account.service';

@Component({
  selector: 'app-admin-create-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="bg-slate-50 min-h-screen pb-8">
      <div class="status-bar-spacer bg-emerald-600"></div>

      <div class="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-5 pt-6 pb-20">
        <div class="max-w-lg mx-auto">
          <a
            routerLink="/admin/support-messages"
            class="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            <span class="text-sm">Back to Support</span>
          </a>
          <div class="text-center">
            <div
              class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <lucide-icon [img]="userIcon" class="w-8 h-8"></lucide-icon>
            </div>
            <h1 class="text-2xl font-bold">Approve Account Request</h1>
            <p class="text-emerald-100 mt-1">Create user and account from support request</p>
          </div>
        </div>
      </div>

      <div class="px-5 -mt-12">
        <div class="max-w-lg mx-auto">
          @if (isFromRequest()) {
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p class="text-amber-800 text-sm font-medium">
                📋 Account request from: {{ pendingName() }} ({{ pendingEmail() }})
              </p>
            </div>
          }

          <form
            [formGroup]="accountForm"
            (ngSubmit)="onSubmit()"
            class="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6"
          >
            @if (loading()) {
              <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-600 animate-pulse w-full"></div>
              </div>
            }

            <!-- User Details Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                <lucide-icon [img]="userIcon" class="w-5 h-5 text-emerald-600"></lucide-icon>
                <h3 class="text-base font-bold text-slate-900">User Details</h3>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    formControlName="name"
                    placeholder="John Doe"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="john@example.com"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    formControlName="phone"
                    placeholder="1234567890"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    formControlName="dob"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  formControlName="address"
                  rows="2"
                  placeholder="123 Main St, City, State ZIP"
                  class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none text-slate-900"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Temporary Password</label
                >
                <input
                  type="text"
                  formControlName="password"
                  placeholder="Auto-generated if empty"
                  class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                />
                <p class="text-xs text-slate-500 mt-1">Leave empty for auto-generated password</p>
              </div>
            </div>

            <!-- Account Details Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                <lucide-icon [img]="creditCard" class="w-5 h-5 text-emerald-600"></lucide-icon>
                <h3 class="text-base font-bold text-slate-900">Account Details</h3>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Account Type</label>
                <div class="grid grid-cols-3 gap-3">
                  @for (type of accountTypes; track type.value) {
                    <label class="relative">
                      <input
                        type="radio"
                        formControlName="type"
                        [value]="type.value"
                        class="peer sr-only"
                      />
                      <div
                        class="px-4 py-3 border-2 border-slate-300 rounded-xl cursor-pointer text-center transition-all
                        peer-checked:border-emerald-600 peer-checked:bg-emerald-50 hover:border-slate-400"
                      >
                        <span class="text-2xl mb-1 block">{{ type.icon }}</span>
                        <span class="text-xs font-medium text-slate-700">{{ type.label }}</span>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5"
                  >Initial Deposit</label
                >
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"
                    >$</span
                  >
                  <input
                    type="number"
                    formControlName="initialDeposit"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="setDeposit(100)"
                  class="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  $100
                </button>
                <button
                  type="button"
                  (click)="setDeposit(500)"
                  class="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  $500
                </button>
                <button
                  type="button"
                  (click)="setDeposit(1000)"
                  class="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  $1,000
                </button>
                <button
                  type="button"
                  (click)="setDeposit(5000)"
                  class="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  $5,000
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
              <a
                routerLink="/admin/support-messages"
                class="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 text-sm text-center"
              >
                Cancel
              </a>
              <button
                type="submit"
                [disabled]="loading() || accountForm.invalid"
                class="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                @if (loading()) {
                  <lucide-icon [img]="loader" class="w-4 h-4 animate-spin"></lucide-icon>
                  <span>Creating...</span>
                } @else {
                  <span>Create User & Account</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminCreateAccountComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private pendingAccountService = inject(PendingAccountService);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private router = inject(Router);

  arrowLeft = ArrowLeft;
  userIcon = User;
  creditCard = CreditCard;
  loader = Loader;

  accountForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    dob: [''],
    address: [''],
    password: [''],
    type: ['checking', Validators.required],
    initialDeposit: [0],
  });

  accountTypes: { value: string; label: string; icon: string }[] = [
    { value: 'checking', label: 'Checking', icon: 'C' },
    { value: 'savings', label: 'Savings', icon: 'S' },
    { value: 'investment', label: 'Investment', icon: 'I' },
  ];

  loading = signal(false);
  isFromRequest = signal(false);
  pendingName = signal('');
  pendingEmail = signal('');
  private supportMessageId = '';

  private normalizeDateForInput(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') {
      // Handles ISO strings like 1992-02-02T00:00:00.000Z and plain 1992-02-02
      return value.length >= 10 ? value.slice(0, 10) : value;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return '';
  }

  ngOnInit(): void {
    setTimeout(() => {
      const pendingData = this.pendingAccountService.getPendingData();
      if (pendingData) {
        this.isFromRequest.set(true);
        this.pendingName.set(pendingData.name || '');
        this.pendingEmail.set(pendingData.email || '');
        this.supportMessageId = pendingData.supportMessageId || '';

        this.accountForm.patchValue(
          {
            name: pendingData.name || '',
            email: pendingData.email || '',
            phone: pendingData.phone || '',
            dob: this.normalizeDateForInput(pendingData.dob),
            address: pendingData.address || '',
            password: pendingData.password || '',
            type: pendingData.accountType || 'checking',
            initialDeposit: pendingData.initialDeposit || 0,
          },
          { emitEvent: false },
        );
      }
    });
  }

  setDeposit(amount: number): void {
    this.accountForm.patchValue({ initialDeposit: amount });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      Object.values(this.accountForm.controls).forEach((control) => control.markAsTouched());
      return;
    }

    this.loading.set(true);
    const formValue = this.accountForm.value;

    const tempPassword = formValue.password || `Bank${Date.now()}!`;
    const userPayload = {
      name: formValue.name,
      email: formValue.email,
      password: tempPassword,
      phone: formValue.phone,
      address: formValue.address,
      dateOfBirth: formValue.dob || undefined,
      accountType: formValue.type,
      initialDeposit: formValue.initialDeposit || 0,
    };

    this.adminService.createUserWithAccount(userPayload).subscribe({
      next: (_res: any) => {
        this.loading.set(false);
        const message = `Account created for ${formValue.name}! Temp password: ${tempPassword}`;

        if (this.supportMessageId) {
          this.adminService.resolveMessage(this.supportMessageId).subscribe({
            next: () => {
              this.pendingAccountService.clearPendingData();
              this.toast.success(message);
              setTimeout(() => this.router.navigate(['/admin/dashboard']), 2000);
            },
            error: () => {
              this.pendingAccountService.clearPendingData();
              this.toast.success(`${message} (Ticket not closed)`);
              setTimeout(() => this.router.navigate(['/admin/dashboard']), 2000);
            },
          });
        } else {
          this.toast.success(message);
          setTimeout(() => this.router.navigate(['/admin/dashboard']), 2000);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to create user and account');
      },
    });
  }
}
