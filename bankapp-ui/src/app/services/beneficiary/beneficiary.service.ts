import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CacheStore } from '../../core/cache';

export interface Beneficiary {
  _id: string;
  nickname: string;
  accountNumber: string;
  bankName?: string;
  swiftCode?: string;
  accountHolderName?: string;
}

/** Cache keys for BeneficiaryService */
const CACHE_KEYS = {
  BENEFICIARIES: 'beneficiaries:user',
} as const;

/** Cache TTL: 2 minutes */
const CACHE_TTL = {
  BENEFICIARIES: 120_000,
} as const;

@Injectable({ providedIn: 'root' })
export class BeneficiaryService {
  private http = inject(HttpClient);
  private cache = inject(CacheStore);
  private apiUrl = `${environment.apiUrl}/beneficiaries`;

  constructor() {}

  /**
   * Get user's beneficiaries with caching
   * Cache TTL: 2 minutes
   */
  getBeneficiaries(forceRefresh = false): Observable<{ success: boolean; data: Beneficiary[] }> {
    return this.cache.get<{ success: boolean; data: Beneficiary[] }>(
      CACHE_KEYS.BENEFICIARIES,
      () => this.http.get<{ success: boolean; data: Beneficiary[] }>(this.apiUrl),
      { key: CACHE_KEYS.BENEFICIARIES, ttl: CACHE_TTL.BENEFICIARIES, forceRefresh }
    );
  }

  /**
   * Create a new beneficiary
   * Invalidates cache after creation
   */
  createBeneficiary(
    payload: Partial<Beneficiary>,
  ): Observable<{ success: boolean; data: Beneficiary }> {
    return this.http.post<{ success: boolean; data: Beneficiary }>(this.apiUrl, payload);
  }

  /**
   * Update a beneficiary
   */
  updateBeneficiary(
    id: string,
    payload: Partial<Beneficiary>,
  ): Observable<{ success: boolean; data: Beneficiary }> {
    return this.http.put<{ success: boolean; data: Beneficiary }>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Delete a beneficiary
   */
  deleteBeneficiary(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Invalidate beneficiary cache
   * Call after create/update/delete operations
   */
  invalidateCache(): void {
    this.cache.invalidateKey(CACHE_KEYS.BENEFICIARIES);
  }
}
