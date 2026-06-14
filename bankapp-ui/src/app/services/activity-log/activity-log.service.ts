import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ActivityLogEntry {
  _id: string;
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/activity-logs`;

  getRecentActivities(): Observable<ActivityLogEntry[]> {
    return this.http.get<ActivityLogEntry[]>(this.apiUrl);
  }
}
