import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

interface AppConfig {
  bankName: string;
  bankCode: string;
}

/**
 * Loads the app name and bank code from the backend at startup.
 * The backend reads these from its BANK_NAME / BANK_CODE environment variables,
 * so changing the name in the server .env file is all that is required to rebrand.
 *
 * The environment.ts values are used as an immediate fallback while the request
 * is in flight or if the backend is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http = inject(HttpClient);

  private readonly _bankName = signal(environment.bankName);
  private readonly _bankCode = signal(environment.bankCode);

  /** Reactive bank name — reflects the value set in the server .env BANK_NAME */
  readonly bankName = this._bankName.asReadonly();
  /** Reactive bank code — reflects the value set in the server .env BANK_CODE */
  readonly bankCode = this._bankCode.asReadonly();

  load() {
    return this.http.get<AppConfig>(`${environment.apiUrl}/config`).pipe(
      tap((config) => {
        if (config?.bankName) this._bankName.set(config.bankName);
        if (config?.bankCode) this._bankCode.set(config.bankCode);
      }),
      catchError(() => of(null)),
    );
  }
}
