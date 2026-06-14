import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Check, X } from 'lucide-angular';

import { AdminService } from '../../services/admin/admin.service';
import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-admin-card-requests',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center gap-4 mb-3">
            <a
              routerLink="/admin/dashboard"
              class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors"
            >
              <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            </a>
            <h1 class="text-lg font-bold">Card Requests</h1>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-4">
          @if (isLoading()) {
            <p class="text-center text-slate-500 py-10">Loading...</p>
          } @else if (requests().length === 0) {
            <p class="text-center text-slate-500 py-10 bg-white rounded-xl">
              No pending card requests.
            </p>
          } @else {
            @for (req of requests(); track req._id) {
              <div class="bg-white rounded-xl shadow-sm p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-sm text-slate-500">Request ID</p>
                    <p class="font-bold text-slate-900">#{{ req._id.substring(0, 8) }}</p>
                  </div>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
                    >Pending</span
                  >
                </div>
                <div class="mb-4 space-y-1">
                  <p class="text-sm">
                    <span class="text-slate-500">From Account:</span>
                    {{ req.account?.accountNumber || 'Unknown' }}
                  </p>
                  <p class="text-sm">
                    <span class="text-slate-500">Card Type:</span>
                    <span class="capitalize">{{ req.cardType }}</span>
                  </p>
                  <p class="text-sm">
                    <span class="text-slate-500">User:</span> {{ req.user?.name }} ({{
                      req.user?.email
                    }})
                  </p>
                  <p class="text-sm">
                    <span class="text-slate-500">Date:</span> {{ req.createdAt | date: 'short' }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="approve(req._id)"
                    class="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <lucide-icon [img]="checkIcon" class="w-4 h-4"></lucide-icon>
                    Approve
                  </button>
                  <button
                    (click)="reject(req._id)"
                    class="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <lucide-icon [img]="xIcon" class="w-4 h-4"></lucide-icon>
                    Reject
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminCardRequestsComponent implements OnInit {
  arrowLeft = ArrowLeft;
  checkIcon = Check;
  xIcon = X;

  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  requests = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.isLoading.set(true);
    this.adminService.getCardRequests().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  approve(id: string) {
    if (!confirm('Approve card issuance?')) return;
    this.adminService.approveCardRequest(id).subscribe({
      next: () => {
        this.toast.success('Approved');
        this.requests.update((r) => r.filter((x) => x._id !== id));
      },
      error: (e) => this.toast.error(e.error?.message || 'Error approving card'),
    });
  }

  reject(id: string) {
    if (!confirm('Reject card issuance?')) return;
    this.adminService.rejectCardRequest(id).subscribe({
      next: () => {
        this.toast.success('Rejected');
        this.requests.update((r) => r.filter((x) => x._id !== id));
      },
      error: (e) => this.toast.error(e.error?.message || 'Error rejecting card'),
    });
  }
}
