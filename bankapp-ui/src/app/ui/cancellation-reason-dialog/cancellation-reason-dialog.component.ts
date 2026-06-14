import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Loader } from 'lucide-angular';

@Component({
  selector: 'app-cancellation-reason-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <!-- Header -->
        <div class="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 class="text-lg font-bold">Reject Transfer Request</h3>
          <button (click)="onCancel()" class="p-1 hover:bg-red-700 rounded-lg transition-colors">
            <lucide-icon [img]="xIcon" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <p class="text-sm text-slate-600 mb-4">
            Please provide a reason for rejecting this transfer request. This will be visible to the
            user.
          </p>
          <textarea
            [(ngModel)]="cancellationReason"
            rows="4"
            placeholder="Enter reason for rejection..."
            class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm resize-none text-slate-900 placeholder-slate-400"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            (click)="onCancel()"
            class="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            (click)="onSubmit()"
            [disabled]="loading()"
            class="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
          >
            @if (loading()) {
              <lucide-icon [img]="loader" class="w-4 h-4 animate-spin"></lucide-icon>
            }
            <span>Reject Request</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CancellationReasonDialogComponent {
  xIcon = X;
  loader = Loader;

  cancellationReason = '';
  loading = signal(false);

  onCancel(): void {
    // This would typically emit an event or use a dialog service to close
    // For now, we'll use a simple approach
  }

  onSubmit(): void {
    if (this.cancellationReason.trim()) {
      this.loading.set(true);
      // Simulate processing
      setTimeout(() => {
        this.loading.set(false);
        // The parent component should handle the actual rejection with reason
        // This is just a placeholder UI
      }, 500);
    }
  }
}
