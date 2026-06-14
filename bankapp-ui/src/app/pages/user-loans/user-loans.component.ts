import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Banknote,
  DollarSign,
  Calendar,
  ChevronRight,
  X,
  CreditCard,
} from 'lucide-angular';

import {
  LoanService,
  Loan,
  LoanOffer,
  RepaymentScheduleItem,
} from '../../services/loan/loan.service';
import { ToastService } from '../../services/notification/toast.service';
import { BottomSheetComponent } from '../../ui/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-user-loans',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    LucideAngularModule,
    BottomSheetComponent,
  ],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center gap-4 mb-3">
            <a
              routerLink="/user/dashboard"
              class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors touch-active"
            >
              <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            </a>
            <h1 class="text-lg font-bold">My Loans</h1>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-6">
          <!-- Personalized Loan Offers -->
          @if (showOffers()) {
            <div
              class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-5 text-white"
            >
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <lucide-icon [img]="banknote" class="w-5 h-5"></lucide-icon>
                  <h2 class="font-bold text-base">Personalized Offers</h2>
                </div>
                <button (click)="dismissOffers()" class="text-blue-200 hover:text-white text-sm">
                  Dismiss
                </button>
              </div>
              @if (offersLoading()) {
                <p class="text-blue-100 text-sm">Loading your offers...</p>
              } @else if (offers().length === 0) {
                <p class="text-blue-100 text-sm">No offers available at this time.</p>
              } @else {
                <div class="space-y-3">
                  @for (offer of offers(); track offer.term) {
                    <div class="bg-white/10 backdrop-blur rounded-xl p-4">
                      <div class="flex justify-between items-start mb-3">
                        <div>
                          <p class="font-bold text-lg">\${{ offer.amount | number: '1.0-0' }}</p>
                          <p class="text-blue-200 text-xs">
                            {{ offer.term }} months at {{ offer.interestRate }}% APR
                          </p>
                        </div>
                        <span class="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">
                          \${{ offer.monthlyPayment | number: '1.2-2' }}/mo
                        </span>
                      </div>
                      <button
                        (click)="applyFromOffer(offer)"
                        class="w-full bg-white text-blue-700 font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm"
                      >
                        Apply for this Offer
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Apply for a new loan -->
          <div class="bg-white rounded-xl shadow-sm p-4">
            <h2 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <lucide-icon [img]="banknote" class="w-5 h-5 text-blue-600"></lucide-icon>
              Apply for a Loan
            </h2>
            <form [formGroup]="loanForm" (ngSubmit)="applyLoan()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <div class="relative">
                  <lucide-icon
                    [img]="dollarSign"
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  ></lucide-icon>
                  <input
                    type="number"
                    formControlName="amount"
                    class="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <input
                  type="text"
                  formControlName="purpose"
                  class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Term (Months)</label>
                  <select
                    formControlName="termMonths"
                    class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option [value]="12">12 Months</option>
                    <option [value]="24">24 Months</option>
                    <option [value]="36">36 Months</option>
                    <option [value]="48">48 Months</option>
                    <option [value]="60">60 Months</option>
                  </select>
                </div>
              </div>
              <button
                [disabled]="loanForm.invalid || isSubmitting"
                type="submit"
                class="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl disabled:bg-slate-300"
              >
                {{ isSubmitting ? 'Applying...' : 'Submit Application' }}
              </button>
            </form>
          </div>

          <!-- Active/Pending Loans -->
          <div>
            <h3 class="font-bold text-slate-900 mb-3">Your Loans</h3>
            @if (isLoading()) {
              <p class="text-sm text-slate-500 text-center py-4">Loading...</p>
            } @else if (loans().length === 0) {
              <p class="text-sm text-slate-500 text-center py-4 bg-white rounded-xl shadow-sm">
                No active or pending loans.
              </p>
            } @else {
              <div class="space-y-3">
                @for (loan of loans(); track loan._id) {
                  <div class="bg-white rounded-xl shadow-sm p-4">
                    <div class="flex justify-between items-start mb-2">
                      <div>
                        <p class="font-bold text-slate-900">
                          \${{ loan.amount | number: '1.2-2' }}
                        </p>
                        <p class="text-xs text-slate-500">{{ loan.purpose }}</p>
                      </div>
                      <span
                        class="px-2 py-1 text-xs font-medium rounded-full"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-700':
                            loan.status === 'approved' || loan.status === 'active',
                          'bg-amber-100 text-amber-700':
                            loan.status === 'pending' || loan.status === 'under_review',
                          'bg-red-100 text-red-700':
                            loan.status === 'rejected' || loan.status === 'defaulted',
                          'bg-slate-100 text-slate-700': loan.status === 'paid',
                        }"
                      >
                        {{ loan.status | titlecase }}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t">
                      <div>
                        <p class="text-xs text-slate-500">Interest Rate</p>
                        <p class="font-medium">{{ loan.interestRate }}%</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Term</p>
                        <p class="font-medium">{{ loan.termMonths }} mo</p>
                      </div>
                      <div class="col-span-2 mt-1">
                        <p class="text-xs text-slate-500">Remaining Balance</p>
                        <p class="font-medium text-rose-600">
                          \${{ loan.remainingAmount | number: '1.2-2' }}
                        </p>
                      </div>
                    </div>
                    <div class="flex gap-2 mt-3 pt-3 border-t">
                      @if (loan.status === 'approved' || loan.status === 'active') {
                        <button
                          (click)="viewRepaymentSchedule(loan)"
                          class="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                        >
                          <lucide-icon [img]="calendar" class="w-4 h-4"></lucide-icon>
                          <span>Schedule</span>
                        </button>
                        <button
                          (click)="payLoan(loan._id, 100)"
                          class="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          <lucide-icon [img]="dollarSign" class="w-4 h-4"></lucide-icon>
                          <span>Pay $100</span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Repayment Schedule Bottom Sheet -->
      @if (showSchedule()) {
        <app-bottom-sheet [title]="'Repayment Schedule'" (close)="closeSchedule()">
          <div class="space-y-3">
            @if (scheduleLoading()) {
              <div class="text-center py-8">
                <p class="text-slate-500 text-sm">Loading schedule...</p>
              </div>
            } @else if (schedule().length === 0) {
              <div class="text-center py-8">
                <p class="text-slate-500 text-sm">No repayment schedule available.</p>
              </div>
            } @else {
              <div class="bg-slate-50 rounded-xl p-3 mb-4">
                <div class="flex justify-between text-sm">
                  <div>
                    <p class="text-slate-500 text-xs">Outstanding Balance</p>
                    <p class="font-bold text-rose-600">
                      \${{ outstandingBalance() | number: '1.2-2' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-slate-500 text-xs">Total Payments</p>
                    <p class="font-bold text-slate-900">{{ schedule().length }}</p>
                  </div>
                </div>
              </div>

              <div class="max-h-80 overflow-y-auto space-y-2">
                @for (item of schedule(); track item.paymentNumber) {
                  <div class="bg-white border border-slate-100 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-xs font-medium text-slate-500"
                        >Payment #{{ item.paymentNumber }}</span
                      >
                      <span class="text-sm font-bold text-slate-900"
                        >\${{ item.paymentAmount | number: '1.2-2' }}</span
                      >
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p class="text-slate-400">Principal</p>
                        <p class="font-medium text-emerald-600">
                          \${{ item.principalPayment | number: '1.2-2' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-slate-400">Interest</p>
                        <p class="font-medium text-amber-600">
                          \${{ item.interestPayment | number: '1.2-2' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-slate-400">Balance</p>
                        <p class="font-medium text-slate-700">
                          \${{ item.remainingBalance | number: '1.2-2' }}
                        </p>
                      </div>
                    </div>
                    <div
                      class="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center"
                    >
                      <span class="text-xs text-slate-400">{{
                        item.paymentDate | date: 'mediumDate'
                      }}</span>
                      @if (item.remainingBalance === 0) {
                        <span
                          class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"
                          >Paid</span
                        >
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </app-bottom-sheet>
      }
    </div>
  `,
})
export class UserLoansComponent implements OnInit {
  arrowLeft = ArrowLeft;
  banknote = Banknote;
  dollarSign = DollarSign;
  calendar = Calendar;
  chevronRight = ChevronRight;
  x = X;
  creditCard = CreditCard;

  private fb = inject(FormBuilder);
  private loanService = inject(LoanService);
  private toastService = inject(ToastService);

  loans = signal<Loan[]>([]);
  offers = signal<LoanOffer[]>([]);
  isLoading = signal(true);
  offersLoading = signal(false);
  scheduleLoading = signal(false);
  isSubmitting = false;
  showOffers = signal(true);
  showSchedule = signal(false);

  schedule = signal<RepaymentScheduleItem[]>([]);
  outstandingBalance = signal(0);
  selectedLoanId = signal<string | null>(null);

  loanForm = this.fb.group({
    amount: [1000, [Validators.required, Validators.min(100), Validators.max(50000000)]],
    purpose: ['', Validators.required],
    termMonths: [12, Validators.required],
  });

  ngOnInit() {
    this.loadLoans();
    this.loadOffers();
  }

  loadLoans() {
    this.isLoading.set(true);
    this.loanService.getUserLoans().subscribe({
      next: (data) => {
        const list = (data as any).data?.loans || (data as any).loans || data;
        this.loans.set(list);
        if (list.length > 0) {
          this.showOffers.set(false);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Failed to load loans');
      },
    });
  }

  loadOffers() {
    this.offersLoading.set(true);
    this.loanService.getOffers().subscribe({
      next: (data: any) => {
        const offerList = Array.isArray(data) ? data : data.offers || [];
        this.offers.set(offerList);
        this.offersLoading.set(false);
      },
      error: () => {
        this.offersLoading.set(false);
      },
    });
  }

  viewRepaymentSchedule(loan: Loan) {
    this.selectedLoanId.set(loan._id);
    this.scheduleLoading.set(true);
    this.showSchedule.set(true);

    this.loanService.getRepaymentSchedule(loan._id).subscribe({
      next: (data: any) => {
        const scheduleData = data.schedule || [];
        this.schedule.set(scheduleData);
        this.outstandingBalance.set(data.outstandingBalance || loan.remainingAmount);
        this.scheduleLoading.set(false);
      },
      error: () => {
        this.scheduleLoading.set(false);
        this.toastService.error('Failed to load repayment schedule');
      },
    });
  }

  closeSchedule() {
    this.showSchedule.set(false);
    this.schedule.set([]);
    this.outstandingBalance.set(0);
    this.selectedLoanId.set(null);
  }

  dismissOffers() {
    this.showOffers.set(false);
  }

  applyFromOffer(offer: LoanOffer) {
    this.loanForm.patchValue({
      amount: offer.amount,
      termMonths: offer.term,
    });
    this.showOffers.set(false);
    const formSection = document.querySelector('.bg-white.rounded-xl.shadow-sm.p-4 form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  applyLoan() {
    if (this.loanForm.invalid) return;
    this.isSubmitting = true;

    const val = this.loanForm.value;
    const payload = { ...val, termMonths: Number(val.termMonths) };

    this.loanService.applyLoan(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Loan application submitted successfully.');
        this.loanForm.reset({ amount: 1000, termMonths: 12, purpose: '' });
        this.loadLoans();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastService.error(err.error?.message || 'Failed to apply for loan');
      },
    });
  }

  payLoan(id: string, amount: number) {
    this.loanService.payLoan(id, amount).subscribe({
      next: () => {
        this.toastService.success(`Successfully paid $${amount}`);
        this.loadLoans();
      },
      error: (err) => this.toastService.error(err.error?.message || 'Payment failed'),
    });
  }
}
