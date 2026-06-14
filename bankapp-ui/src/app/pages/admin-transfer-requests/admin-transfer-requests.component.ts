import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Check,
  X,
  LayoutDashboard,
  Users,
  FileCheck,
  MessageSquare,
} from 'lucide-angular';

import { AdminService } from '../../services/admin/admin.service';
import { ToastService } from '../../services/notification/toast.service';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { SocketService } from '../../services/socket/socket.service';

@Component({
  selector: 'app-admin-transfer-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, BottomNavComponent],
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
            <h1 class="text-lg font-bold">Transfer Requests</h1>
          </div>
        </div>
      </div>

      <!-- Rejection Reason Modal -->
      @if (showRejectModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 class="text-lg font-bold">Reject Transfer Request</h3>
              <button
                (click)="closeRejectModal()"
                class="p-1 hover:bg-red-700 rounded-lg transition-colors"
              >
                <lucide-icon [img]="xIcon" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
            <div class="p-6">
              <p class="text-sm text-slate-600 mb-4">
                Please provide a reason for rejecting this transfer request. This will be visible to
                the user.
              </p>
              <textarea
                [(ngModel)]="rejectionReason"
                rows="4"
                placeholder="Enter reason for rejection..."
                class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm resize-none text-slate-900 placeholder-slate-400"
              ></textarea>
            </div>
            <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                (click)="closeRejectModal()"
                class="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                (click)="confirmReject()"
                [disabled]="!rejectionReason.trim() || rejecting()"
                class="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                @if (rejecting()) {
                  <lucide-icon [img]="loader" class="w-4 h-4 animate-spin"></lucide-icon>
                }
                <span>Reject Request</span>
              </button>
            </div>
          </div>
        </div>
      }

      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-4">
          @if (isLoading()) {
            <p class="text-center text-slate-500 py-10">Loading...</p>
          } @else if (requests().length === 0) {
            <p class="text-center text-slate-500 py-10 bg-white rounded-xl">
              No pending transfer requests.
            </p>
          } @else {
            @for (req of requests(); track req._id) {
              <div class="bg-white rounded-xl shadow-sm p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="text-sm text-slate-500">Amount</p>
                    <p class="text-lg font-bold text-slate-900">\${{ req.amount }}</p>
                  </div>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
                    >Pending</span
                  >
                </div>
                <div class="mb-4 space-y-1">
                  <p class="text-sm">
                    <span class="text-slate-500">From Account:</span>
                    {{ req.fromAccount?.accountNumber || 'Unknown' }}
                  </p>
                  <p class="text-sm">
                    <span class="text-slate-500">To Details:</span>
                    {{ req.toAccount || req.toAccountId }}
                  </p>
                  <p class="text-sm">
                    <span class="text-slate-500">Bank:</span> {{ req.bankName || 'Local Bank' }}
                  </p>
                  @if (req.reason) {
                    <p class="text-sm">
                      <span class="text-slate-500">Reason:</span> {{ req.reason }}
                    </p>
                  }
                  <p class="text-sm">
                    <span class="text-slate-500">Date:</span> {{ req.createdAt | date: 'short' }}
                  </p>
                </div>
                <!-- Actions -->
                <div class="flex gap-2">
                  <button
                    (click)="approve(req._id)"
                    class="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <lucide-icon [img]="checkIcon" class="w-4 h-4"></lucide-icon>
                    Approve
                  </button>
                  <button
                    (click)="openRejectModal(req._id)"
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
      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems()" [showMore]="false"></app-bottom-nav>
    </div>
  `,
})
export class AdminTransferRequestsComponent implements OnInit, OnDestroy {
  arrowLeft = ArrowLeft;
  checkIcon = Check;
  xIcon = X;
  loader = Check;

  metrics = signal<any | null>(null);

  navItems = computed<NavItem[]>(() => [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
    { label: 'Users', icon: Users, route: '/admin/users' },
    { label: 'Requests',
      icon: FileCheck,
      route: '/admin/transfer-requests',
      badge: this.metrics()?.pendingTransfers || 0
    },
    { label: 'Support',
      icon: MessageSquare,
      route: '/admin/support-messages',
      badge: this.metrics()?.pendingSupport || 0
    },
  ]);

  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private socketService = inject(SocketService);
  private metricsInterval: any;

  requests = signal<any[]>([]);
  isLoading = signal(true);
  showRejectModal = signal(false);
  rejecting = signal(false);
  rejectionReason = '';
  selectedRequestId = '';

  ngOnInit() {
    this.loadRequests();
    this.loadMetrics();
    this.socketService.connect();
    this.setupRealTimeUpdates();
    // Refresh metrics periodically
    this.metricsInterval = setInterval(() => this.loadMetrics(), 15000);
  }

  ngOnDestroy() {
    this.socketService.off('dashboard_metrics_update');
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  loadMetrics() {
    this.adminService.getDashboardMetrics().subscribe({
      next: (data) => this.metrics.set(data),
      error: () => this.toast.error('Failed to load dashboard metrics'),
    });
  }

  private setupRealTimeUpdates() {
    this.socketService.on('dashboard_metrics_update', (data: any) => {
      this.metrics.set(data);
    });
  }

  loadRequests() {
    this.isLoading.set(true);
    this.adminService.getTransferRequests().subscribe({
      next: (data) => {
        const pending = data.filter((d) => d.status === 'pending_admin');
        this.requests.set(pending);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  approve(id: string) {
    if (!confirm('Approve transfer?')) return;
    this.adminService.approveTransfer(id).subscribe({
      next: () => {
        this.toast.success('Transfer approved successfully');
        this.requests.update((r) => r.filter((x) => x._id !== id));
      },
      error: (e) => this.toast.error(e.error?.message || 'Error approving transfer'),
    });
  }

  openRejectModal(id: string) {
    this.selectedRequestId = id;
    this.rejectionReason = '';
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.selectedRequestId = '';
    this.rejectionReason = '';
  }

  confirmReject() {
    if (!this.rejectionReason.trim()) return;

    this.rejecting.set(true);
    this.adminService.rejectTransfer(this.selectedRequestId, this.rejectionReason).subscribe({
      next: () => {
        this.toast.success('Transfer rejected');
        this.requests.update((r) => r.filter((x) => x._id !== this.selectedRequestId));
        this.closeRejectModal();
        this.rejecting.set(false);
      },
      error: (e) => {
        this.toast.error(e.error?.message || 'Error rejecting transfer');
        this.rejecting.set(false);
      },
    });
  }
}
