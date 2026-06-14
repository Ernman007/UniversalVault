import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, map, tap, forkJoin, catchError, switchMap } from 'rxjs';

import { TransactionService, Transaction, PaginatedResponse } from './transaction.service';
import { AccountService } from '../account/account.service';
import { CardService } from '../card/card.service';
import { getSignedAmount } from '../../core/transaction-direction.util';

/**
 * Shared transaction state service.
 *
 * Both the user dashboard and the transaction history page consume
 * the same signals so that monthly income / expenses numbers are
 * always consistent, regardless of which page loaded first.
 *
 * The service fetches **all** transactions once (the basic un-filtered
 * list) and computes the monthly summary from that single source of truth.
 */
@Injectable({ providedIn: 'root' })
export class TransactionStateService {
  private txService = inject(TransactionService);
  private accountService = inject(AccountService);
  private cardService = inject(CardService);

  /** All transactions fetched from the backend (basic list, no pagination) */
  allTransactions = signal<Transaction[]>([]);

  /** Whether an initial load has already been performed in this session */
  private loaded = false;

  // ── Computed monthly summary (current calendar month) ──────────────

  monthlyIncome = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let income = 0;

    for (const tx of this.allTransactions()) {
      const d = new Date(tx.createdAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const signed = getSignedAmount(tx);
        if (signed > 0) income += signed;
      }
    }
    return income;
  });

  monthlyExpenses = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let expenses = 0;

    for (const tx of this.allTransactions()) {
      const d = new Date(tx.createdAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const signed = getSignedAmount(tx);
        if (signed < 0) expenses += Math.abs(signed);
      }
    }
    return expenses;
  });

  monthlyChange = computed(() => this.monthlyIncome() - this.monthlyExpenses());

  recentTransactions = computed(() => this.allTransactions().slice(0, 5));

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Load all transactions into shared state.
   * Returns the observable so callers can subscribe for completion / errors.
   *
   * @param forceRefresh  If true, always re-fetches from the API.
   * @param includeCards If true, fetches and merges card transactions.
   */
  loadTransactions(forceRefresh = false, includeCards = true): Observable<Transaction[]> {
    if (this.loaded && !forceRefresh) {
      return of(this.allTransactions());
    }

    return this.txService.getTransactions(undefined, undefined, forceRefresh).pipe(
      map((txsData) => this.normalizeResponse(txsData)),
      switchMap((baseTxs) => {
        if (!includeCards) {
          return of(baseTxs);
        }
        return this.accountService.getAccounts().pipe(
          switchMap((accounts) => {
            const allCardObs: Observable<any>[] = accounts.map(a =>
              this.cardService.getCardsByAccountId(a._id).pipe(catchError(() => of([])))
            );
            if (allCardObs.length === 0) return of(baseTxs);

            return forkJoin(allCardObs).pipe(
              map(cardArrays => cardArrays.flat()),
              switchMap(cards => {
                const txObs = cards.map(c =>
                  this.cardService.getCardTransactions(c._id).pipe(catchError(() => of([])))
                );
                return txObs.length > 0 ? forkJoin(txObs).pipe(map(txs => txs.flat())) : of([]);
              }),
              map(cardTxs => {
                const normalized: Transaction[] = cardTxs.map(ct => ({
                  _id: `card-${ct.transactionId || ct._id}`,
                  amount: ct.amount,
                  type: 'card_purchase',
                  status: 'Completed',
                  description: ct.merchantDetails || 'Card Transaction',
                  createdAt: ct.date || ct.createdAt,
                  senderName: undefined,
                  receiverName: ct.merchantDetails,
                }));

                const deduped = normalized.filter(ct =>
                  !baseTxs.some(tx =>
                    tx._id === ct._id ||
                    (tx.description === ct.description && Math.abs(tx.amount - ct.amount) < 0.01)
                  )
                );

                const merged = [...baseTxs, ...deduped].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                return merged;
              }),
              catchError(() => of(baseTxs)) // If card fetching fails, return base txs
            );
          }),
          catchError(() => of(baseTxs)) // If account fetching fails, return base txs
        );
      }),
      tap((mergedTxs) => {
        this.allTransactions.set(mergedTxs);
        this.loaded = true;
      }),
    );
  }

  /**
   * Force-refresh from the API and update signals.
   */
  refresh(): Observable<Transaction[]> {
    return this.loadTransactions(true);
  }

  /**
   * Manually update the all-transactions list (e.g. after merging card txs).
   */
  setTransactions(txs: Transaction[]): void {
    this.allTransactions.set(txs);
    this.loaded = true;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private normalizeResponse(data: unknown): Transaction[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
      return (data as any).data as Transaction[];
    }
    return [];
  }
}
