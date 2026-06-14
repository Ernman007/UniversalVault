/**
 * Core Cache Types
 * Type definitions for the caching system
 */

import { Observable } from 'rxjs';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Configuration for cached observable
 */
export interface CacheConfig {
  /** Time-to-live in milliseconds. Default: 60000 (60s) */
  ttl?: number;
  /** Cache key for identification and invalidation */
  key: string;
  /** Force refresh, bypassing cache */
  forceRefresh?: boolean;
}

/**
 * Function type for fetching data when cache misses
 */
export type Fetcher<T> = () => Observable<T>;

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: string[];
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  key: string;
  pattern?: string; // For wildcard invalidation
}
