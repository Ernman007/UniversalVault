import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PinStatus {
  hasPin: boolean;
  isLocked: boolean;
  failedAttempts: number;
  remainingLockMinutes?: number;
}

export interface PinVerifyResponse {
  success: boolean;
  message: string;
  pinSessionToken?: string;
  pinNotSet?: boolean;
  locked?: boolean;
  remainingMinutes?: number;
  attemptsRemaining?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CardPinService {
  private apiUrl = `${environment.apiUrl}/auth/card-pin`;
  private _http = inject(HttpClient);

  // PIN session token signal
  private _pinSessionToken = signal<string | null>(this.getStoredPinToken());
  
  // Computed signals
  pinSessionToken = this._pinSessionToken.asReadonly();
  hasPinSession = computed(() => !!this._pinSessionToken());

  /**
   * Get PIN status for current user
   */
  getPinStatus(): Observable<PinStatus> {
    return this._http.get<PinStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Setup card PIN for the first time
   */
  setupCardPin(pin: string, confirmPin: string): Observable<PinVerifyResponse> {
    return this._http
      .post<PinVerifyResponse>(`${this.apiUrl}/setup`, { pin, confirmPin })
      .pipe(
        tap((response) => {
          if (response.success && response.pinSessionToken) {
            this.setPinSessionToken(response.pinSessionToken);
          }
        })
      );
  }

  /**
   * Verify card PIN and get session token
   */
  verifyCardPin(pin: string): Observable<PinVerifyResponse> {
    return this._http
      .post<PinVerifyResponse>(`${this.apiUrl}/verify`, { pin })
      .pipe(
        tap((response) => {
          if (response.success && response.pinSessionToken) {
            this.setPinSessionToken(response.pinSessionToken);
          }
        })
      );
  }

  /**
   * Change existing card PIN
   */
  changeCardPin(
    currentPin: string,
    newPin: string,
    confirmNewPin: string
  ): Observable<PinVerifyResponse> {
    return this._http
      .put<PinVerifyResponse>(`${this.apiUrl}/change`, {
        currentPin,
        newPin,
        confirmNewPin,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.pinSessionToken) {
            this.setPinSessionToken(response.pinSessionToken);
          }
        })
      );
  }

  /**
   * Request PIN reset via email
   */
  requestPinReset(): Observable<{ success: boolean; message: string; resetToken?: string; resetUrl?: string }> {
    return this._http.post<{ success: boolean; message: string; resetToken?: string; resetUrl?: string }>(
      `${this.apiUrl}/reset-request`,
      {}
    );
  }

  /**
   * Reset PIN with token from email
   */
  resetCardPin(
    resetToken: string,
    newPin: string,
    confirmNewPin: string
  ): Observable<PinVerifyResponse> {
    return this._http.post<PinVerifyResponse>(`${this.apiUrl}/reset`, {
      resetToken,
      newPin,
      confirmNewPin,
    });
  }

  /**
   * Check if current PIN session is still valid
   */
  checkPinSessionStatus(): Observable<{ valid: boolean; expiresInSeconds?: number; expiresAt?: string }> {
    const token = this._pinSessionToken();
    if (!token) {
      return of({ valid: false });
    }

    return this._http.get<{ valid: boolean; expiresInSeconds?: number; expiresAt?: string }>(
      `${this.apiUrl}/session-status`,
      {
        headers: { 'X-Card-Pin-Token': token }
      }
    );
  }

  /**
   * Store PIN session token
   */
  private setPinSessionToken(token: string): void {
    this._pinSessionToken.set(token);
    // Store in sessionStorage (cleared on tab close for security)
    sessionStorage.setItem('cardPinToken', token);
  }

  /**
   * Get stored PIN token from session storage
   */
  private getStoredPinToken(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('cardPinToken');
  }

  /**
   * Clear PIN session (logout or expiry)
   */
  clearPinSession(): void {
    this._pinSessionToken.set(null);
    sessionStorage.removeItem('cardPinToken');
  }

  /**
   * Get authorization headers including PIN token if available
   */
  getPinTokenHeaders(): Record<string, string> {
    const token = this._pinSessionToken();
    if (token) {
      return { 'X-Card-Pin-Token': token };
    }
    return {};
  }
}
