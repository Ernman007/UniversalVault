import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface NotificationResponse {
  _id: string;
  userId: string;
  type: string;
  actionUrl?: string;
  message: string;
  read: boolean;
  time: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  unreadOnly?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor() {}

  getNotifications(
    pagination?: PaginationParams,
  ): Observable<NotificationResponse[] | PaginatedResponse<NotificationResponse>> {
    let params = new HttpParams();
    if (pagination) {
      if (pagination.page) params = params.set('page', pagination.page.toString());
      if (pagination.limit) params = params.set('limit', pagination.limit.toString());
      if (pagination.sort) params = params.set('sort', pagination.sort);
      if (pagination.unreadOnly !== undefined)
        params = params.set('unreadOnly', pagination.unreadOnly.toString());
    }
    return this.http.get<NotificationResponse[] | PaginatedResponse<NotificationResponse>>(
      this.apiUrl,
      { params },
    );
  }

  getUnreadCount(): Observable<number> {
    return this.getNotifications({ page: 1, limit: 1, unreadOnly: true }).pipe(
      map((response: any) => {
        const directCount = response?.notifications?.count;
        if (typeof directCount === 'number' && Number.isFinite(directCount)) {
          return Math.max(0, directCount);
        }

        const rootCount = response?.count;
        if (typeof rootCount === 'number' && Number.isFinite(rootCount)) {
          return Math.max(0, rootCount);
        }

        const total = response?.meta?.total;
        if (typeof total === 'number' && Number.isFinite(total)) {
          return Math.max(0, total);
        }

        if (Array.isArray(response)) {
          return response.length;
        }

        if (Array.isArray(response?.data)) {
          return response.data.length;
        }

        if (Array.isArray(response?.notifications)) {
          return response.notifications.length;
        }

        return 0;
      }),
    );
  }

  getNotificationById(id: string): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}/${id}`);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-all-read`, {});
  }

  deleteNotification(id: string): Observable<any> {
    console.log('[NotificationService] Deleting notification:', id);
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(res => console.log('[NotificationService] Delete success:', res)),
      catchError(err => {
        console.error('[NotificationService] Delete error:', err);
        throw err;
      })
    );
  }

  clearAllNotifications(): Observable<any> {
    console.log('[NotificationService] Clearing all notifications');
    return this.http.delete(`${this.apiUrl}/clear-all`).pipe(
      tap(res => console.log('[NotificationService] Clear all success:', res)),
      catchError(err => {
        console.error('[NotificationService] Clear all error:', err);
        throw err;
      })
    );
  }
}
