import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, timeout, forkJoin, of, catchError, map, switchMap } from 'rxjs';
import {
  LucideAngularModule,
  ArrowLeft,
  Wallet,
  PiggyBank,
  TrendingUp,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Send,
} from 'lucide-angular';

import { AccountService, Account } from '../../services/account/account.service';
import { CardService } from '../../services/card/card.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService, Transaction } from '../../services/transaction/transaction.service';
import { getSignedAmount, isIncomingTransaction } from '../../core/transaction-direction.util';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="bg-slate-50 min-h-screen pb-8">
      <div class="status-bar-spacer bg-blue-600"></div>

      @if (!accountResolved()) {
        <div class="px-5 pt-20">
          <div class="max-w-lg mx-auto text-center">
            <p class="text-slate-500">Loading account details...</p>
          </div>
        </div>
      } @else if (account(); as account) {
        <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-6 pb-20">
          <div class="max-w-lg mx-auto">
            <div class="flex items-center gap-4 mb-6">
              <a
                routerLink="/user/accounts"
                class="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
              >
                <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
              </a>
              <h1 class="text-xl font-bold capitalize">{{ account.type }} Account</h1>
            </div>

            <div class="text-center">
              <p class="text-blue-100 text-sm">Available Balance</p>
              <p class="text-4xl font-bold mt-1">{{ account.balance | currency }}</p>
              <div class="flex items-center justify-center gap-2 mt-2">
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full"
                  [class]="
                    account.status === 'active'
                      ? 'bg-emerald-400/30 text-emerald-200'
                      : 'bg-slate-400/30 text-slate-200'
                  "
                >
                  {{ account.status | titlecase }}
                </span>
                <span class="text-blue-200 text-sm"
                  >****{{ account.accountNumber.slice(-4) || '****' }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 -mt-10">
          <div class="max-w-lg mx-auto space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <a
                routerLink="/user/cards"
                [queryParams]="{ accountId: account._id }"
                class="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
              >
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <lucide-icon [img]="creditCard" class="w-5 h-5 text-blue-600"></lucide-icon>
                </div>
                <span class="text-xs font-medium text-slate-700">Cards</span>
              </a>
              <a
                routerLink="/user/transfer"
                class="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
              >
                <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <lucide-icon [img]="send" class="w-5 h-5 text-emerald-600"></lucide-icon>
                </div>
                <span class="text-xs font-medium text-slate-700">Transfer</span>
              </a>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-emerald-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-1">
                  <lucide-icon [img]="arrowDownLeft" class="w-4 h-4 text-emerald-600"></lucide-icon>
                  <span class="text-xs text-slate-600">Income</span>
                </div>
                <p class="font-semibold text-emerald-700">{{ totalIncome() | currency }}</p>
              </div>
              <div class="bg-red-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-1">
                  <lucide-icon [img]="arrowUpRight" class="w-4 h-4 text-red-600"></lucide-icon>
                  <span class="text-xs text-slate-600">Expenses</span>
                </div>
                <p class="font-semibold text-red-700">{{ totalExpenses() | currency }}</p>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100">
                <h2 class="font-semibold text-slate-900">Recent Transactions</h2>
              </div>
              @if (loadingTx()) {
                <div class="p-8 text-center text-slate-500 text-sm">Loading transactions...</div>
              } @else if (transactions().length === 0) {
                <div class="p-8 text-center text-slate-500 text-sm">No transactions yet</div>
              } @else {
                <div class="divide-y divide-slate-100">
                  @for (tx of transactions(); track tx._id) {
                    <div class="px-5 py-3.5 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-9 h-9 rounded-full flex items-center justify-center"
                          [class]="isIncomingTransaction(tx) ? 'bg-emerald-100' : 'bg-slate-100'"
                        >
                          <lucide-icon
                            [img]="isIncomingTransaction(tx) ? arrowDownLeft : arrowUpRight"
                            [class]="
                              isIncomingTransaction(tx)
                                ? 'w-4 h-4 text-emerald-600'
                                : 'w-4 h-4 text-slate-500'
                            "
                          >
                          </lucide-icon>
                        </div>
                        <div>
                          <p class="text-sm font-medium text-slate-900">
                            {{
                              tx.description || tx.receiverName || tx.senderName || 'Transaction'
                            }}
                          </p>
                          <p class="text-xs text-slate-400">
                            {{ tx.createdAt | date: 'mediumDate' }}
                          </p>
                        </div>
                      </div>
                      <p
                        class="text-sm font-semibold"
                        [class]="isIncomingTransaction(tx) ? 'text-emerald-600' : 'text-slate-900'"
                      >
                        {{ resolveSignedAmount(tx) | currency }}
                      </p>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- View All Transactions -->
            <a
              routerLink="/user/transactions"
              [queryParams]="{ accountId: account._id }"
              class="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-3 transition-colors"
            >
              View All Transactions
              <lucide-icon [img]="arrowUpRight" class="w-4 h-4"></lucide-icon>
            </a>

            @if ($any(account).bankName) {
              <div class="bg-white rounded-2xl shadow-sm p-5">
                <h3 class="text-sm font-medium text-slate-500 mb-2">Account Details</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Bank</span>
                    <span class="text-slate-900">{{ $any(account).bankName }}</span>
                  </div>
                  @if ($any(account).accountHolderName) {
                    <div class="flex justify-between">
                      <span class="text-slate-500">Account Holder</span>
                      <span class="text-slate-900">{{ $any(account).accountHolderName }}</span>
                    </div>
                  }
                  <div class="flex justify-between">
                    <span class="text-slate-500">Account Number</span>
                    <span class="text-slate-900 font-mono">{{ account.accountNumber }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Status</span>
                    <span class="text-slate-900 capitalize">{{ account.status }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="px-5 pt-20">
          <div class="max-w-lg mx-auto text-center">
            <p class="text-slate-500">Account not found</p>
            <a routerLink="/user/accounts" class="mt-3 inline-block text-blue-600 text-sm"
              >Back to accounts</a
            >
          </div>
        </div>
      }

      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class AccountDetailComponent implements OnInit {
  account = signal<Account | null>(null);
  transactions = signal<Transaction[]>([]);
  loading = signal(true);
  loadingTx = signal(true);
  accountResolved = signal(false);
  totalIncome = signal(0);
  totalExpenses = signal(0);

  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private cardService = inject(CardService);
  private toast = inject(ToastService);
  private readonly requestTimeoutMs = 12000;
  private hardLoadingFallbackMs = 15000;
  private accountLoadingFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private attemptedAccountsListFallback = false;
  private lastRequestedAccountId: string | null = null;

  arrowLeft = ArrowLeft;
  wallet = Wallet;
  piggyBank = PiggyBank;
  trendingUp = TrendingUp;
  landmark = Landmark;
  arrowDownLeft = ArrowDownLeft;
  arrowUpRight = ArrowUpRight;
  creditCard = CreditCard;
  send = Send;

  ngOnInit(): void {
    this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      console.log('[AccountDetail] Route paramMap emission', {
        id,
        lastRequestedAccountId: this.lastRequestedAccountId,
      });

      if (!id) {
        this.lastRequestedAccountId = null;
        this.account.set(null);
        this.transactions.set([]);
        this.totalIncome.set(0);
        this.totalExpenses.set(0);
        this.loading.set(false);
        this.loadingTx.set(false);
        this.accountResolved.set(true);
        return;
      }

      if (this.lastRequestedAccountId === id) {
        return;
      }
      this.lastRequestedAccountId = id;
      this.attemptedAccountsListFallback = false;
      this.transactions.set([]);
      this.totalIncome.set(0);
      this.totalExpenses.set(0);
      this.accountResolved.set(false);

      this.loadAccount(id);
      this.loadTransactions(id);
    });
  }

  loadAccount(id: string): void {
    if (this.account()?._id !== id) {
      this.loading.set(true);
    }
    this.clearAccountLoadingFallback();
    this.accountLoadingFallbackTimer = setTimeout(() => {
      if (!this.account()) {
        console.error('[AccountDetail] Hard fallback reached without account payload', { id });
        this.tryResolveAccountFromAccountsList(id, 'hard-fallback');
      }
    }, this.hardLoadingFallbackMs);
    console.log('[AccountDetail] Loading account details', { id });

    this.accountService
      .getAccountById(id)
      .pipe(
        timeout(this.requestTimeoutMs),
        finalize(() => {
          this.clearAccountLoadingFallback();
          console.log('[AccountDetail] Account load finalize', {
            id,
            hasAccount: !!this.account(),
          });
          this.loading.set(false);
          this.accountResolved.set(true);
        }),
      )
      .subscribe({
        next: (accountResponse: unknown) => {
          const account = this.normalizeAccountResponse(accountResponse);
          console.log('[AccountDetail] Account loaded successfully', {
            id,
            accountId: account?._id,
            responseKeys:
              accountResponse && typeof accountResponse === 'object'
                ? Object.keys(accountResponse as object)
                : [],
          });
          this.account.set(account);
          if (!account) {
            this.tryResolveAccountFromAccountsList(id, 'response-shape');
          }
        },
        error: (err) => {
          console.error('[AccountDetail] Account load failed', { id, err });
          if (err?.status === 403) {
            this.toast.error('Access denied to this account');
            return;
          }
          if (err?.name === 'TimeoutError') {
            this.tryResolveAccountFromAccountsList(id, 'timeout');
            this.toast.error('Account details request timed out');
            return;
          }
          this.toast.error('Failed to load account');
        },
      });
  }

  loadTransactions(accountId: string): void {
    this.loadingTx.set(true);
    this.transactionService
      .getTransactions({ accountId }, { limit: 20 })
      .pipe(
        timeout(this.requestTimeoutMs),
        switchMap((txs) => {
          const allTxs = this.normalizeTransactionsResponse(txs);
          // Fetch card transactions for this account and merge
          return this.cardService.getCardsByAccountId(accountId).pipe(
            catchError(() => of([] as any[])),
            switchMap((cards) => {
              if (cards.length === 0) {
                return of([] as any[]);
              }
              const cardTxObs = cards.map((c: any) =>
                this.cardService.getCardTransactions(c._id).pipe(catchError(() => of([]))),
              );
              return cardTxObs.length > 0
                ? forkJoin(cardTxObs).pipe(map((arrs) => arrs.flat()))
                : of([] as any[]);
            }),
            map((cardTxs: any[]) => {
              const normalized: Transaction[] = cardTxs.map((ct) => ({
                _id: `card-${ct.transactionId || ct._id}`,
                amount: ct.amount,
                type: 'card_purchase',
                status: 'confirmed',
                description: ct.merchantDetails || 'Card Transaction',
                createdAt: ct.date || ct.createdAt,
                receiverName: ct.merchantDetails,
              }));
              const deduped = normalized.filter(
                (ct) =>
                  !allTxs.some(
                    (tx) =>
                      tx._id === ct._id ||
                      (tx.description === ct.description && Math.abs(tx.amount - ct.amount) < 0.01),
                  ),
              );
              const merged = [...allTxs, ...deduped].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
              return merged.slice(0, 10);
            }),
            catchError(() => of(allTxs)),
          );
        }),
        finalize(() => {
          this.loadingTx.set(false);
        }),
      )
      .subscribe({
        next: (mergedTxs) => {
          this.transactions.set(mergedTxs);
          this.totalIncome.set(
            mergedTxs
              .map((tx) => this.resolveSignedAmount(tx))
              .filter((amount) => amount > 0)
              .reduce((sum, amount) => sum + amount, 0),
          );
          this.totalExpenses.set(
            mergedTxs
              .map((tx) => this.resolveSignedAmount(tx))
              .filter((amount) => amount < 0)
              .reduce((sum, amount) => sum + Math.abs(amount), 0),
          );
        },
        error: (err) => {
          if (err?.name === 'TimeoutError') {
            this.toast.error('Transactions request timed out');
            return;
          }
          this.toast.error('Failed to load transactions');
        },
      });
  }

  private normalizeTransactionsResponse(txs: unknown): Transaction[] {
    if (Array.isArray(txs)) {
      return txs as Transaction[];
    }

    if (txs && typeof txs === 'object' && Array.isArray((txs as any).data)) {
      return (txs as any).data as Transaction[];
    }

    return [];
  }

  private normalizeAccountResponse(payload: unknown): Account | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidate = (payload as any)?._id
      ? payload
      : (payload as any)?._doc?._id
        ? (payload as any)._doc
        : (payload as any)?.account?._id
          ? (payload as any).account
          : (payload as any)?.account?._doc?._id
            ? (payload as any).account._doc
            : (payload as any)?.data?._id
              ? (payload as any).data
              : (payload as any)?.data?._doc?._id
                ? (payload as any).data._doc
                : (payload as any)?.data?.account?._id
                  ? (payload as any).data.account
                  : (payload as any)?.data?.account?._doc?._id
                    ? (payload as any).data.account._doc
                    : null;
    return candidate as Account | null;
  }

  private clearAccountLoadingFallback(): void {
    if (this.accountLoadingFallbackTimer) {
      clearTimeout(this.accountLoadingFallbackTimer);
      this.accountLoadingFallbackTimer = null;
    }
  }

  private tryResolveAccountFromAccountsList(id: string, source: string): void {
    if (this.attemptedAccountsListFallback) {
      this.loading.set(false);
      this.accountResolved.set(true);
      return;
    }
    this.attemptedAccountsListFallback = true;
    console.warn('[AccountDetail] Trying accounts-list fallback', { id, source });

    this.accountService
      .getAccounts()
      .pipe(timeout(this.requestTimeoutMs))
      .subscribe({
        next: (accounts) => {
          const matched = (accounts || []).find((account) => account._id === id) ?? null;
          this.account.set(matched);
          this.loading.set(false);
          this.accountResolved.set(true);
          if (!matched) {
            this.toast.error('Account not found in your profile');
          }
        },
        error: (fallbackErr) => {
          console.error('[AccountDetail] Accounts-list fallback failed', {
            id,
            source,
            fallbackErr,
          });
          this.loading.set(false);
          this.accountResolved.set(true);
        },
      });
  }

  isIncomingTransaction(tx: Transaction): boolean {
    return isIncomingTransaction(tx);
  }

  resolveSignedAmount(tx: Transaction): number {
    return getSignedAmount(tx);
  }
}
