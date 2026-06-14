import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CacheStore } from '../../core/cache';
import { CardPinService } from '../card-pin/card-pin.service';

export interface Card {
  _id: string;
  cardNumber: string;
  cardType: string;
  expiryDate: string | Date;  // Backend stores as Date, frontend may receive as ISO string
  cvv: string;
  isFrozen: boolean;
  status: string;
  accountId: string;
  availableCredit?: number;
  creditLimit?: number;
  cardHolderName?: string;
  account?: string | { _id: string; accountNumber?: string };
}

/** Cache keys for CardService */
const CACHE_KEYS = {
  ALL_CARDS: 'cards:all',
  CARDS_BY_ACCOUNT: 'cards:account',
  CARD_TRANSACTIONS: 'cards:transactions',
} as const;

/** Cache TTL constants (in ms) */
const CACHE_TTL = {
  CARDS: 120_000, // 2 minutes
  CARD_TRANSACTIONS: 60_000, // 1 minute
} as const;

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private apiUrl = `${environment.apiUrl}/cards`;
  private http = inject(HttpClient);
  private cache = inject(CacheStore);
  private cardPinService = inject(CardPinService);

  constructor() {}

  /**
   * Get HTTP headers including PIN session token if available
   */
  private getHeaders(): HttpHeaders {
    const pinHeaders = this.cardPinService.getPinTokenHeaders();
    let headers = new HttpHeaders();
    Object.entries(pinHeaders).forEach(([key, value]) => {
      headers = headers.set(key, value);
    });
    return headers;
  }

  /**
   * Get all cards (admin only)
   * Cache TTL: 2 minutes
   */
  getAllCards(forceRefresh = false): Observable<Card[]> {
    return this.cache.get<Card[]>(
      CACHE_KEYS.ALL_CARDS,
      () => this.http.get<Card[]>(this.apiUrl),
      { key: CACHE_KEYS.ALL_CARDS, ttl: CACHE_TTL.CARDS, forceRefresh }
    );
  }

  /**
   * Search cards by query
   * Note: Search results are NOT cached (dynamic queries)
   */
  searchCards(query: string): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  /**
   * Get cards by account ID with caching
   * Cache TTL: 2 minutes
   */
  getCardsByAccountId(accountId: string, forceRefresh = false): Observable<Card[]> {
    const cacheKey = `${CACHE_KEYS.CARDS_BY_ACCOUNT}:${accountId}`;
    return this.cache.get<Card[]>(
      cacheKey,
      () => this.http.get<Card[]>(`${this.apiUrl}/${accountId}`, { headers: this.getHeaders() }),
      { key: cacheKey, ttl: CACHE_TTL.CARDS, forceRefresh }
    );
  }

  /**
   * Request a new card
   * Note: Cache invalidation should be handled by caller
   */
  requestNewCard(payload: { cardType: string; accountId: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/card-requests`, payload);
  }

  /**
   * Toggle card freeze status
   * Invalidates card caches after update
   */
  toggleFreezeCard(cardId: string, isFrozen: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cardId}/freeze`, { isFrozen });
  }

  /**
   * Get card transactions
   * Cache TTL: 1 minute
   * Note: Card transactions are cached per card
   */
  getCardTransactions(cardId: string, forceRefresh = false): Observable<any[]> {
    const cacheKey = `${CACHE_KEYS.CARD_TRANSACTIONS}:${cardId}`;
    return this.cache.get<any[]>(
      cacheKey,
      () => this.http.get<any[]>(`${this.apiUrl}/${cardId}/transactions`, { headers: this.getHeaders() }),
      { key: cacheKey, ttl: CACHE_TTL.CARD_TRANSACTIONS, forceRefresh }
    );
  }

  /**
   * Get available credit for a card
   * Note: Not cached (real-time balance check)
   */
  getAvailableCredit(cardId: string): Observable<{ availableCredit: number }> {
    return this.http.get<{ availableCredit: number }>(`${this.apiUrl}/${cardId}/available-credit`, { headers: this.getHeaders() });
  }

  /**
   * Get credit limit for a card
   * Note: Not cached (may change after limit adjustments)
   */
  getCreditLimit(cardId: string): Observable<{ creditLimit: number }> {
    return this.http.get<{ creditLimit: number }>(`${this.apiUrl}/${cardId}/credit-limit`, { headers: this.getHeaders() });
  }

  /**
   * Update card settings
   */
  updateCardSettings(cardId: string, settings: { dailyLimit?: number }): Observable<Card> {
    return this.http.put<Card>(`${this.apiUrl}/${cardId}/settings`, settings, { headers: this.getHeaders() });
  }

  /**
   * Invalidate all card-related caches
   */
  invalidateAllCaches(): void {
    this.cache.invalidatePattern('cards');
  }

  /**
   * Invalidate caches for a specific account's cards
   */
  invalidateAccountCards(accountId: string): void {
    this.cache.invalidateKey(`${CACHE_KEYS.CARDS_BY_ACCOUNT}:${accountId}`);
  }
}
