import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private readonly authTokenKey = 'auth_token';
  private readonly authUserKey = 'auth_user';
  private readonly authProfileFetchedAtKey = 'auth_profile_fetched_at';
  private readonly profileFreshWindowMs = 60_000;
  private profileRequestInFlight: Observable<User> | null = null;
  private profileRequestCounter = 0;

  // State using signals
  currentUser = signal<User | null>(this.readStoredUser());
  token = signal<string | null>(localStorage.getItem(this.authTokenKey));
  isAuthenticated = signal<boolean>(!!this.token());

  constructor() {}

  register(data: any): Observable<AuthResponse> {
    return this._http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
        this.setAuthData(response.user, response.token);
      }),
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this._http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.setAuthData(response.user, response.token);
      }),
    );
  }

  loadProfile(forceRefresh = false): Observable<User | null> {
    const token = this.token();
    const cachedUser = this.currentUser();
    const fetchedAtRaw = localStorage.getItem(this.authProfileFetchedAtKey);
    const fetchedAt = fetchedAtRaw ? Number(fetchedAtRaw) : 0;
    const isFresh = Number.isFinite(fetchedAt) && Date.now() - fetchedAt < this.profileFreshWindowMs;

    if (!token) {
      console.warn('[AuthService] loadProfile skipped: no token');
      return of(null);
    }

    if (!forceRefresh && cachedUser && isFresh) {
      console.log('[AuthService] loadProfile served from local cache', {
        userId: cachedUser._id,
        ageMs: Date.now() - fetchedAt,
      });
      return of(cachedUser);
    }

    if (!forceRefresh && this.profileRequestInFlight) {
      console.log('[AuthService] loadProfile reusing in-flight request');
      return this.profileRequestInFlight;
    }

    this.profileRequestCounter += 1;
    const requestId = this.profileRequestCounter;
    const startedAt = Date.now();

    console.log('[AuthService] loadProfile requesting /auth/me', {
      requestId,
      forceRefresh,
      hasCachedUser: !!cachedUser,
      cachedAgeMs: fetchedAt ? Date.now() - fetchedAt : null,
    });

    this.profileRequestInFlight = this._http.get<User | { user?: User }>(`${this.apiUrl}/me`).pipe(
      map((payload) => {
        const normalizedUser =
          payload && typeof payload === 'object' && 'user' in payload
            ? (payload as { user?: User }).user
            : (payload as User);
        if (!normalizedUser) {
          throw new Error('Invalid profile payload');
        }
        return normalizedUser;
      }),
      tap((user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        localStorage.setItem(this.authUserKey, JSON.stringify(user));
        localStorage.setItem(this.authProfileFetchedAtKey, Date.now().toString());
        console.log('[AuthService] loadProfile success', {
          requestId,
          userId: user._id,
          elapsedMs: Date.now() - startedAt,
        });
      }),
      finalize(() => {
        console.log('[AuthService] loadProfile finalized', {
          requestId,
          elapsedMs: Date.now() - startedAt,
        });
        this.profileRequestInFlight = null;
      }),
      shareReplay(1),
    );

    return this.profileRequestInFlight;
  }

  clearAuthState(): void {
    console.warn('[AuthService] clearAuthState called');
    this.currentUser.set(null);
    this.token.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem(this.authTokenKey);
    localStorage.removeItem(this.authUserKey);
    localStorage.removeItem(this.authProfileFetchedAtKey);
    this._router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this._http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this._http.put<{ message: string }>(`${this.apiUrl}/reset-password/${token}`, {
      password,
    });
  }

  logout(): void {
    this._http.get(`${this.apiUrl}/logout`).subscribe({
      next: () => this.clearAuthState(),
      error: () => this.clearAuthState(),
    });
  }

  private setAuthData(user: User, token: string): void {
    this.currentUser.set(user);
    this.token.set(token);
    this.isAuthenticated.set(true);
    localStorage.setItem(this.authTokenKey, token);
    localStorage.setItem(this.authUserKey, JSON.stringify(user));
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(this.authUserKey);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as User;
      if (parsed && parsed._id && parsed.email) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}
