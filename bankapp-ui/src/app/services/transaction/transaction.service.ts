import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CacheStore } from '../../core/cache';

export interface Transaction {
  _id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  senderName?: string;
  receiverName?: string;
  fromAccountId?: string;
  toAccountId?: string;
  isUserSender?: boolean;
  isUserReceiver?: boolean;
  transferStatus?: string; // 'awaiting_verification' | 'awaiting_bank_approval' | null
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  type?: string;
  status?: string;
}

export interface PaginationParams {
  page?: number;
  offset?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Cache keys for TransactionService */
const CACHE_KEYS = {
  RECENT_TRANSACTIONS: 'transactions:recent',
} as const;

/** Cache TTL constants (in ms) */
const CACHE_TTL = {
  TRANSACTIONS: 60_000, // 1 minute - matches backend Redis TTL
} as const;

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);
  private cache = inject(CacheStore);
  private apiUrl = `${environment.apiUrl}/transactions`;

  constructor() {}

  /**
   * Get transactions with optional filters and pagination
   *
   * CACHING STRATEGY:
   * - Basic list (no filters, no pagination): Cached for 60s
   * - Filtered/paginated queries: NOT cached (dynamic results)
   *
   * @param filters - Optional date range, account, type, status filters
   * @param pagination - Optional page, offset, limit, sort parameters
   * @param forceRefresh - Bypass cache for basic list
   */
  getTransactions(
    filters?: TransactionFilters & Partial<PaginationParams>,
    pagination?: PaginationParams,
    forceRefresh = false,
  ): Observable<Transaction[] | PaginatedResponse<Transaction>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.accountId) params = params.set('accountId', filters.accountId);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.status) params = params.set('status', filters.status);
    }
    const effectivePagination = pagination || {
      page: filters?.page,
      offset: filters?.offset,
      limit: filters?.limit,
      sort: filters?.sort,
    };
    if (effectivePagination) {
      let resolvedPage = effectivePagination.page;
      if (
        !resolvedPage &&
        effectivePagination.offset !== undefined &&
        effectivePagination.offset >= 0 &&
        effectivePagination.limit
      ) {
        resolvedPage = Math.floor(effectivePagination.offset / effectivePagination.limit) + 1;
      }
      if (resolvedPage) params = params.set('page', resolvedPage.toString());
      if (effectivePagination.limit)
        params = params.set('limit', effectivePagination.limit.toString());
      if (effectivePagination.sort) params = params.set('sort', effectivePagination.sort);
    }

    // Determine if this is a cacheable request (no filters, no pagination)
    const isCacheable = !filters && !pagination;

    if (isCacheable) {
      return this.cache.get<Transaction[]>(
        CACHE_KEYS.RECENT_TRANSACTIONS,
        () => this.http.get<Transaction[]>(this.apiUrl, { params }),
        { key: CACHE_KEYS.RECENT_TRANSACTIONS, ttl: CACHE_TTL.TRANSACTIONS, forceRefresh },
      );
    }

    // Dynamic queries: no caching
    return this.http.get<Transaction[] | PaginatedResponse<Transaction>>(this.apiUrl, { params });
  }

  /**
   * Create a new transaction
   * Note: Cache invalidation should be handled by the caller after successful creation
   */
  createTransaction(payload: any): Observable<any> {
    console.log('[TRANSACTION-SERVICE] Sending to backend:', JSON.stringify(payload, null, 2));
    return this.http.post<any>(this.apiUrl, payload);
  }

  /**
   * Create a card transaction
   */
  createCardTransaction(payload: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    amount: number;
    merchantDetails: string;
    transactionType: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/card`, payload);
  }

  /**
   * Get a single transaction by ID
   */
  getTransactionById(id: string): Observable<Transaction> {
    console.log('[TRANSACTION-SERVICE] Fetching transaction by ID:', id);
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }

  /**
   * Invalidate transaction caches
   * Call this after transaction mutations (create, update)
   */
  invalidateCaches(): void {
    this.cache.invalidatePattern('transactions');
  }
}
