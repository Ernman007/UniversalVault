import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  LucideAngularModule,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 md:px-0"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto bg-white rounded-xl shadow-lg border border-slate-100 p-4 flex items-start gap-3 transform transition-all duration-300"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <lucide-icon [img]="checkCircle" class="w-5 h-5 text-emerald-500"></lucide-icon>
              }
              @case ('error') {
                <lucide-icon [img]="alertCircle" class="w-5 h-5 text-red-500"></lucide-icon>
              }
              @case ('warning') {
                <lucide-icon [img]="alertTriangle" class="w-5 h-5 text-amber-500"></lucide-icon>
              }
              @default {
                <lucide-icon [img]="info" class="w-5 h-5 text-blue-500"></lucide-icon>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            @if (toast.title) {
              <p class="text-sm font-semibold text-slate-900">{{ toast.title }}</p>
            }
            <p class="text-sm text-slate-600 break-words">{{ toast.message }}</p>
          </div>

          <!-- Close button -->
          <button
            (click)="toastService.remove(toast.id)"
            class="flex-shrink-0 ml-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <lucide-icon [img]="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
  x = X;
  checkCircle = CheckCircle;
  alertCircle = AlertCircle;
  info = Info;
  alertTriangle = AlertTriangle;
}
