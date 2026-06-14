import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LucideAngularModule,
  ArrowLeft,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet,
  Home,
  Send,
  CreditCard,
  Landmark,
  Bell,
  Headphones,
  Download,
  Clock,
} from 'lucide-angular';
import { forkJoin, of, Observable, Subject, Subscription } from 'rxjs';
import { map, catchError, switchMap, debounceTime, takeUntil } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AccountService, Account } from '../../services/account/account.service';
import { CardService } from '../../services/card/card.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService, Transaction } from '../../services/transaction/transaction.service';
import { TransactionStateService } from '../../services/transaction/transaction-state.service';
import { TransferService } from '../../services/transfer/transfer.service';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../../ui/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../ui/card/card.component';
import { TransactionDetailModalComponent } from '../../ui/transaction-detail-modal/transaction-detail-modal.component';
import { TransactionItemComponent } from '../../ui/transaction-item/transaction-item.component';
import {
  getSignedAmount,
  isExpenseTransaction,
  isIncomeTransaction,
  isIncomingTransaction,
} from '../../core/transaction-direction.util';

@Component({
  selector: 'app-user-transactions',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    LucideAngularModule,
    CardComponent,
    TransactionItemComponent,
    BottomSheetComponent,
    BottomNavComponent,
    TransactionDetailModalComponent,
  ],
  template: `
    <div class="bg-slate-50 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Header -->
      <div class="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto flex items-center gap-4">
          <a
            routerLink="/user/dashboard"
            class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5 text-slate-600"></lucide-icon>
          </a>
          <h1 class="text-xl font-bold text-slate-900">Transactions</h1>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          <!-- Pending Transfer Verification Banner -->
          @if (pendingTransferId()) {
            <app-card padding="md" class="mb-4">
              <div class="flex items-start gap-3 mb-3">
                <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <lucide-icon [img]="clock" class="w-4 h-4 text-amber-600"></lucide-icon>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-slate-900">Pending Transfer Verification</p>
                  <p class="text-xs text-slate-500">Request ID: {{ pendingTransferId() }}</p>
                </div>
              </div>
              <p class="text-sm text-amber-700 mb-3">
                A verification code was sent to your email. Enter it below to complete your
                transfer.
              </p>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="verificationCode"
                  placeholder="Enter 6-digit code"
                  maxlength="6"
                  class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  (click)="verifyPendingTransfer()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Verify
                </button>
              </div>
            </app-card>
          }

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-emerald-50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-1">
                <lucide-icon [img]="arrowDownLeft" class="w-4 h-4 text-emerald-600"></lucide-icon>
                <span class="text-xs text-slate-600">Income</span>
              </div>
              <p class="font-semibold text-emerald-700 text-lg">{{ monthlyIncome() | currency }}</p>
              <p class="text-xs text-emerald-600">This month</p>
            </div>
            <div class="bg-red-50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-1">
                <lucide-icon [img]="arrowUpRight" class="w-4 h-4 text-red-600"></lucide-icon>
                <span class="text-xs text-slate-600">Expenses</span>
              </div>
              <p class="font-semibold text-red-700 text-lg">{{ monthlyExpenses() | currency }}</p>
              <p class="text-xs text-red-600">This month</p>
            </div>
          </div>

          <!-- Search & Filter -->
          <div class="flex gap-2 mb-4">
            <div class="flex-1 relative">
              <lucide-icon
                [img]="search"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              ></lucide-icon>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="applyClientFilters()"
                placeholder="Search transactions"
                class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              (click)="filterModalOpen = true"
              class="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <lucide-icon [img]="filter" class="w-5 h-5 text-slate-600"></lucide-icon>
            </button>
            <button
              (click)="exportStatementPdf()"
              class="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              title="Export statement PDF"
            >
              <lucide-icon [img]="download" class="w-5 h-5 text-slate-600"></lucide-icon>
            </button>
            <button
              (click)="exportStatementCsv()"
              class="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-600"
              title="Export statement CSV"
            >
              CSV
            </button>
          </div>

          <!-- Filter Chips -->
          <div class="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
            <button
              (click)="setTypeFilter('')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              [class]="
                activeFilter() === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              "
            >
              All
            </button>
            <button
              (click)="setTypeFilter('income')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              [class]="
                activeFilter() === 'income'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              "
            >
              Income
            </button>
            <button
              (click)="setTypeFilter('expenses')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              [class]="
                activeFilter() === 'expenses'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              "
            >
              Expenses
            </button>
          </div>

          <!-- Transactions List -->
          <div class="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
            @for (tx of filteredTransactions(); track tx._id) {
              <app-transaction-item
                [title]="tx.description || tx.receiverName || 'Transaction'"
                [subtitle]="(tx.createdAt | date: 'short') || ''"
                [amount]="tx.amount"
                [type]="
                  tx.type === 'deposit' ||
                  tx.type === 'withdrawal' ||
                  tx.type === 'transfer' ||
                  tx.type === 'payment'
                    ? tx.type
                    : 'deposit'
                "
                [isIncoming]="isIncomingTransaction(tx)"
                [category]="tx.type"
                [icon]="
                  tx.type === 'transfer'
                    ? 'arrow-right-left'
                    : tx.type === 'deposit'
                      ? 'building-2'
                      : 'shopping-bag'
                "
                [transactionId]="tx._id"
                (itemClick)="openTransactionDetail($event)"
              ></app-transaction-item>
            } @empty {
              <div class="p-8 text-center text-slate-500">
                <p>
                  {{ loadingTransactions() ? 'Loading transactions...' : 'No transactions found.' }}
                </p>
              </div>
            }
          </div>
          <div class="flex items-center justify-between mt-4 px-1">
            <button
              type="button"
              (click)="goToPreviousPage()"
              [disabled]="offset === 0 || loadingTransactions()"
              class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
            >
              Previous
            </button>
            <p class="text-xs text-slate-500">{{ pageSummary() }}</p>
            <button
              type="button"
              (click)="goToNextPage()"
              [disabled]="!hasNextPage() || loadingTransactions()"
              class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems" (onMoreClick)="moreMenuOpen = true"></app-bottom-nav>

      <!-- Transaction Detail Modal -->
      <app-transaction-detail-modal
        [(isOpen)]="transactionDetailOpen"
        [transactionId]="selectedTransactionId()"
      ></app-transaction-detail-modal>

      <!-- Filter Modal -->
      <app-bottom-sheet [(isOpen)]="filterModalOpen" title="Filter Transactions">
        <div class="space-y-4">
          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-500">From</label>
                <input
                  type="date"
                  [(ngModel)]="startDate"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label class="text-xs text-slate-500">To</label>
                <input
                  type="date"
                  [(ngModel)]="endDate"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Account</label>
            <select
              [(ngModel)]="selectedAccountId"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">All Accounts</option>
              @for (account of accountOptions(); track account._id) {
                <option [value]="account._id">
                  {{
                    (account.type | titlecase) +
                      ' • ****' +
                      (account.accountNumber.slice(-4) || '****')
                  }}
                </option>
              }
            </select>
          </div>

          <!-- Transaction Type -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Transaction Type</label>
            <div class="flex flex-wrap gap-2">
              <button
                (click)="setTypeFilter('')"
                class="px-3 py-2 rounded-lg text-sm font-medium"
                [class]="
                  activeFilter() === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                "
              >
                All
              </button>
              <button
                (click)="setTypeFilter('income')"
                class="px-3 py-2 rounded-lg text-sm font-medium"
                [class]="
                  activeFilter() === 'income'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                "
              >
                Income
              </button>
              <button
                (click)="setTypeFilter('expenses')"
                class="px-3 py-2 rounded-lg text-sm font-medium"
                [class]="
                  activeFilter() === 'expenses'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                "
              >
                Expense
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              [(ngModel)]="selectedStatus"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">All statuses</option>
              <option value="initiated">Initiated</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Amount Range -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Amount Range</label>
            <div class="grid grid-cols-2 gap-3">
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  [(ngModel)]="minAmount"
                  placeholder="Min"
                  class="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  [(ngModel)]="maxAmount"
                  placeholder="Max"
                  class="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            (click)="resetFilters()"
            class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
          >
            Reset
          </button>
          <button
            (click)="applyFilters()"
            class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </app-bottom-sheet>

      <!-- More Menu Modal -->
      <app-bottom-sheet [(isOpen)]="moreMenuOpen" title="More">
        <div class="grid grid-cols-3 gap-4 mb-4">
          @if (loansEnabled) {
            <a
              routerLink="/user/loans"
              class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="landmark" class="w-6 h-6 text-amber-600"></lucide-icon>
              </div>
              <span class="text-sm text-slate-700">Loans</span>
            </a>
          }
          <a
            routerLink="/user/notifications"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="bell" class="w-6 h-6 text-blue-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Notifications</span>
          </a>
          <a
            routerLink="/user/support"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="headphones" class="w-6 h-6 text-emerald-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Support</span>
          </a>
        </div>
        <button
          (click)="moreMenuOpen = false"
          class="w-full py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </app-bottom-sheet>
    </div>
  `,
})
export class UserTransactionsComponent implements OnInit, OnDestroy {
  filterModalOpen = false;
  moreMenuOpen = false;

