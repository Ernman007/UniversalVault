import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  keyframes,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Bell, Trash2, CheckCircle2 } from 'lucide-angular';

import {
  NotificationService,
  NotificationResponse,
} from '../../services/notification/notification.service';
import { ToastService } from '../../services/notification/toast.service';
import { SocketService, AppNotification } from '../../services/socket/socket.service';

@Component({
  selector: 'app-user-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(15px)' }),
            stagger(
              '50ms',
              animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ),
          ],
          { optional: true },
        ),
        query(
          ':leave',
          [
            stagger(
              '30ms',
              animate(
                '250ms ease-in',
                style({
                  opacity: 0,
                  transform: 'translateX(100%) scale(0.8)',
                  height: 0,
                  margin: 0,
                  padding: 0,
                }),
              ),
            ),
          ],
          { optional: true },
        ),
      ]),
    ]),
    trigger('flyAway', [
      transition(':leave', [
        animate(
          '400ms ease-in',
          keyframes([
            style({ opacity: 1, transform: 'translateX(0) scale(1)', offset: 0 }),
            style({ opacity: 0.8, transform: 'translateX(30px) scale(0.95)', offset: 0.3 }),
            style({ opacity: 0, transform: 'translateX(150px) scale(0.5)', offset: 1 }),
          ]),
        ),
      ]),
    ]),
  ],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-4">
              <a
                routerLink="/user/dashboard"
                class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors"
              >
                <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
              </a>
              <h1 class="text-lg font-bold">Notifications</h1>
            </div>
            <div class="flex items-center gap-3">
              @if (realtimeNotifications.length > 0) {
                <button
                  (click)="markAllAsRead()"
                  class="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mark all read
                </button>
                <button
                  (click)="confirmClearAll()"
                  class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear all"
                >
                  <lucide-icon [img]="trash" class="w-4 h-4"></lucide-icon>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-3">
          @if (isLoading()) {
            <p class="text-center text-slate-500 py-10">Loading...</p>
          } @else if (realtimeNotifications.length === 0) {
            <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
              <div
                class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <lucide-icon [img]="bell" class="w-8 h-8 text-slate-300"></lucide-icon>
              </div>
              <h3 class="font-bold text-slate-900 mb-1">No notifications</h3>
              <p class="text-slate-500 text-sm">You're all caught up!</p>
            </div>
          } @else {
            <div [@listAnimation]="realtimeNotifications.length">
              @for (notif of realtimeNotifications; track notif._id) {
                <div
                  [@flyAway]
                  class="bg-white rounded-xl p-4 flex gap-3 transition-all relative overflow-hidden group touch-pan-x"
                  [ngClass]="
                    notif.read
                      ? 'opacity-70 border border-slate-100'
                      : 'shadow-sm border-l-4 border-l-blue-500'
                  "
                  (touchstart)="onTouchStart($event, notif._id)"
                  (touchmove)="onTouchMove($event)"
                  (touchend)="onTouchEnd(notif._id)"
                  [style.transform]="
                    activeSwipeId === notif._id ? 'translateX(' + swipeOffset + 'px)' : 'none'
                  "
                >
                  <!-- Icon based on type -->
                  <div
                    class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    [ngClass]="{
                      'bg-blue-100 text-blue-600': notif.type === 'info',
                      'bg-emerald-100 text-emerald-600': notif.type === 'success',
                      'bg-amber-100 text-amber-600': notif.type === 'warning',
                      'bg-red-100 text-red-600': notif.type === 'error',
                    }"
                  >
                    <lucide-icon [img]="bell" class="w-5 h-5"></lucide-icon>
                  </div>

                  <div
                    class="flex-1 min-w-0"
                    (click)="!notif.read ? markAsRead(notif._id) : null"
                    [ngClass]="{ 'cursor-pointer': !notif.read }"
                  >
                    <p class="text-sm font-medium text-slate-900 mb-1 leading-snug">
                      {{ notif.message }}
                    </p>
                    <p class="text-xs text-slate-500">{{ notif.time | date: 'short' }}</p>
                  </div>

                  <button
                    (click)="deleteNotif(notif._id)"
                    class="shrink-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group-hover:text-slate-500"
                  >
                    <lucide-icon [img]="trash" class="w-4 h-4"></lucide-icon>
                  </button>

                  <!-- Swipe Background Indicator -->
                  <div
                    class="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center text-white transition-opacity"
                    [style.opacity]="activeSwipeId === notif._id && swipeOffset < -20 ? 1 : 0"
                  >
                    <lucide-icon [img]="trash" class="w-5 h-5"></lucide-icon>
                  </div>
                </div>
              }
            </div>
            <div class="flex items-center justify-between pt-2">
              <button
                type="button"
                (click)="goToPreviousPage()"
                [disabled]="currentPage() === 1 || isLoading()"
                class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              <p class="text-xs text-slate-500">{{ pageSummary() }}</p>
              <button
                type="button"
                (click)="goToNextPage()"
                [disabled]="!hasNextPage() || isLoading()"
                class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class UserNotificationsComponent implements OnInit {
  arrowLeft = ArrowLeft;
  bell = Bell;
  trash = Trash2;
  checkCircle2 = CheckCircle2;

  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private socketService = inject(SocketService);

  notifications = signal<NotificationResponse[]>([]);
  isLoading = signal(true);
  realtimeTrigger = signal(0);
  currentPage = signal(1);
  totalNotifications = signal(0);
  hasNextPage = signal(false);
  readonly pageSize = 20;

  // Swipe logic properties
  activeSwipeId: string | null = null;
  swipeStartX = 0;
  swipeOffset = 0;

  constructor() {
    effect(() => {
      this.socketService.notifications();
      this.realtimeTrigger.update((v) => v + 1);
    });
  }

  private toResponse(n: AppNotification): NotificationResponse {
    return {
      _id: n._id || '',
      userId: '',
      type: n.type || 'info',
      message: n.message,
      read: n.read ?? n.isRead ?? false,
      time: n.createdAt,
    };
  }

  get realtimeNotifications(): NotificationResponse[] {
    this.realtimeTrigger();
    if (this.currentPage() !== 1) {
      return this.notifications();
    }
    const socketNotifs: AppNotification[] = this.socketService.notifications();
    const existing = this.notifications();
    const existingIds = new Set(
      existing.map((n) => n._id).filter((id): id is string => id !== undefined),
    );
    return [
      ...socketNotifs
        .filter((n) => n._id && !existingIds.has(n._id))
        .map((n) => this.toResponse(n)),
      ...existing,
    ];
  }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.notificationService
      .getNotifications({
        page: this.currentPage(),
        limit: this.pageSize,
        sort: '-time',
      })
      .subscribe({
        next: (res: any) => {
          const rawList: any[] = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.notifications)
              ? res.notifications
              : Array.isArray(res)
                ? res
                : [];
          const list: NotificationResponse[] = rawList.map((n) => ({
            _id: n._id,
            userId: n.userId,
            type: n.type,
            message: n.message,
            read: n.read ?? n.isRead ?? false,
            time: n.time || n.createdAt,
          }));
          const totalFromMeta = Number(res?.meta?.total);
          const total = Number.isFinite(totalFromMeta) ? totalFromMeta : list.length;
          this.notifications.set(list);
          this.totalNotifications.set(total);
          this.hasNextPage.set(this.currentPage() * this.pageSize < total);
          this.socketService.seedFromApi(list as any);
          setTimeout(() => {
            this.isLoading.set(false);
          });
        },
        error: () => {
          this.totalNotifications.set(0);
          this.hasNextPage.set(false);
          setTimeout(() => {
            this.isLoading.set(false);
          });
        },
      });
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n._id === id ? Object.assign({}, n, { read: true }) : n)),
        );
      },
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.toastService.success('All notifications marked as read');
        this.notifications.update((list) => list.map((n) => Object.assign({}, n, { read: true })));
      },
    });
  }

  deleteNotif(id: string) {
    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        this.loadNotifications();
      },
    });
  }

  isClearingAll = signal(false);

  confirmClearAll() {
    if (confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
      this.clearAll();
    }
  }

  clearAll() {
    console.log('[UserNotificationsComponent] Invoking clearAllNotifications service...');

    // Set clearing state
    this.isClearingAll.set(true);

    // Get all notification IDs
    const allNotifs = this.realtimeNotifications;
    const totalItems = allNotifs.length;

    if (totalItems === 0) {
      this.isClearingAll.set(false);
      return;
    }

    // Call the API first
    this.notificationService.clearAllNotifications().subscribe({
      next: (res) => {
        console.log('[UserNotificationsComponent] Clear all success payload:', res);

        // Remove items one by one with staggered timing to trigger fly-away animation
        // Each item gets 50ms delay before removal, animation takes 400ms
        allNotifs.forEach((notif, index) => {
          setTimeout(() => {
            // Remove from local notifications signal
            this.notifications.update((list) => list.filter((n) => n._id !== notif._id));

            // Also remove from socket service
            this.socketService.notifications.update((list) =>
              list.filter((n) => n._id !== notif._id),
            );

            // After last item is removed, clear everything and show toast
            if (index === totalItems - 1) {
              setTimeout(() => {
                this.socketService.clearAll();
                this.currentPage.set(1);
                this.totalNotifications.set(0);
                this.hasNextPage.set(false);
                this.isClearingAll.set(false);
                this.toastService.success('All notifications cleared');
              }, 400); // Wait for last animation to complete
            }
          }, index * 50); // 50ms stagger between each removal
        });
      },
      error: (err) => {
        console.error('[UserNotificationsComponent] Clear all failed:', err);
        this.isClearingAll.set(false);
        this.toastService.error('Failed to clear notifications');
      },
    });
  }

  goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }
    this.currentPage.update((value) => value + 1);
    this.loadNotifications();
  }

  goToPreviousPage(): void {
    if (this.currentPage() <= 1 || this.isLoading()) {
      return;
    }
    this.currentPage.update((value) => Math.max(1, value - 1));
    this.loadNotifications();
  }

  pageSummary(): string {
    if (this.isLoading()) {
      return 'Loading...';
    }
    const total = this.totalNotifications();
    if (total === 0) {
      return 'No results';
    }
    const from = (this.currentPage() - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage() * this.pageSize, total);
    return `${from}-${to} of ${total}`;
  }

  // Touch Event Handlers for Swipe
  onTouchStart(event: any, id: string) {
    this.activeSwipeId = id;
    this.swipeStartX = event.touches[0].clientX;
    this.swipeOffset = 0;
  }

  onTouchMove(event: any) {
    if (!this.activeSwipeId) return;
    const currentX = event.touches[0].clientX;
    const diff = currentX - this.swipeStartX;
    if (diff < 0) {
      // Only swipe left
      this.swipeOffset = Math.max(diff, -100);
    }
  }

  onTouchEnd(id: string) {
    if (this.swipeOffset < -70) {
      this.deleteNotif(id);
    }
    this.activeSwipeId = null;
    this.swipeOffset = 0;
  }
}
