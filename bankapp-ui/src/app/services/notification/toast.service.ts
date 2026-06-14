import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  private queueUpdate(updateFn: () => void): void {
    setTimeout(updateFn, 0);
  }

  show(message: string, type: ToastType = 'info', title?: string, duration = 5000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, message, title, duration };

    this.queueUpdate(() => {
      this.toasts.update((current) => [...current, toast]);
    });

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, title?: string, duration?: number) {
    this.show(message, 'success', title, duration);
  }

  error(message: string, title?: string, duration?: number) {
    this.show(message, 'error', title, duration);
  }

  info(message: string, title?: string, duration?: number) {
    this.show(message, 'info', title, duration);
  }

  warning(message: string, title?: string, duration?: number) {
    this.show(message, 'warning', title, duration);
  }

  remove(id: string) {
    this.queueUpdate(() => {
      this.toasts.update((current) => current.filter((t) => t.id !== id));
    });
  }
}
