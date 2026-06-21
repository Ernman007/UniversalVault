import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import {
  LucideAngularModule,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  User,
  Hash,
  Calendar,
  Wallet,
  CreditCard,
  Loader,
} from 'lucide-angular';

import { isIncomingTransaction } from '../../core/transaction-direction.util';
import { TransactionService } from '../../services/transaction/transaction.service';

export interface TransactionDetail {
  _id: string;
  transactionId: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
  receiverName?: string;
  senderName?: string;
  depositorName?: string;
  bankName?: string;
  IBAN?: string;
  accountNumber?: string;
  swiftCode?: string;
  isUserSender?: boolean;
  isUserReceiver?: boolean;
  transferStatus?: string;
  fromAccount?: {
    accountNumber?: string;
    accountHolderName?: string;
    IBAN?: string;
    user?: string;
  };
  toAccount?: {
    accountNumber?: string;
    accountHolderName?: string;
    IBAN?: string;
    user?: string;
  };
  userId?: {
    name?: string;
    email?: string;
  };
}

@Component({
  selector: 'app-transaction-detail-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './transaction-detail-modal.component.html',
})
export class TransactionDetailModalComponent {
  @Input() isOpen = false;
  @Input() transactionId = '';
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  private transactionService = inject(TransactionService);

  loading = signal(true);
  error = signal('');
  transaction = signal<TransactionDetail | null>(null);

  xIcon = X;
  loaderIcon = Loader;
  alertCircleIcon = AlertCircle;
  hashIcon = Hash;
  calendarIcon = Calendar;
  walletIcon = Wallet;
  userIcon = User;
  buildingIcon = Building2;
  creditCardIcon = CreditCard;

  get typeIcon() {
    const tx = this.transaction();
    if (!tx) return ArrowRightLeft;

    if (tx.type === 'transfer') {
      return isIncomingTransaction(tx) ? ArrowDownLeft : ArrowUpRight;
    }

    switch (tx.type) {
      case 'deposit':
        return ArrowDownLeft;
      case 'withdrawal':
      case 'payment':
        return ArrowUpRight;
      default:
        return ArrowRightLeft;
    }
  }

  // Determine if this is an incoming transaction for the current user
  get isIncoming() {
    const tx = this.transaction();
    if (!tx) return false;
    return isIncomingTransaction(tx);
  }

  // Determine if this is an outgoing transaction for the current user
  get isOutgoing() {
    const tx = this.transaction();
    if (!tx) return false;
    return !isIncomingTransaction(tx);
  }

  get statusIcon() {
    const tx = this.transaction();
    if (tx?.transferStatus) return Clock;
    const status = tx?.status;
    switch (status) {
      case 'confirmed':
        return CheckCircle2;
      case 'pending':
        return Clock;
      case 'cancelled':
      case 'failed':
      case 'reversed':
        return XCircle;
      default:
        return Clock;
    }
  }

  get statusClass() {
    const tx = this.transaction();
    if (tx?.transferStatus) return 'bg-amber-100 text-amber-700';
    const status = tx?.status;
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
      case 'failed':
      case 'reversed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  get statusLabel(): string {
    const tx = this.transaction();
    if (tx?.transferStatus === 'awaiting_verification') return 'Awaiting Verification';
    if (tx?.transferStatus === 'awaiting_bank_approval') return 'Awaiting Bank Approval';
    const status = tx?.status || '';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  ngOnChanges() {
    if (this.isOpen && this.transactionId) {
      this.loadTransaction();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.closed.emit();
  }

  private loadTransaction(): void {
    console.log('[TRANSACTION-DETAIL-MODAL] Loading transaction:', this.transactionId);
    this.loading.set(true);
    this.error.set('');
    this.transaction.set(null);

    this.transactionService.getTransactionById(this.transactionId).subscribe({
      next: (data) => {
        console.log('[TRANSACTION-DETAIL-MODAL] Transaction loaded:', data);
        this.transaction.set(data as TransactionDetail);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[TRANSACTION-DETAIL-MODAL] Error loading transaction:', err);
        this.error.set(err?.error?.message || 'Failed to load transaction');
        this.loading.set(false);
      },
    });
  }
}
