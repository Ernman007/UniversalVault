/**
 * Core Cache Module
 * 
 * Provides a centralized caching system for HTTP responses and other data.
 * 
 * Usage:
 * ```typescript
 * import { CacheStore, CacheConfig } from '@app/core/cache';
 * 
 * @Injectable({ providedIn: 'root' })
 * export class AccountService {
 *   private cache = inject(CacheStore);
 *   
 *   getAccounts(): Observable<Account[]> {
 *     return this.cache.get('accounts', () => this.http.get<Account[]>('/accounts'), {
 *       key: 'accounts',
 *       ttl: 120000, // 2 minutes
 *     });
 *   }
 * }
 * ```
 */

export { CacheStore } from './cache.store';
export type {
  CacheEntry,
  CacheConfig,
  Fetcher,
  CacheStats,
  CacheInvalidationEvent,
} from './cache.types';
