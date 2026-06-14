import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface AdminMetrics {
  totalUsers: number;
  totalBalance: number;
  totalTransactions: number;
  totalTickets: number;
  pendingActions: number;
  pendingTransfers: number;
  pendingCards: number;
  pendingSupport: number;
  pendingAccountRequests: number;
  recentActivity: {
    type: string;
    message: string;
    timestamp: Date;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;
  private _http = inject(HttpClient);

  getDashboardMetrics(): Observable<AdminMetrics> {
    return this._http.get<AdminMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  getTransferRequests(): Observable<any[]> {
    return this._http.get<any[]>(`${environment.apiUrl}/transfer-requests`);
  }

  approveTransfer(id: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/transfer-requests/${id}/manage`, {
      status: 'approved',
    });
  }

  rejectTransfer(id: string, reason?: string): Observable<any> {
    const body: any = { status: 'rejected' };
    if (reason) {
      body.reason = reason;
    }
    return this._http.put<any>(`${environment.apiUrl}/transfer-requests/${id}/manage`, body);
  }

  getCardRequests(): Observable<any[]> {
    return this._http.get<any[]>(`${environment.apiUrl}/card-requests/pending`);
  }

  approveCardRequest(id: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/card-requests/${id}`, { status: 'approved' });
  }

  rejectCardRequest(id: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/card-requests/${id}`, { status: 'rejected' });
  }

  getSupportTickets(): Observable<any[]> {
    return this._http.get<any>(`${environment.apiUrl}/support/tickets`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (!res || typeof res !== 'object') return [];
        return res.tickets || res.items || res.data?.tickets || res.data || [];
      }),
    );
  }

  getSupportMessages(): Observable<any[]> {
    return this._http.get<any[]>(`${environment.apiUrl}/support`);
  }

  getTicketMessages(id: string): Observable<any> {
    return this._http.get<any>(`${environment.apiUrl}/support/tickets/${id}`);
  }

  replyToTicket(ticketId: string, message: string): Observable<any> {
    return this._http.post<any>(`${environment.apiUrl}/support/messages`, {
      ticketId,
      body: message,
    });
  }

  replyToSupportMessage(id: string, message: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/support/${id}`, {
      status: 'in-progress',
      adminReply: message,
    });
  }

  resolveMessage(id: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/support/${id}`, { status: 'closed' });
  }

  rejectMessage(id: string, reason?: string): Observable<any> {
    const body: any = { status: 'rejected' };
    if (reason) {
      body.rejectionReason = reason;
    }
    return this._http.put<any>(`${environment.apiUrl}/support/${id}`, body);
  }

  setAccountRequestStatus(id: string, status: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/support/${id}`, { status });
  }

  createCardTransaction(data: {
    cardId: string;
    accountId: string;
    amount: number;
    merchantDetails: string;
    transactionType: string;
    date?: string;
  }): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/cards/card-transactions`, data);
  }

  resolveTicket(id: string): Observable<any> {
    return this._http.put<any>(`${environment.apiUrl}/support/tickets/${id}`, {
      status: 'resolved',
    });
  }

  deleteTicket(id: string): Observable<any> {
    return this._http.delete<any>(`${environment.apiUrl}/support/tickets/${id}`);
  }

  createUserWithAccount(userData: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    accountType: string;
    initialDeposit?: number;
  }): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/users/user-account`, userData);
  }
}
