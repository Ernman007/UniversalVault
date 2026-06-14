import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppConfigService } from '../app-config/app-config.service';

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  description: string;
  type: 'internal' | 'external';
  recipientName?: string;
  bankName?: string;
  accountNumber?: string;
  idempotencyKey?: string;
}

export interface VerifyTransferRequestPayload {
  requestId: string;
  code: string;
}

export interface BankDirectoryEntry {
  code: string;
  name: string;
}

export interface TransferValidationPayload {
  accountNumber: string;
  bankCode?: string;
}

export interface TransferValidationResponse {
  valid: boolean;
  accountName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransferService {
  private apiUrl = `${environment.apiUrl}/transactions`;
  private transferRequestsUrl = `${environment.apiUrl}/transfer-requests`;
  private banksUrl = `${environment.apiUrl}/v1/banks`;
  private transferValidationUrl = `${environment.apiUrl}/v1/transfer/validate`;
  private http = inject(HttpClient);
  private banksApiAvailable = environment.features.transferBankDirectoryEnabled;
  private transferValidationApiAvailable = environment.features.transferRecipientValidationEnabled;
  private appConfig = inject(AppConfigService);

  private get fallbackBanks(): BankDirectoryEntry[] {
    return [
      { code: this.appConfig.bankCode(), name: this.appConfig.bankName() },
      { code: 'BOFAUS3N', name: 'Bank of America (US)' },
      { code: 'CHASUS33', name: 'JPMorgan Chase (US)' },
      { code: 'CITIUS33', name: 'Citibank (US)' },
      { code: 'DEUTDEFF', name: 'Deutsche Bank (DE)' },
      { code: 'BNPAFRPP', name: 'BNP Paribas (FR)' },
      { code: 'BARCGB22', name: 'Barclays (UK)' },
      { code: 'HSBCGB2L', name: 'HSBC (UK)' },
      { code: 'NWBKGB2L', name: 'NatWest (UK)' },
      { code: 'UBSWCHZH80A', name: 'UBS (CH)' },
      { code: 'SMBCJPJT', name: 'Sumitomo Mitsui Banking Corporation (JP)' },
    ];
  }

  constructor() {}

  createTransfer(transferData: TransferRequest): Observable<any> {
    const payload = {
      accountId: transferData.fromAccount,
      receiverIdentifier: transferData.toAccount,
      type: 'transfer',
      amount: transferData.amount,
      description: transferData.description || '',
    };
    return this.http.post(this.apiUrl, payload);
  }

  requestTransfer(transferData: TransferRequest): Observable<any> {
    const idempotencyKey =
      transferData.idempotencyKey ||
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    const payload = {
      fromAccountId: transferData.fromAccount,
      toAccount: transferData.toAccount,
      amount: transferData.amount,
      description: transferData.description || '',
      idempotencyKey,
    };
    return this.http.post(this.transferRequestsUrl, payload);
  }

  verifyTransferRequest(payload: VerifyTransferRequestPayload): Observable<any> {
    return this.http.post(`${this.transferRequestsUrl}/verify`, payload);
  }

  getTransferRequestStatus(requestId: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${this.transferRequestsUrl}/${requestId}`,
    );
  }

  getTransactionByRequestId(requestId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-request/${requestId}`);
  }

  getBanks(): Observable<BankDirectoryEntry[]> {
    if (!this.banksApiAvailable) {
      return of(this.fallbackBanks);
    }
    return this.http.get<BankDirectoryEntry[]>(this.banksUrl).pipe(
      catchError(() => {
        this.banksApiAvailable = false;
        return of(this.fallbackBanks);
      }),
    );
  }

  validateTransferRecipient(
    payload: TransferValidationPayload,
  ): Observable<TransferValidationResponse> {
    if (!this.transferValidationApiAvailable) {
      return of({ valid: false });
    }
    return this.http.post<TransferValidationResponse>(this.transferValidationUrl, payload).pipe(
      catchError(() => {
        this.transferValidationApiAvailable = false;
        return of({ valid: false });
      }),
      switchMap((response) => of(response ?? { valid: false })),
    );
  }
}
