import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notification/notification.service';
import { ToastService } from '../notification/toast.service';

export interface AppNotification {
  _id?: string;
  message: string;
  type: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private notificationService = inject(NotificationService);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private maxSeenNotificationIds = 2000;
  private seenNotificationIds = new Set<string>();
  private seenNotificationQueue: string[] = [];

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);

  constructor() {
    this.socket = io(`${environment.wsUrl}/notifications`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  connect() {
    const user = this.authService.currentUser();
    if (user && !this.socket.connected) {
      this.socket.auth = { token: this.authService.token() };
      this.socket.connect();
    }
  }

  private authenticate(token: string) {
    this.socket.emit('authenticate', token);
  }

  private handleIncomingNotification(data: any) {
    const id = data._id || data.id;
    if (!id) return;

    if (!this.trackSeenNotificationId(id)) {
      return; // Already seen
    }

    const normalized = { ...data, isRead: false, read: false };
    this.notifications.update((current) => [normalized, ...current]);
    this.unreadCount.update((count) => count + 1);

    if (data.type?.includes('approved')) {
      this.toastService.success(data.message || 'Request approved!');
    } else if (data.type?.includes('rejected')) {
      this.toastService.error(data.message || 'Request rejected.');
    } else {
      this.toastService.info(data.message || 'New notification');
    }
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      const token = this.authService.token();
      if (token) {
        this.authenticate(token);
      }
      this.reconnectAttempts = 0;
    });

    // Only listen to new_notification (backend emits only once now)
    this.socket.on('new_notification', (data: any) => this.handleIncomingNotification(data));

    this.socket.on('reconnect', (_attemptNumber) => {
      const token = this.authService.token();
      if (token) {
        this.authenticate(token);
        // Re-sync from API after reconnection
        this.notificationService.getNotifications({ page: 1, limit: 50 }).subscribe({
          next: (res: any) => {
            const list = res.data?.notifications || res.notifications || res || [];
            this.seedFromApi(list as any);
          },
          error: () => console.error('Failed to re-sync notifications after reconnect'),
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // Listen for custom events
  on(eventName: string, callback: (_data: any) => void) {
    this.socket.on(eventName, callback);
  }

  // Remove event listener
  off(eventName: string) {
    this.socket.off(eventName);
  }

  seedFromApi(notifications: AppNotification[]) {
    notifications.forEach((n) => {
      const id = n._id || (n as any).id;
      if (id) this.trackSeenNotificationId(id);
    });
    this.notifications.set([...notifications]);
    this.unreadCount.set(notifications.filter((n) => !(n.isRead ?? n.read ?? false)).length);
  }

  private trackSeenNotificationId(id: string): boolean {
    if (this.seenNotificationIds.has(id)) {
      return false;
    }

    this.seenNotificationIds.add(id);
    this.seenNotificationQueue.push(id);

    while (this.seenNotificationQueue.length > this.maxSeenNotificationIds) {
      const oldestId = this.seenNotificationQueue.shift();
      if (oldestId) {
        this.seenNotificationIds.delete(oldestId);
      }
    }

    return true;
  }

  clearAll() {
    this.seenNotificationIds.clear();
    this.seenNotificationQueue = [];
    this.notifications.set([]);
    this.unreadCount.set(0);
  }
}
