import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';

import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

const RATE_LIMIT_TOAST_COOLDOWN_MS = 8_000;
const lastRateLimitToastAtByUrl = new Map<string, number>();

const shouldShowRateLimitToast = (url: string): boolean => {
  const now = Date.now();
  const lastAt = lastRateLimitToastAtByUrl.get(url) ?? 0;
  if (now - lastAt < RATE_LIMIT_TOAST_COOLDOWN_MS) {
    return false;
  }
  lastRateLimitToastAtByUrl.set(url, now);
  return true;
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error, retryCount) => {
        if (error instanceof HttpErrorResponse && error.status === 429 && req.method === 'GET') {
          const delayMs = retryCount * 800;
          console.warn('[HTTP] 429 retry scheduled', {
            url: req.urlWithParams,
            retryCount,
            delayMs,
          });
          return timer(delayMs);
        }
        throw error;
      },
    }),
    catchError((error: HttpErrorResponse) => {
      const router = injector.get(Router);
      const toastService = injector.get(ToastService);
      console.error('[HTTP] Request failed', {
        method: req.method,
        url: req.urlWithParams,
        status: error.status,
        message: error.message,
      });

      if (error.status === 401) {
        const authService = injector.get(AuthService);
        authService.clearAuthState();
        toastService.error('Session expired. Please log in again.');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        const authService = injector.get(AuthService);
        const role = authService.currentUser()?.role;
        toastService.error('You do not have permission to access this resource.');
        router.navigate([role === 'admin' ? '/admin/dashboard' : '/user/dashboard']);
      } else if (error.status === 429) {
        if (shouldShowRateLimitToast(req.urlWithParams)) {
          toastService.error('Too many requests. Retrying in a moment.');
        }
      } else if (error.status >= 500 || error.status === 0) {
        toastService.error('A network or server error occurred. Please try again later.');
      } else {
        const msg = error.error?.message || error.message || 'An error occurred';
        toastService.error(msg);
      }
      return throwError(() => error);
    }),
  );
};
