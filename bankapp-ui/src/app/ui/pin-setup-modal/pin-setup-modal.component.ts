import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Shield, Check, X, Eye, EyeOff, Delete } from 'lucide-angular';
import { CardPinService } from '../../services/card-pin/card-pin.service';
import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-pin-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <!-- Header -->
        <div class="p-6 text-center border-b border-slate-100">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="shieldIcon" class="w-8 h-8 text-emerald-600"></lucide-icon>
          </div>
          <h2 class="text-xl font-semibold text-slate-900">Set Up Card PIN</h2>
          <p class="text-sm text-slate-500 mt-1">
            Create a 4-digit PIN to protect your card details
          </p>
        </div>

        <div class="p-6">
          <!-- Step indicator -->
          <div class="flex justify-center gap-2 mb-6">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                [ngClass]="
                  currentStep() === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-100 text-emerald-600'
                "
              >
                @if (currentStep() > 1) {
                  <lucide-icon [img]="checkIcon" class="w-4 h-4"></lucide-icon>
                } @else {
                  1
                }
              </div>
              <span class="text-sm font-medium text-slate-700">Enter PIN</span>
            </div>
            <div class="flex items-center">
              <div class="w-8 h-0.5 bg-slate-200"></div>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                [ngClass]="
                  currentStep() === 2
                    ? 'bg-blue-600 text-white'
                    : currentStep() > 2
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                "
              >
                @if (currentStep() > 2) {
                  <lucide-icon [img]="checkIcon" class="w-4 h-4"></lucide-icon>
                } @else {
                  2
                }
              </div>
              <span class="text-sm font-medium text-slate-700">Confirm</span>
            </div>
          </div>

          <!-- PIN Display -->
          <div class="flex justify-center gap-3 mb-4">
            @for (i of [0, 1, 2, 3]; track i) {
              <div
                class="w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all"
                [ngClass]="
                  i < currentPin().length
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                "
              >
                {{ i < currentPin().length ? (showPin() ? currentPin()[i] : '·') : '' }}
              </div>
            }
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="mb-4 p-3 bg-red-50 rounded-xl text-center">
              <p class="text-sm text-red-600">{{ errorMessage() }}</p>
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
                  [disabled]="currentPin().length >= 4"
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
                [disabled]="currentPin().length >= 4"
                class="h-14 rounded-xl bg-slate-50 text-xl font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                (click)="removeDigit()"
                [disabled]="currentPin().length === 0"
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
              @if (currentStep() === 1) {
                <button
                  type="button"
                  (click)="goToStep2()"
                  [disabled]="currentPin().length !== 4"
                  class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              } @else {
                <button
                  type="button"
                  (click)="submitPin()"
                  [disabled]="currentPin().length !== 4"
                  class="flex-1 py-3 bg-emerald-600 rounded-xl text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Confirm PIN
                </button>
              }
            </div>
          }

          <!-- PIN Requirements -->
          <div class="mt-4 p-3 bg-slate-50 rounded-xl">
            <p class="text-xs text-slate-500 text-center">
              PIN must be 4 digits. Avoid simple patterns like 1234 or 0000.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PinSetupModalComponent {
  private cardPinService = inject(CardPinService);
  private toast = inject(ToastService);

  // Icons
  shieldIcon = Shield;
  checkIcon = Check;
  xIcon = X;
  eyeIcon = Eye;
  eyeOffIcon = EyeOff;
  deleteIcon = Delete;

  // Signals
  currentStep = signal(1);
  pin1 = signal('');
  pin2 = signal('');
  showPin = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Computed
  currentPin = computed(() => this.currentStep() === 1 ? this.pin1() : this.pin2());

  // Outputs
  onSuccess = output<void>();
  onCancelCallback = output<void>();

  addDigit(digit: number): void {
    const current = this.currentPin();
    if (current.length < 4) {
      if (this.currentStep() === 1) {
        this.pin1.update(p => p + digit);
      } else {
        this.pin2.update(p => p + digit);
      }
      this.errorMessage.set(null);
    }
  }

  removeDigit(): void {
    if (this.currentStep() === 1) {
      this.pin1.update(p => p.slice(0, -1));
    } else {
      this.pin2.update(p => p.slice(0, -1));
    }
    this.errorMessage.set(null);
  }

  toggleShowPin(): void {
    this.showPin.update(v => !v);
  }

  goToStep2(): void {
    if (this.pin1().length !== 4) return;

    // Validate PIN strength
    const weakPatterns = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '3210'];
    if (weakPatterns.includes(this.pin1())) {
      this.errorMessage.set('PIN is too weak. Choose a different PIN.');
      return;
    }

    this.currentStep.set(2);
    this.errorMessage.set(null);
  }

  submitPin(): void {
    if (this.pin2().length !== 4) return;

    // Check if PINs match
    if (this.pin1() !== this.pin2()) {
      this.errorMessage.set('PINs do not match. Please try again.');
      this.pin2.set('');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.cardPinService.setupCardPin(this.pin1(), this.pin2()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.toast.success('Card PIN set successfully');
          this.onSuccess.emit();
        } else {
          this.errorMessage.set(response.message || 'Failed to set PIN');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to set PIN');
      }
    });
  }

  onCancel(): void {
    this.onCancelCallback.emit();
  }
}
