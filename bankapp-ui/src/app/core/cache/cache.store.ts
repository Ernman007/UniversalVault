/**
 * Cache Store - Core caching utility using RxJS shareReplay
 * 
 * Features:
 * - TTL-based automatic expiration
 * - Manual invalidation by key or pattern
 * - Memory-efficient with refCount
 * - Thread-safe for concurrent requests
 * 
 * Usage:
 * ```typescript
 * const cache = new CacheStore<Account[]>();
 * const accounts$ = cache.get('accounts', () => http.get('/accounts'), { ttl: 120000 });
 * ```
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, of, timer } from 'rxjs';
import { shareReplay, takeUntil, tap, finalize } from 'rxjs/operators';
import { CacheEntry, CacheConfig, Fetcher, CacheStats } from './cache.types';

@Injectable({
  providedIn: 'root',
})
export class CacheStore implements OnDestroy {
  /** In-memory cache storage */
  private cache = new Map<string, CacheEntry<unknown>>();

  /** Active observables with shareReplay */
  private observables = new Map<string, Observable<unknown>>();

  /** Subject for cleanup on destroy */
  private destroy$ = new Subject<void>();

  /** Statistics tracking */
  private stats = { hits: 0, misses: 0 };

  /** Default TTL: 60 seconds */
  private readonly DEFAULT_TTL = 60_000;

  /**
   * Get cached data or fetch from source
   * 
   * @param key - Unique cache key
   * @param fetcher - Function that returns the source Observable
   * @param config - Cache configuration
   * @returns Observable of the cached/fetched data
   */
  get<T>(key: string, fetcher: Fetcher<T>, config: CacheConfig): Observable<T> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false } = config;

    // Force refresh: invalidate and refetch
    if (forceRefresh) {
      this.invalidateKey(key);
    }

    // Check memory cache first
    const cachedEntry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cachedEntry && !this.isExpired(cachedEntry)) {
      this.stats.hits++;
      return of(cachedEntry.data);
    }

    // Check for in-flight request (deduplication)
    const existing$ = this.observables.get(key) as Observable<T> | undefined;
    if (existing$) {
      this.stats.hits++;
      return existing$;
    }

    // Cache miss: fetch new data
    this.stats.misses++;

    const source$ = fetcher().pipe(
      tap((data) => {
        // Store in memory cache
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this.destroy$),
      finalize(() => {
        // Clean up observable reference when all subscribers unsubscribe
        // But keep the memory cache entry
        this.observables.delete(key);
      }),
    );

    this.observables.set(key, source$);
    return source$;
  }

  /**
   * Get cached data synchronously (returns null if not cached or expired)
   */
  getSync<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      return entry.data;
    }
    return null;
  }

  /**
   * Set cache value directly (for manual population)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.DEFAULT_TTL,
    });
  }

  /**
   * Invalidate a specific cache key
   */
  invalidateKey(key: string): void {
    this.cache.delete(key);
    this.observables.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern (prefix-based)
   * Example: invalidatePattern('accounts') matches 'accounts', 'accounts:123', etc.
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.observables.delete(key);
    });
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
    this.observables.clear();
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!entry && !this.isExpired(entry);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cache.clear();
    this.observables.clear();
  }
}
