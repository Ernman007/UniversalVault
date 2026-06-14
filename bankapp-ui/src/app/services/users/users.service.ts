import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface UserResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl);
  }

  createUser(payload: any): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.apiUrl, payload);
  }

  updateUser(id: string, payload: any): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/${id}`, payload);
  }

  getUserById(id: string): Observable<UserResponse> {
    console.log('[USERS-SERVICE] Fetching user by ID:', id, 'URL:', `${this.apiUrl}/${id}`);
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
