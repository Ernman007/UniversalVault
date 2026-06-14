import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PendingAccountService {
  pendingAccountData = signal<any>(null);

  setPendingData(data: any) {
    this.pendingAccountData.set(data);
  }

  getPendingData() {
    return this.pendingAccountData();
  }

  clearPendingData() {
    this.pendingAccountData.set(null);
  }
}
