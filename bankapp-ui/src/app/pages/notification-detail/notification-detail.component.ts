import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Bell,
  CheckCircle,
  Trash2,
  ExternalLink,
} from 'lucide-angular';

import { NotificationService } from '../../services/notification/notification.service';
import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-notification-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="bg-slate-50 min-h-screen">
      <div class="status-bar-spacer bg-blue-600"></div>

      <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 pt-8 pb-16">
        <div class="max-w-lg mx-auto">
          <a
            routerLink="/user/notifications"
            class="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            <span class="text-sm">Back</span>
          </a>
          <div class="text-center">
            <div
              class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <lucide-icon [img]="bell" class="w-7 h-7"></lucide-icon>
            </div>
            <h1 class="text-xl font-bold">Notification</h1>
          </div>
        </div>
      </div>

      <div class="px-6 -mt-8">
        <div class="max-w-lg mx-auto">
          @if (loading) {
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p class="text-slate-500">Loading...</p>
            </div>
          } @else if (notification) {
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div
                      [class]="notification.isRead ? 'bg-slate-100' : 'bg-blue-100'"
                      class="w-10 h-10 rounded-full flex items-center justify-center"
                    >
                      <lucide-icon
                        [img]="bell"
                        [class]="
                          notification.isRead ? 'w-5 h-5 text-slate-400' : 'w-5 h-5 text-blue-600'
                        "
                      ></lucide-icon>
                    </div>
                    <div>
                      <span
                        class="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                        [class]="
                          notification.isRead
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-blue-100 text-blue-700'
                        "
                      >
                        {{ notification.isRead ? 'Read' : 'New' }}
                      </span>
                      <p class="text-xs text-slate-400 mt-1">
                        {{ notification.createdAt | date: 'medium' }}
                      </p>
                    </div>
                  </div>
                </div>

                <p class="text-slate-800 text-base leading-relaxed mb-6">
                  {{ notification.message }}
                </p>

                @if (notification.actionUrl) {
                  <button
                    (click)="handleActionUrl()"
                    class="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-6"
                  >
                    <span>View Details</span>
                    <lucide-icon [img]="externalLink" class="w-4 h-4"></lucide-icon>
                  </button>
                }

                <div class="flex gap-3 pt-4 border-t border-slate-100">
                  @if (!notification.isRead) {
                    <button
                      (click)="markAsRead()"
                      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <lucide-icon [img]="checkCircle" class="w-4 h-4"></lucide-icon>
                      <span>Mark as Read</span>
                    </button>
                  }
                  <button
                    (click)="delete()"
                    class="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    <lucide-icon [img]="trash" class="w-4 h-4"></lucide-icon>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p class="text-slate-500">Notification not found</p>
              <a
                routerLink="/user/notifications"
                class="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm"
                >Back to notifications</a
              >
            </div>
          }
        </div>
      </div>

      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class NotificationDetailComponent implements OnInit {
  notification: any = null;
  loading = true;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  arrowLeft = ArrowLeft;
  bell = Bell;
  checkCircle = CheckCircle;
  trash = Trash2;
  externalLink = ExternalLink;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.notificationService.getNotificationById(id).subscribe({
      next: (notification) => {
        this.notification = notification;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load notification');
      },
    });
  }

  markAsRead(): void {
    if (!this.notification) return;
    this.notificationService.markAsRead(this.notification._id).subscribe({
      next: () => {
        this.notification.isRead = true;
        this.toast.success('Marked as read');
      },
      error: () => this.toast.error('Failed to mark as read'),
    });
  }

  handleActionUrl(): void {
    if (!this.notification?.actionUrl) return;
    const url = this.notification.actionUrl;
    if (url.startsWith('/') || url.startsWith('/user') || url.startsWith('/admin')) {
      this.router.navigateByUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  delete(): void {
    if (!this.notification) return;
    this.notificationService.deleteNotification(this.notification._id).subscribe({
      next: () => {
        this.toast.success('Notification deleted');
        this.router.navigate(['/user/notifications']);
      },
      error: () => this.toast.error('Failed to delete notification'),
    });
  }
}
