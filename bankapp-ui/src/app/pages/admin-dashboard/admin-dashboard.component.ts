import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import {
  LucideAngularModule,
  Shield,
  MessageSquare,
  LogOut,
  Users,
  Wallet,
  ArrowRightLeft,
  Clock,
  Send,
  CreditCard,
  UserPlus,
  LayoutDashboard,
  FileCheck,
} from 'lucide-angular';

import { AdminService, AdminMetrics } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { SocketService } from '../../services/socket/socket.service';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { CardComponent } from '../../ui/card/card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, CardComponent, BottomNavComponent],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-slate-800"></div>

      <!-- Header -->
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="shield" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h1 class="text-lg font-bold">Admin Portal</h1>
              <p class="text-xs text-slate-400">Bank Manager</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="logout()" class="p-2 hover:bg-slate-700 rounded-xl transition-colors">
              <lucide-icon [img]="logOut" class="w-5 h-5"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <app-card padding="md">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <lucide-icon [img]="users" class="w-4 h-4 text-blue-600"></lucide-icon>
                </div>
                <span class="text-xs text-slate-500">Total Users</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">{{ metrics()?.totalUsers ?? '...' }}</p>
            </app-card>

            <app-card padding="md">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <lucide-icon [img]="wallet" class="w-4 h-4 text-emerald-600"></lucide-icon>
                </div>
                <span class="text-xs text-slate-500">Total Balance</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">
                {{ metrics()?.totalBalance ?? 0 | currency: 'USD' : 'symbol' : '1.0-0' }}
              </p>
            </app-card>

            <app-card padding="md">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <lucide-icon [img]="arrowRightLeft" class="w-4 h-4 text-purple-600"></lucide-icon>
                </div>
                <span class="text-xs text-slate-500">Transactions</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">
                {{ metrics()?.totalTransactions ?? '...' }}
              </p>
            </app-card>

            <app-card padding="md">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <lucide-icon [img]="clock" class="w-4 h-4 text-amber-600"></lucide-icon>
                </div>
                <span class="text-xs text-slate-500">Pending</span>
              </div>
              <p class="text-2xl font-bold text-slate-900">
                {{ metrics()?.pendingActions ?? '...' }}
              </p>
              <p class="text-xs text-amber-600">Requires action</p>
            </app-card>
          </div>

          <!-- Pending Actions -->
          <app-card title="Pending Actions" padding="md">
            <div class="flex items-center justify-between mb-3">
              <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"
                >{{ metrics()?.pendingActions || 0 }} items</span
              >
            </div>

            <div class="space-y-2">
              <a
                routerLink="/admin/transfer-requests"
                class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <lucide-icon [img]="send" class="w-5 h-5 text-blue-600"></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">Transfer Requests</p>
                    <p class="text-xs text-slate-500">Awaiting verification</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                    >{{ metrics()?.pendingTransfers || 0 }}</span
                  >
                </div>
              </a>

              <a
                routerLink="/admin/card-requests"
                class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <lucide-icon [img]="creditCard" class="w-5 h-5 text-purple-600"></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">Card Requests</p>
                    <p class="text-xs text-slate-500">New card applications</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                    >{{ metrics()?.pendingCards || 0 }}</span
                  >
                </div>
              </a>

              <a
                routerLink="/admin/tickets"
                class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <lucide-icon
                      [img]="messageSquare"
                      class="w-5 h-5 text-emerald-600"
                    ></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">Support Tickets</p>
                    <p class="text-xs text-slate-500">Total tickets available</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"
                    >{{ metrics()?.totalTickets || 0 }}</span
                  >
                </div>
              </a>

              <a
                routerLink="/admin/support-messages"
                class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <lucide-icon
                      [img]="userPlus"
                      class="w-5 h-5 text-amber-600"
                    ></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">Account Requests</p>
                    <p class="text-xs text-slate-500">New account applications</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full"
                    >{{ metrics()?.pendingAccountRequests || 0 }}</span
                  >
                </div>
              </a>
            </div>
          </app-card>

          <!-- Quick Actions -->
          <app-card title="Quick Actions" padding="md">
            <div class="grid grid-cols-2 gap-3">
              <a
                routerLink="/admin/create-user"
                class="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="userPlus" class="w-6 h-6 text-blue-600"></lucide-icon>
                </div>
                <span class="text-sm font-medium text-slate-700">Create User</span>
              </a>
              <a
                routerLink="/admin/create-account"
                class="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="wallet" class="w-6 h-6 text-emerald-600"></lucide-icon>
                </div>
                <span class="text-sm font-medium text-slate-700">Create Account</span>
              </a>
              <a
                routerLink="/admin/create-transaction"
                class="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="arrowRightLeft" class="w-6 h-6 text-purple-600"></lucide-icon>
                </div>
                <span class="text-sm font-medium text-slate-700">Transaction</span>
              </a>
              <a
                routerLink="/admin/users"
                class="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="users" class="w-6 h-6 text-amber-600"></lucide-icon>
                </div>
                <span class="text-sm font-medium text-slate-700">View Users</span>
              </a>
            </div>
          </app-card>

          <!-- Recent Activity -->
          <app-card title="Recent Activity" padding="md">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-slate-500">Last 24 hours</span>
            </div>

            <div class="space-y-3">
              @for (activity of metrics()?.recentActivity; track activity.timestamp) {
                <div class="flex items-start gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    [ngClass]="{
                      'bg-emerald-100 text-emerald-600': activity.type === 'user_registered',
                      'bg-blue-100 text-blue-600': activity.type === 'transfer',
                      'bg-purple-100 text-purple-600': activity.type === 'card_request',
                      'bg-slate-100 text-slate-600':
                        activity.type !== 'user_registered' &&
                        activity.type !== 'transfer' &&
                        activity.type !== 'card_request',
                    }"
                  >
                    <lucide-icon
                      [img]="
                        activity.type === 'user_registered'
                          ? userPlus
                          : activity.type === 'transfer'
                            ? send
                            : activity.type === 'card_request'
                              ? creditCard
                              : clock
                      "
                      class="w-4 h-4"
                    ></lucide-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm text-slate-900">{{ activity.message }}</p>
                    <p class="text-xs text-slate-500">{{ activity.timestamp | date: 'short' }}</p>
                  </div>
                </div>
              }
              @if (!metrics()?.recentActivity?.length) {
                <div class="text-center py-4">
                  <p class="text-sm text-slate-500">No recent activity</p>
                </div>
              }
            </div>
          </app-card>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems()" [showMore]="false"></app-bottom-nav>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private socketService = inject(SocketService);

  metrics = signal<AdminMetrics | null>(null);

  // Computed badge for the Support nav item
  openTicketCount = computed(() => this.metrics()?.pendingSupport ?? 0);

  navItems = computed<NavItem[]>(() => [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
    { label: 'Users', icon: Users, route: '/admin/users' },
    { label: 'Requests', icon: FileCheck, route: '/admin/transfer-requests', badge: this.metrics()?.pendingTransfers ?? 0 },
    { label: 'Support', icon: MessageSquare, route: '/admin/tickets', badge: this.openTicketCount() },
  ]);

  ngOnInit() {
    // Initial load - subsequent updates come via WebSocket
    this.loadMetrics();
    this.socketService.connect();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy() {
    this.socketService.off('dashboard_metrics_update');
    this.socketService.disconnect();
  }

  /**
   * Load dashboard metrics
   * Called once on init, then updated via WebSocket real-time events
   */
  loadMetrics() {
    this.adminService.getDashboardMetrics().subscribe({
      next: (data) => this.metrics.set(data),
      error: () => this.toastService.error('Failed to load dashboard metrics'),
    });
  }

  /**
   * Setup WebSocket listeners for real-time dashboard updates
   * Backend emits 'dashboard_metrics_update' when data changes
   */
  private setupRealTimeUpdates() {
    console.log('[AdminDashboard] Setting up real-time dashboard listeners on /notifications namespace...');
    
    // Listen for dashboard metrics updates via WebSocket
    // Backend invalidates cache and emits fresh data on any relevant change
    this.socketService.on('dashboard_metrics_update', (data: AdminMetrics) => {
      console.log('[AdminDashboard] Received live metrics update from server:', data);
      this.metrics.set(data);
    });
  }

  // Icons
  shield = Shield;
  messageSquare = MessageSquare;
  logOut = LogOut;
  users = Users;
  wallet = Wallet;
  arrowRightLeft = ArrowRightLeft;
  clock = Clock;
  send = Send;
  creditCard = CreditCard;
  userPlus = UserPlus;
  layoutDashboard = LayoutDashboard;
  fileCheck = FileCheck;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
