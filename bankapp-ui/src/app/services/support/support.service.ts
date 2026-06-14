import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface SupportTicket {
  _id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedTicketsResponse {
  tickets: SupportTicket[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/support`;

  createTicket(payload: {
    subject: string;
    description: string;
    category: string;
  }): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.apiUrl}/tickets`, payload);
  }

  getUserTickets(pagination?: PaginationParams): Observable<PaginatedTicketsResponse> {
    let params = new HttpParams();
    if (pagination) {
      if (pagination.page) params = params.set('page', pagination.page.toString());
      if (pagination.limit) params = params.set('limit', pagination.limit.toString());
    }
    return this.http.get<PaginatedTicketsResponse>(`${this.apiUrl}/tickets`, { params });
  }

  getTicketDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/${id}`);
  }

  replyToTicket(ticketId: string, message: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/messages`, { ticketId, body: message });
  }

  submitOpenAccountRequest(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/guest`, formData);
  }
}
