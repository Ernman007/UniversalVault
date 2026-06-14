import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CacheStore } from '../../core/cache';
import { AuthService } from '../auth/auth.service';
import { SocketService } from '../socket/socket.service';

export interface Account {
  _id: string;
  type: string;
  balance: number;
  status: string;
  accountNumber: string;
  IBAN?: string;
  userName?: string;
  userEmail?: string;
}

/** Cache keys for AccountService */
const CACHE_KEYS = {
  USER_ACCOUNTS: 'accounts:user',
  ALL_ACCOUNTS: 'accounts:all',
  ACCOUNT_BY_ID: 'accounts:id',
} as const;

/** Cache TTL constants (in ms) */
const CACHE_TTL = {
  ACCOUNTS: 120_000, // 2 minutes - matches backend Redis TTL
  ACCOUNT_BY_ID: 60_000, // 1 minute
} as const;

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private cache = inject(CacheStore);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private apiUrl = `${environment.apiUrl}/accounts`;
  private lastRealtimeRefreshAt = 0;

  accountsState = signal<Account[]>([]);
  totalBalanceState = computed(() =>
    this.accountsState().reduce((sum, account) => sum + (account.balance || 0), 0),
  );

  constructor() {
    this.socketService.on('new_notification', () => {
      const user = this.authService.currentUser();
      if (!user) {
        return;
      }
      const now = Date.now();
      if (now - this.lastRealtimeRefreshAt < 1500) {
        return;
      }
      this.lastRealtimeRefreshAt = now;
      this.refreshAccounts().subscribe({
        error: () => {},
      });
    });
  }

  /**
   * Get current user's accounts with caching
   * Cache TTL: 2 minutes (matches backend Redis TTL)
   */
  getAccounts(forceRefresh = false): Observable<Account[]> {
    return this.cache.get<Account[]>(
      CACHE_KEYS.USER_ACCOUNTS,
      () => this.http.get<Account[]>(this.apiUrl),
      { key: CACHE_KEYS.USER_ACCOUNTS, ttl: CACHE_TTL.ACCOUNTS, forceRefresh }
    );
  }

  loadAccountsIntoState(forceRefresh = false): Observable<Account[]> {
    return this.getAccounts(forceRefresh).pipe(
      tap((accounts) => {
        this.accountsState.set(accounts || []);
      }),
    );
  }

  refreshAccounts(): Observable<Account[]> {
    return this.loadAccountsIntoState(true);
  }

  /**
   * Get all accounts in the system (admin only)
   * Used by admin-create-transaction to select accounts for deposit/withdrawal/transfer
   * Cache TTL: 2 minutes
   */
  getAllAccounts(forceRefresh = false): Observable<Account[]> {
    return this.cache.get<Account[]>(
      CACHE_KEYS.ALL_ACCOUNTS,
      () => this.http.get<Account[]>(`${this.apiUrl}/all`),
      { key: CACHE_KEYS.ALL_ACCOUNTS, ttl: CACHE_TTL.ACCOUNTS, forceRefresh }
    );
  }

  /**
   * Search accounts by user name or email (admin only)
   * Used for searchable dropdowns in admin-create-transaction
   * Note: Search results are NOT cached (dynamic queries)
   * @param query - Search term (min 2 characters)
   */
  searchAccounts(query: string): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  /**
   * Get account by ID with caching
   * Cache TTL: 1 minute
   */
  getAccountById(id: string, forceRefresh = false): Observable<Account> {
    const cacheKey = `${CACHE_KEYS.ACCOUNT_BY_ID}:${id}`;
    return this.cache.get<Account>(
      cacheKey,
      () => this.http.get<Account>(`${this.apiUrl}/${id}`),
      { key: cacheKey, ttl: CACHE_TTL.ACCOUNT_BY_ID, forceRefresh }
    );
  }

  /**
   * Create a new account
   * Invalidates relevant caches after creation
   */
  createAccount(payload: {
    userId: string;
    type: 'savings' | 'checking' | 'investment';
    initialDeposit?: number;
    bankName?: string;
    accountHolderName?: string;
    sourceAccountId?: string;
    supportMessageId?: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  /**
   * Invalidate all account-related caches
   * Call this after account mutations (create, update, delete)
   */
  invalidateAllCaches(): void {
    this.cache.invalidatePattern('accounts');
  }

  /**
   * Invalidate user's accounts cache
   * Call this after user-specific account changes
   */
  invalidateUserAccounts(): void {
    this.cache.invalidateKey(CACHE_KEYS.USER_ACCOUNTS);
  }
}