  startDate = '';
  endDate = '';
  selectedAccountId = '';
  selectedType = '';
  selectedStatus = '';
  minAmount: number | undefined;
  maxAmount: number | undefined;
  searchQuery = '';
  offset = 0;
  limit = 20;
  activeFilter = signal<string>('');

  // Debounce subject for filter changes
  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private filterSubscription?: Subscription;

  private transactionService = inject(TransactionService);
  private txState = inject(TransactionStateService);
  private cardService = inject(CardService);
  private accountService = inject(AccountService);
  private transferService = inject(TransferService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  transactions = signal<Transaction[]>([]);
  filteredTransactions = signal<Transaction[]>([]);
  accountOptions = signal<Account[]>([]);
  monthlyIncome = this.txState.monthlyIncome;
  monthlyExpenses = this.txState.monthlyExpenses;
  loadingTransactions = signal(false);
  hasNextPage = signal(false);
  totalCount = signal(0);
  loansEnabled = environment.features.loansEnabled;

  // Pending transfer verification
  pendingTransferId = signal<string>('');
  verificationCode = '';

  // Transaction detail modal
  transactionDetailOpen = false;
  selectedTransactionId = signal<string>('');

  ngOnInit() {
    // Setup debounced filter changes (300ms debounce)
    this.filterSubscription = this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.executeLoadTransactions();
      });

