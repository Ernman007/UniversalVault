import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Plus,
  Wallet,
  PiggyBank,
  TrendingUp,
  Landmark,
} from 'lucide-angular';

import { AccountService } from '../../services/account/account.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { SupportService } from '../../services/support/support.service';

@Component({
  selector: 'app-user-accounts',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, FormsModule],
  template: `
    <div class="bg-slate-50 min-h-screen pb-8">
      <div class="status-bar-spacer bg-blue-600"></div>

      <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-6 pb-16">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center gap-4 mb-6">
            <a
              routerLink="/user/dashboard"
              class="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
            >
              <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            </a>
            <h1 class="text-xl font-bold">My Accounts</h1>
          </div>

          <div class="text-center">
            <p class="text-blue-100 text-sm">Total Balance</p>
            <p class="text-3xl font-bold mt-1">{{ totalBalance() | currency }}</p>
          </div>
        </div>
      </div>

      <div class="px-5 -mt-8">
        <div class="max-w-lg mx-auto space-y-4">
          @if (loading()) {
            <div class="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p class="text-slate-500">Loading accounts...</p>
            </div>
          } @else {
            @for (account of accounts(); track account._id) {
              <a
                [routerLink]="['/user/account', account._id]"
                class="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 rounded-xl flex items-center justify-center"
                      [class]="
                        account.type === 'savings'
                          ? 'bg-emerald-100'
                          : account.type === 'investment'
                            ? 'bg-purple-100'
                            : 'bg-blue-100'
                      "
                    >
                      <lucide-icon
                        [img]="
                          account.type === 'savings'
                            ? piggyBank
                            : account.type === 'investment'
                              ? trendingUp
                              : wallet
                        "
                        [class]="
                          account.type === 'savings'
                            ? 'w-6 h-6 text-emerald-600'
                            : account.type === 'investment'
                              ? 'w-6 h-6 text-purple-600'
                              : 'w-6 h-6 text-blue-600'
                        "
                      >
                      </lucide-icon>
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900 capitalize">
                        {{ account.type }} Account
                      </p>
                      <p class="text-sm text-slate-500">
                        ****{{ account.accountNumber.slice(-4) || '****' }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-xl font-bold text-slate-900">{{ account.balance | currency }}</p>
                    <span
                      class="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                      [class]="
                        account.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      "
                    >
                      {{ account.status | titlecase }}
                    </span>
                  </div>
                </div>

                @if ($any(account).bankName) {
                  <div class="flex items-center gap-2 text-sm text-slate-500">
                    <lucide-icon [img]="landmark" class="w-4 h-4"></lucide-icon>
                    <span>{{ $any(account).bankName }}</span>
                  </div>
                }
              </a>
            } @empty {
              <div class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div
                  class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <lucide-icon [img]="wallet" class="w-8 h-8 text-slate-400"></lucide-icon>
                </div>
                <p class="text-slate-600 font-medium mb-1">No accounts yet</p>
                <p class="text-slate-400 text-sm mb-4">Open your first account to get started</p>
                <button
                  (click)="showCreate.set(true)"
                  class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Open Account
                </button>
              </div>
            }

            @if (accounts().length > 0) {
              <button
                (click)="showCreate.set(true)"
                class="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors border-2 border-dashed border-blue-200"
              >
                <lucide-icon [img]="plus" class="w-5 h-5"></lucide-icon>
                <span class="text-sm font-medium">Open New Account</span>
              </button>
            }
          }
        </div>
      </div>

      @if (showCreate()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div class="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-bold text-slate-900">Open New Account</h2>
              <button (click)="showCreate.set(false)" class="text-slate-400 hover:text-slate-600">
                <span class="text-2xl">&times;</span>
              </button>
            </div>

            <form (ngSubmit)="createAccount()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                <div class="grid grid-cols-3 gap-3">
                  @for (type of accountTypes; track type.value) {
                    <button
                      type="button"
                      (click)="selectAccountType(type.value)"
                      [class]="
                        newAccount.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white'
                      "
                      class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors"
                    >
                      <lucide-icon
                        [img]="type.icon"
                        class="w-6 h-6"
                        [class]="
                          newAccount.type === type.value ? 'text-blue-600' : 'text-slate-400'
                        "
                      >
                      </lucide-icon>
                      <span
                        class="text-xs font-medium"
                        [class]="
                          newAccount.type === type.value ? 'text-blue-600' : 'text-slate-600'
                        "
                      >
                        {{ type.label }}
                      </span>
                    </button>
                  }
                </div>
              </div>

              @if (newAccount.type !== 'investment') {
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Initial Deposit</label
                  >
                  <input
                    type="number"
                    [(ngModel)]="newAccount.initialDeposit"
                    name="initialDeposit"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  />
                </div>

                @if (newAccount.initialDeposit > 0 && accounts().length > 0) {
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Transfer From Account</label
                    >
                    <select
                      [(ngModel)]="newAccount.sourceAccountId"
                      name="sourceAccountId"
                      class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="">Select source account</option>
                      @for (acc of accounts(); track acc._id) {
                        <option [value]="acc._id">
                          {{ acc.type | titlecase }} (****{{ acc.accountNumber.slice(-4) }}) -
                          {{ acc.balance | currency }}
                        </option>
                      }
                    </select>
                    <p class="text-xs text-slate-500 mt-1">
                      Initial deposit will be transferred from selected account upon approval
                    </p>
                  </div>
                }
              }

              @if (createError()) {
                <div
                  class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm"
                >
                  {{ createError() }}
                </div>
              }

              <button
                type="submit"
                [disabled]="creating()"
                class="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                @if (creating()) {
                  Creating...
                } @else {
                  Open Account
                }
              </button>
            </form>
          </div>
        </div>
      }

      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class UserAccountsComponent implements OnInit {
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private supportService = inject(SupportService);

  accounts = this.accountService.accountsState;
  loading = signal(true);
  showCreate = signal(false);
  creating = signal(false);
  createError = signal('');

  newAccount = {
    type: 'savings' as 'savings' | 'checking' | 'investment',
    initialDeposit: 0,
    sourceAccountId: '' as string,
  };

  accountTypes = [
    { value: 'savings', label: 'Savings', icon: PiggyBank },
    { value: 'checking', label: 'Checking', icon: Wallet },
    { value: 'investment', label: 'Investment', icon: TrendingUp },
  ];

  arrowLeft = ArrowLeft;
  plus = Plus;
  wallet = Wallet;
  piggyBank = PiggyBank;
  trendingUp = TrendingUp;
  landmark = Landmark;

  totalBalance = this.accountService.totalBalanceState;

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.accountService.loadAccountsIntoState().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load accounts');
      },
    });
  }

  selectAccountType(value: string): void {
    this.newAccount.type = value as 'savings' | 'checking' | 'investment';
  }

  createAccount(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.createError.set('User not authenticated');
      return;
    }

    // Validate source account if initial deposit > 0
    if (
      this.newAccount.initialDeposit > 0 &&
      this.accounts().length > 0 &&
      !this.newAccount.sourceAccountId
    ) {
      this.createError.set('Please select a source account for the initial deposit transfer');
      return;
    }

    this.creating.set(true);
    this.createError.set('');

    // All account types require bank approval - submit request via support service
    const formData = new FormData();
    formData.append('name', user.name || '');
    formData.append('email', user.email || '');
    formData.append('accountType', this.newAccount.type);
    formData.append('subject', 'New Account Opening Request');
    formData.append(
      'message',
      `New account opening request from ${user.name}.\n\nAccount Details:\n- Account Type: ${this.newAccount.type}\n- Initial Deposit: ${this.newAccount.initialDeposit || 0}${this.newAccount.sourceAccountId ? `\n- Transfer From Account: ${this.newAccount.sourceAccountId}` : ''}`,
    );
    formData.append('messageType', 'account-request');
    formData.append('userId', user._id);
    formData.append('initialDeposit', String(this.newAccount.initialDeposit || 0));
    if (this.newAccount.sourceAccountId) {
      formData.append('sourceAccountId', this.newAccount.sourceAccountId);
    }

    this.supportService.submitOpenAccountRequest(formData).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreate.set(false);
        this.newAccount = {
          type: 'savings',
          initialDeposit: 0,
          sourceAccountId: '',
        };
        this.toast.success('Account request submitted! An admin will review your application.');
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err?.error?.message || 'Failed to submit account request');
      },
    });
  }
}
