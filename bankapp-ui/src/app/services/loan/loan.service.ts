import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Loan {
  _id: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  purpose: string;
  status: string;
  remainingAmount: number;
  createdAt: string;
}

export interface LoanOffer {
  amount: number;
  term: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface RepaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  paymentAmount: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
}

export interface RepaymentSchedule {
  schedule: RepaymentScheduleItem[];
  outstandingBalance: number;
}

@Injectable({
  providedIn: 'root',
})
export class LoanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/loans`;

  constructor() {}

  applyLoan(payload: any): Observable<Loan> {
    return this.http.post<Loan>(`${this.apiUrl}/applications`, payload);
  }

  getUserLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/applications`);
  }

  getOffers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/offers`);
  }

  getRepaymentSchedule(loanId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${loanId}/repayments`);
  }

  payLoan(id: string, amount: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/pay`, { amount });
  }
}