    this.loadAccountsForFilter();
    // Read accountId from URL query params for pre-filtering (routed from account detail)
    this.route.queryParams.subscribe((params) => {
      if (params['pendingTransfer']) {
        this.pendingTransferId.set(params['pendingTransfer']);
      }
      if (params['accountId']) {
        this.selectedAccountId = params['accountId'];
      }
    });
    this.triggerLoadTransactions(); // Initial load
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.filterSubscription?.unsubscribe();
  }

  verifyPendingTransfer(): void {
    if (!this.pendingTransferId()) {
      this.toast.error('No pending transfer found');
      return;
    }
    if (!/^\d{6}$/.test(this.verificationCode.trim())) {
      this.toast.error('Please enter the 6-digit verification code');
      return;
    }

    this.transferService
      .verifyTransferRequest({
        requestId: this.pendingTransferId(),
        code: this.verificationCode.trim(),
      })
      .subscribe({
        next: (res: any) => {
          const returnedStatus = res?.status;
          if (returnedStatus === 'pending_admin') {
            this.toast.info('Transfer verified. Awaiting bank approval.');
          } else {
            this.toast.success('Transfer verified successfully');
          }
          this.pendingTransferId.set('');
          this.verificationCode = '';
          this.triggerLoadTransactions(); // Refresh to show new transfer
        },
        error: (err) => {
          const msg = err?.error?.message || 'Verification failed';
          this.toast.error(msg);
        },
      });
  }

  openTransactionDetail(transactionId: string): void {
    console.log('[USER-TRANSACTIONS] Opening transaction detail:', transactionId);
    this.selectedTransactionId.set(transactionId);
    this.transactionDetailOpen = true;
  }

  /**
   * Trigger a debounced load of transactions
   * Use this for filter changes to avoid rapid API calls
   */
  triggerLoadTransactions(): void {
    this.filterChange$.next();
  }

  /**
   * Execute the actual transaction load (bypasses debounce)
   * Called internally after debounce or for immediate loads
   */
  private executeLoadTransactions(): void {
    const hasServerFilters =
      !!this.startDate ||
      !!this.endDate ||
      !!this.selectedAccountId ||
      !!this.selectedStatus ||
      (!!this.selectedType &&
        ['deposit', 'withdrawal', 'transfer', 'payment', 'card_purchase'].includes(
          this.selectedType,
        ));

    this.loadingTransactions.set(true);

    if (hasServerFilters) {
      // When server-side filters are active, use the paginated API directly
      const filters: any = {};
      if (this.startDate) filters.startDate = this.startDate;
      if (this.endDate) filters.endDate = this.endDate;
      if (this.selectedAccountId) filters.accountId = this.selectedAccountId;
      if (this.selectedType) filters.type = this.selectedType;
      if (this.selectedStatus) filters.status = this.selectedStatus;

      this.transactionService
        .getTransactions({ ...filters, offset: this.offset, limit: this.limit, sort: '-createdAt' })
        .subscribe({
          next: (responseData) => {
            const isPaginated = 'data' in responseData;
            const data: Transaction[] = isPaginated ? responseData.data : responseData;
            const totalFromMeta = isPaginated
              ? (responseData.meta?.total ?? data.length)
              : data.length;
            this.totalCount.set(totalFromMeta);
            this.hasNextPage.set(this.offset + this.limit < totalFromMeta);
            this.transactions.set(data);
            this.applyClientFilters();
            this.loadingTransactions.set(false);
          },
          error: () => {
            this.loadingTransactions.set(false);
            this.toast.error('Failed to load transactions');
          },
        });
    } else {
      // No server filters — use the shared state (includes card txs)
      this.txState.loadTransactions(true /* forceRefresh */).subscribe({
        next: (merged) => {
          this.totalCount.set(merged.length);
          this.hasNextPage.set(this.offset + this.limit < merged.length);
          this.transactions.set(merged);
          this.applyClientFilters();
          this.loadingTransactions.set(false);
        },
        error: () => {
          this.loadingTransactions.set(false);
          this.toast.error('Failed to load transactions');
        },
      });
    }
  }

  recalculateMonthly(_data: Transaction[]): void {
    // Monthly income/expenses are now computed from TransactionStateService.
    // This method is kept for API compat but the values come from the shared
    // signal-based state automatically.
  }

  /**
   * Apply filters with debounce
   * Closes filter modal and triggers debounced load
   */
  applyFilters(): void {
    this.filterModalOpen = false;
    this.offset = 0;
    this.applyClientFilters();
    this.triggerLoadTransactions();
  }

  /**
   * Reset all filters and trigger debounced load
   */
  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedAccountId = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.minAmount = undefined;
    this.maxAmount = undefined;
    this.searchQuery = '';
    this.offset = 0;
    this.activeFilter.set('');
    this.filterModalOpen = false;
    this.triggerLoadTransactions();
  }

  private loadAccountsForFilter(): void {
    this.accountService.getAccounts().subscribe({
      next: (accounts) => this.accountOptions.set(accounts),
      error: () => this.accountOptions.set([]),
    });
  }

  /**
   * Set type filter with debounce
   * Rapid clicks are debounced to prevent multiple API calls
   */
  setTypeFilter(type: string): void {
    this.selectedType = type;
    this.activeFilter.set(type);
    this.offset = 0;
    this.triggerLoadTransactions();
  }

  exportStatementPdf(): void {
    const txs = this.filteredTransactions();
    if (txs.length === 0) {
      this.toast.info('No transactions to export.');
      return;
    }

    const statementDate = new Date();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always',
    });

    const rows = txs.map((tx) => {
      const signed = this.resolveSignedAmount(tx);
      return [
        tx._id || '-',
        new Date(tx.createdAt).toLocaleDateString(),
        tx.type,
        tx.description || tx.receiverName || tx.senderName || 'Transaction',
        currencyFormatter.format(signed),
        tx.status || '-',
      ];
    });

    const chunkSize = 20;
    const chunks: string[][][] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push(rows.slice(i, i + chunkSize));
    }

    chunks.forEach((chunk, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.setFontSize(16);
      doc.text('Transaction Statement', 40, 40);
      doc.setFontSize(10);
      doc.text(`Generated: ${statementDate.toLocaleString()}`, 40, 58);
      if (this.startDate || this.endDate) {
        doc.text(`Range: ${this.startDate || '...'} to ${this.endDate || '...'}`, 40, 74);
      }

      autoTable(doc, {
        head: [['ID', 'Date', 'Type', 'Description', 'Amount', 'Status']],
        body: chunk,
        startY: this.startDate || this.endDate ? 86 : 70,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
        theme: 'grid',
      });

      doc.setFontSize(9);
      doc.text(`Page ${index + 1} of ${chunks.length}`, 40, doc.internal.pageSize.height - 20);
    });

    const credits = txs
      .map((tx) => this.resolveSignedAmount(tx))
      .filter((amount) => amount > 0)
      .reduce((sum, amount) => sum + amount, 0);
    const debitsAbs = txs
      .map((tx) => this.resolveSignedAmount(tx))
      .filter((amount) => amount < 0)
      .reduce((sum, amount) => sum + Math.abs(amount), 0);
    const net = credits - debitsAbs;

    const y = doc.internal.pageSize.height - 54;
    doc.setFontSize(10);
    doc.text(`Total Credits: ${currencyFormatter.format(credits)}`, 40, y);
    doc.text(`Total Debits: ${currencyFormatter.format(-debitsAbs)}`, 40, y + 14);
    doc.text(`Net Change: ${currencyFormatter.format(net)}`, 40, y + 28);

    const fileName = `statement-${statementDate.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    this.toast.success('Statement PDF exported.');
  }

  exportStatementCsv(): void {
    const txs = this.filteredTransactions();
    if (txs.length === 0) {
      this.toast.info('No transactions to export.');
      return;
    }
    const header = ['ID', 'Date', 'Type', 'Description', 'Amount', 'Status'];
    const rows = txs.map((tx) => [
      tx._id || '',
      new Date(tx.createdAt).toISOString(),
      tx.type || '',
      tx.description || tx.receiverName || tx.senderName || 'Transaction',
      this.resolveSignedAmount(tx).toFixed(2),
      tx.status || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `statement-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast.success('Statement CSV exported.');
  }

  goToNextPage(): void {
    if (!this.hasNextPage() || this.loadingTransactions()) {
      return;
    }
    this.offset += this.limit;
    this.triggerLoadTransactions();
  }

  goToPreviousPage(): void {
    if (this.offset === 0 || this.loadingTransactions()) {
      return;
    }
    this.offset = Math.max(0, this.offset - this.limit);
    this.triggerLoadTransactions();
  }

  pageSummary(): string {
    if (this.loadingTransactions()) {
      return 'Loading...';
    }
    const total = this.totalCount();
    if (total === 0) {
      return 'No results';
    }
    const from = this.offset + 1;
    const to = Math.min(this.offset + this.limit, total);
    return `${from}-${to} of ${total}`;
  }

  applyClientFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const normalizedSelectedStatus = this.normalizeStatus(this.selectedStatus);
    const min = this.minAmount ?? 0;
    const max = this.maxAmount ?? Infinity;
    const selectedAccountId = this.selectedAccountId.trim();
    const startTime = this.startDate
      ? new Date(`${this.startDate}T00:00:00`).getTime()
      : Number.NEGATIVE_INFINITY;
    const endTime = this.endDate
      ? new Date(`${this.endDate}T23:59:59.999`).getTime()
      : Number.POSITIVE_INFINITY;
    const filtered = this.transactions().filter((tx) => {
      const text =
        `${tx.description || ''} ${tx.receiverName || ''} ${tx.senderName || ''} ${tx.type || ''}`.toLowerCase();
      const queryMatch = !query || text.includes(query);
      const statusMatch =
        !normalizedSelectedStatus || this.normalizeStatus(tx.status) === normalizedSelectedStatus;
      const typeMatch = this.matchesTypeFilter(tx);
      const accountMatch = this.matchesAccountFilter(tx, selectedAccountId);
      const timestamp = new Date(tx.createdAt).getTime();
      const dateMatch =
        Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
      const amountMatch = tx.amount >= min && tx.amount <= max;
      return queryMatch && statusMatch && typeMatch && accountMatch && dateMatch && amountMatch;
    });
    this.filteredTransactions.set(filtered);
    this.recalculateMonthly(filtered);
  }

  private matchesTypeFilter(tx: Transaction): boolean {
    if (!this.selectedType) {
      return true;
    }
    const type = (tx.type || '').toLowerCase();
    if (this.selectedType === 'income') {
      return isIncomeTransaction(tx);
    }
    if (this.selectedType === 'expenses') {
      return isExpenseTransaction(tx);
    }
    return this.selectedType === type;
  }

  private matchesAccountFilter(tx: Transaction, selectedAccountId: string): boolean {
    if (!selectedAccountId) {
      return true;
    }
    const rawTx = tx as any;
    const accountCandidates = [
      tx.fromAccountId,
      tx.toAccountId,
      rawTx.accountId,
      rawTx.fromAccount?._id,
      rawTx.toAccount?._id,
      rawTx.account?._id,
    ];
    return accountCandidates.some((value) => value && String(value) === selectedAccountId);
  }

  private normalizeStatus(status?: string): string {
    const value = (status || '').trim().toLowerCase();
    if (value === 'completed') {
      return 'confirmed';
    }
    return value;
  }

  private resolveSignedAmount(tx: Transaction): number {
    return getSignedAmount(tx);
  }

  isIncomingTransaction(tx: Transaction): boolean {
    return isIncomingTransaction(tx);
  }

  // Icons
  arrowLeft = ArrowLeft;
  search = Search;
  filter = Filter;
  arrowDownLeft = ArrowDownLeft;
  clock = Clock;
  arrowUpRight = ArrowUpRight;
  arrowRightLeft = ArrowRightLeft;
  landmark = Landmark;
  bell = Bell;
  headphones = Headphones;
  download = Download;

  navItems: NavItem[] = [
    { label: 'Home', icon: Home, route: '/user/dashboard' },
    { label: 'Accounts', icon: Wallet, route: '/user/accounts' },
    { label: 'Transfer', icon: Send, route: '/user/transfer' },
    { label: 'Cards', icon: CreditCard, route: '/user/cards' },
  ];
}
