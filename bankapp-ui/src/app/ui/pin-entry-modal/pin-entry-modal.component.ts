import { Component, inject, signal, computed, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Lock, Eye, EyeOff, Delete } from 'lucide-angular';
import { CardPinService } from '../../services/card-pin/card-pin.service';
import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-pin-entry-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <!-- Header -->
        <div class="p-6 text-center border-b border-slate-100">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="lockIcon" class="w-8 h-8 text-blue-600"></lucide-icon>
          </div>
          <h2 class="text-xl font-semibold text-slate-900">Enter Card PIN</h2>
          <p class="text-sm text-slate-500 mt-1">Enter your 4-digit PIN to access card details</p>
        </div>

        <!-- PIN Display -->
        <div class="p-6">
          <div class="flex justify-center gap-3 mb-6">
            @for (i of [0, 1, 2, 3]; track i) {
              <div
                class="w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all"
                [ngClass]="
                  i < pin().length
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                "
              >
                {{ i < pin().length ? (showPin() ? pin()[i] : '·') : '' }}
              </div>
            }
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="mb-4 p-3 bg-red-50 rounded-xl text-center">
              <p class="text-sm text-red-600">{{ errorMessage() }}</p>
              @if (attemptsRemaining() !== null) {
                <p class="text-xs text-red-500 mt-1">
                  {{ attemptsRemaining() }} attempt(s) remaining
                </p>
              }
            </div>
          }

          <!-- Loading State -->
          @if (isLoading()) {
            <div class="flex justify-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          } @else {
            <!-- Numeric Keypad -->
            <div class="grid grid-cols-3 gap-3 mb-4">
              @for (num of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track num) {
                <button
                  type="button"
                  (click)="addDigit(num)"
                  [disabled]="pin().length >= 4"
                  class="h-14 rounded-xl bg-slate-50 text-xl font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {{ num }}
                </button>
              }
              <button
                type="button"
                (click)="toggleShowPin()"
                class="h-14 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
              >
                <lucide-icon [img]="showPin() ? eyeOffIcon : eyeIcon" class="w-5 h-5"></lucide-icon>
              </button>
              <button
                type="button"
                (click)="addDigit(0)"
                [disabled]="pin().length >= 4"
                class="h-14 rounded-xl bg-slate-50 text-xl font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                (click)="removeDigit()"
                [disabled]="pin().length === 0"
                class="h-14 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <lucide-icon [img]="deleteIcon" class="w-5 h-5"></lucide-icon>
              </button>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                type="button"
                (click)="onCancel()"
                class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="submitPin()"
                [disabled]="pin().length !== 4 || isLoading()"
                class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Verify
              </button>
            </div>

            <!-- Forgot PIN Link -->
            <button
              type="button"
              (click)="onForgotPin()"
              class="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot PIN?
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class PinEntryModalComponent {
  private cardPinService = inject(CardPinService);
  private toast = inject(ToastService);

  // Icons
  lockIcon = Lock;
  eyeIcon = Eye;
  eyeOffIcon = EyeOff;
  deleteIcon = Delete;

  // Signals
  pin = signal('');
  showPin = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  attemptsRemaining = signal<number | null>(null);

  // Outputs
  onSuccess = output<void>();
  onCancelCallback = output<void>();
  onForgotPinCallback = output<void>();
  onPinNotSet = output<void>();

  addDigit(digit: number): void {
    if (this.pin().length < 4) {
      this.pin.update(p => p + digit);
      this.errorMessage.set(null);
    }
  }

  removeDigit(): void {
    this.pin.update(p => p.slice(0, -1));
    this.errorMessage.set(null);
  }

  toggleShowPin(): void {
    this.showPin.update(v => !v);
  }

  submitPin(): void {
    if (this.pin().length !== 4) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.cardPinService.verifyCardPin(this.pin()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.toast.success('PIN verified successfully');
          this.onSuccess.emit();
        } else if (response.pinNotSet) {
          this.onPinNotSet.emit();
        } else {
          this.errorMessage.set(response.message || 'Verification failed');
          this.attemptsRemaining.set(response.attemptsRemaining ?? null);
          this.pin.set('');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        const errorData = error.error;
        this.errorMessage.set(errorData?.message || 'Verification failed');
        this.attemptsRemaining.set(errorData?.attemptsRemaining ?? null);
        this.pin.set('');
      }
    });
  }

  onCancel(): void {
    this.onCancelCallback.emit();
  }

  onForgotPin(): void {
    this.onForgotPinCallback.emit();
  }
}
