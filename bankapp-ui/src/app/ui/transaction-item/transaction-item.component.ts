import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  LucideAngularModule,
  ShoppingBag,
  Building2,
  ArrowRightLeft,
  Coffee,
  Wallet,
  PiggyBank,
  Zap,
  Film,
  Utensils,
  User,
  LucideIconData,
} from 'lucide-angular';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'payment';

@Component({
  selector: 'app-transaction-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-active cursor-pointer"
      (click)="onClick()"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center"
          [class.bg-emerald-100]="isIncoming"
          [class.bg-red-100]="isOutgoing"
          [class.bg-purple-100]="type === 'payment'"
        >
          <lucide-icon
            [img]="iconData"
            class="w-5 h-5"
            [class.text-emerald-600]="isIncoming"
            [class.text-red-600]="isOutgoing"
            [class.text-purple-600]="type === 'payment'"
          ></lucide-icon>
        </div>
        <div>
          <p class="font-medium text-slate-900">{{ title }}</p>
          <p class="text-xs text-slate-500">{{ subtitle }}</p>
          @if (isPending) {
            <p class="text-xs text-amber-500 font-medium mt-0.5">{{ pendingLabel }}</p>
          }
        </div>
      </div>
      <div class="text-right">
        <p
          class="font-semibold"
          [class.text-emerald-600]="isIncoming"
          [class.text-red-600]="isOutgoing"
        >
          {{ formattedAmount }}
        </p>
        @if (category) {
          <p class="text-xs text-slate-400">{{ category }}</p>
        }
      </div>
    </div>
  `,
})
export class TransactionItemComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() amount = 0;
  @Input() type: TransactionType = 'deposit';
  @Input() category = '';
  @Input() icon: string = 'wallet';
  @Input() transactionId = '';
  @Input() isIncoming = false; // True if user is receiving money (deposit or transfer received)
  @Input() status = '';
  @Input() transferStatus = '';
  @Output() itemClick = new EventEmitter<string>();

  get isOutgoing(): boolean {
    return !this.isIncoming;
  }

  get isPending(): boolean {
    return this.status === 'pending' && !this.isIncoming;
  }

  get pendingLabel(): string {
    if (this.transferStatus === 'awaiting_verification') return 'Awaiting verification';
    if (this.transferStatus === 'awaiting_bank_approval') return 'Awaiting bank approval';
    if (this.status === 'pending') return 'Pending';
    return '';
  }

  get iconData(): LucideIconData {
    const icons: Record<string, LucideIconData> = {
      'shopping-bag': ShoppingBag,
      'building-2': Building2,
      'arrow-right-left': ArrowRightLeft,
      coffee: Coffee,
      wallet: Wallet,
      'piggy-bank': PiggyBank,
      zap: Zap,
      film: Film,
      utensils: Utensils,
      user: User,
    };
    return icons[this.icon] || Wallet;
  }

  get formattedAmount(): string {
    const prefix = this.isIncoming ? '+' : '-';
    return `${prefix}$${this.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  onClick(): void {
    if (this.transactionId) {
      this.itemClick.emit(this.transactionId);
    }
  }
}
