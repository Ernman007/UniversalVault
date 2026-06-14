import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Send,
  Search,
  PiggyBank,
  Home,
  Wallet,
  CreditCard,
  Landmark,
  Bell,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AccountService, Account } from '../../services/account/account.service';
import { BeneficiaryService, Beneficiary } from '../../services/beneficiary/beneficiary.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService, Transaction } from '../../services/transaction/transaction.service';
import {
  TransferService,
  BankDirectoryEntry,
  TransferValidationResponse,
} from '../../services/transfer/transfer.service';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../../ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';

@Component({
  selector: 'app-user-transfers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    CardComponent,
    AvatarComponent,
    ButtonComponent,
    BottomSheetComponent,
    BottomNavComponent,
  ],
  template: `
    <div class="bg-slate-50 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Header -->
      <div class="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto flex items-center gap-4">
          <a
            routerLink="/user/dashboard"
            class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5 text-slate-600"></lucide-icon>
          </a>
          <h1 class="text-xl font-bold text-slate-900">Transfer Money</h1>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          <!-- Transfer Type Tabs -->
          <div class="bg-white rounded-xl shadow-sm p-1 mb-4">
            <div class="flex">
              <button
                (click)="switchTransferType('internal')"
                class="flex-1 py-3 text-sm font-medium rounded-lg transition-colors"
                [class.border]="transferType === 'internal'"
                [class.border-blue-600]="transferType === 'internal'"
                [class.text-blue-600]="transferType === 'internal'"
                [class.bg-blue-50]="transferType === 'internal'"
                [class.border-transparent]="transferType !== 'internal'"
                [class.text-slate-500]="transferType !== 'internal'"
              >
                Between Accounts
              </button>
              <button
                (click)="switchTransferType('external')"
                class="flex-1 py-3 text-sm font-medium rounded-lg transition-colors"
                [class.border]="transferType === 'external'"
                [class.border-blue-600]="transferType === 'external'"
                [class.text-blue-600]="transferType === 'external'"
                [class.bg-blue-50]="transferType === 'external'"
                [class.border-transparent]="transferType !== 'external'"
                [class.text-slate-500]="transferType !== 'external'"
              >
                To Others
              </button>
            </div>
          </div>

          <!-- Internal Transfer Form -->
          @if (transferType === 'internal') {
            <form #internalForm="ngForm" (ngSubmit)="submitInternalTransfer()" class="space-y-4">
              <!-- From Account -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">From Account</label>
                <select
                  [(ngModel)]="internalFrom"
                  name="fromAccount"
                  required
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  @for (acc of accounts(); track acc._id) {
                    <option [value]="acc._id">
                      {{ acc.type | titlecase }} (****{{ acc.accountNumber.slice(-4) }}) -
                      {{ acc.balance | currency }}
                    </option>
                  }
                </select>
              </app-card>

              <!-- To Account -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">To Account</label>
                <select
                  [(ngModel)]="internalTo"
                  name="toAccount"
                  required
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  @for (acc of accounts(); track acc._id) {
                    <option [value]="acc._id">
                      {{ acc.type | titlecase }} (****{{ acc.accountNumber.slice(-4) }}) -
                      {{ acc.balance | currency }}
                    </option>
                  }
                </select>
              </app-card>

              <!-- Amount -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg"
                    >$</span
                  >
                  <input
                    type="number"
                    [(ngModel)]="internalAmount"
                    name="internalAmount"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full pl-10 pr-4 py-4 text-2xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div class="flex gap-2 mt-3">
                  <button
                    type="button"
                    (click)="internalAmount = 100"
                    class="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
                  >
                    $100
                  </button>
                  <button
                    type="button"
                    (click)="internalAmount = 500"
                    class="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
                  >
                    $500
                  </button>
                  <button
                    type="button"
                    (click)="internalAmount = 1000"
                    class="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
                  >
                    $1,000
                  </button>
                </div>
              </app-card>

              <!-- Note -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">Note (Optional)</label>
                <input
                  type="text"
                  [(ngModel)]="internalNote"
                  name="internalNote"
                  placeholder="Add a note"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </app-card>

              <!-- Submit -->
              <app-button
                type="submit"
                variant="primary"
                size="lg"
                [fullWidth]="true"
                [disabled]="internalForm.invalid || internalFrom === internalTo"
              >
                <lucide-icon [img]="send" class="w-5 h-5"></lucide-icon>
                <span>Transfer Now</span>
              </app-button>
            </form>
          }

          <!-- External Transfer Form -->
          @if (transferType === 'external') {
            <form #externalForm="ngForm" (ngSubmit)="submitExternalTransfer()" class="space-y-4">
              <!-- From Account -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">From Account</label>
                <select
                  [(ngModel)]="externalFrom"
                  name="extFromAccount"
                  required
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  @for (acc of accounts(); track acc._id) {
                    <option [value]="acc._id">
                      {{ acc.type | titlecase }} (****{{ acc.accountNumber.slice(-4) }}) -
                      {{ acc.balance | currency }}
                    </option>
                  }
                </select>
              </app-card>

              <!-- Recipient -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">Recipient</label>

                <!-- Saved Recipients -->
                <div class="mb-3">
                  <p class="text-xs text-slate-500 mb-2">Saved Recipients</p>
                  <div class="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    @for (recipient of recipients(); track recipient._id) {
                      <button
                        type="button"
                        (click)="selectRecipient(recipient.accountNumber)"
                        class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <app-avatar
                          [src]="getAvatar(recipient.nickname)"
                          [alt]="recipient.nickname"
                          size="md"
                        ></app-avatar>
                        <span class="text-xs text-slate-600">{{ recipient.nickname }}</span>
                      </button>
                    }
                    <button
                      type="button"
                      class="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div
                        class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                      >
                        <lucide-icon [img]="send" class="w-5 h-5 text-blue-600"></lucide-icon>
                      </div>
                      <span class="text-xs text-slate-600">New</span>
                    </button>
                  </div>
                </div>

                <!-- Or enter manually -->
                <div class="relative">
                  <lucide-icon
                    [img]="search"
                    class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  ></lucide-icon>
                  <input
                    type="text"
                    [(ngModel)]="recipientSearch"
                    name="recipientSearch"
                    placeholder="Search or enter IBAN/account number"
                    required
                    (ngModelChange)="onRecipientSearchChange($event)"
                    [class]="
                      'w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
                      (accountFormatError() ? 'border-red-300' : 'border-slate-200')
                    "
                  />
                </div>
                @if (accountFormatError()) {
                  <p class="text-xs text-red-600 mt-2">{{ accountFormatError() }}</p>
                } @else if (validatingRecipientName()) {
                  <p class="text-xs text-slate-500 mt-2">Validating recipient account...</p>
                } @else if (recipientNamePreview()) {
                  <p class="text-xs text-emerald-700 mt-2">
                    Recipient name: {{ recipientNamePreview() }}
                  </p>
                }
              </app-card>

              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2"
                  >Destination Bank</label
                >
                <input
                  type="text"
                  [(ngModel)]="bankSearch"
                  name="bankSearch"
                  list="bank-directory"
                  placeholder="Search bank name"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  (ngModelChange)="onBankSearchChange($event)"
                />
                <datalist id="bank-directory">
                  @for (bank of filteredBanks(); track bank.code) {
                    <option [value]="bank.name"></option>
                  }
                </datalist>
                @if (bankSelectionError()) {
                  <p class="text-xs text-red-500 mt-2">
                    {{ bankSelectionError() }}
                  </p>
                } @else {
                  <p class="text-xs text-slate-500 mt-2">
                    {{ selectedBankCode() ? 'Selected: ' + selectedBankCode() : 'Choose a bank' }}
                  </p>
                }
              </app-card>

              <!-- Amount -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg"
                    >$</span
                  >
                  <input
                    type="number"
                    [(ngModel)]="externalAmount"
                    name="externalAmount"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full pl-10 pr-4 py-4 text-2xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </app-card>

              <!-- Note -->
              <app-card padding="md">
                <label class="block text-sm font-medium text-slate-700 mb-2">Note (Optional)</label>
                <input
                  type="text"
                  [(ngModel)]="externalNote"
                  name="externalNote"
                  placeholder="What's this for?"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </app-card>

              <!-- Submit -->
              <div class="space-y-2">
                <app-button
                  type="submit"
                  variant="primary"
                  size="lg"
                  [fullWidth]="true"
                  [disabled]="!canSubmitExternalTransfer(externalForm.invalid ?? true)"
                >
                  <lucide-icon [img]="send" class="w-5 h-5"></lucide-icon>
                  <span>Continue</span>
                </app-button>

                @if (
                  externalForm.dirty && !canSubmitExternalTransfer(externalForm.invalid ?? true)
                ) {
                  <p class="text-center text-xs text-slate-400">
                    {{
                      bankSelectionError()
                        ? 'Select a bank from the list to continue'
                        : validatingRecipientName()
                          ? 'Validating recipient...'
                          : 'Please fill in all details correctly'
                    }}
                  </p>
                }
              </div>

              @if (externalRequestId()) {
                <app-card padding="md">
                  <div class="flex items-start gap-3 mb-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center"
                      [class]="
                        verificationStatus() === 'verified'
                          ? 'bg-emerald-100'
                          : verificationStatus() === 'failed'
                            ? 'bg-red-100'
                            : 'bg-amber-100'
                      "
                    >
                      <lucide-icon
                        [img]="
                          verificationStatus() === 'verified'
                            ? checkCircle2
                            : verificationStatus() === 'failed'
                              ? alertCircle
                              : clock3
                        "
                        [class]="
                          verificationStatus() === 'verified'
                            ? 'w-4 h-4 text-emerald-600'
                            : verificationStatus() === 'failed'
                              ? 'w-4 h-4 text-red-600'
                              : 'w-4 h-4 text-amber-600'
                        "
                      >
                      </lucide-icon>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">Transfer Verification</p>
                      <p class="text-xs text-slate-500">Request ID: {{ externalRequestId() }}</p>
                    </div>
                  </div>

                  <p
                    class="text-sm mb-3"
                    [class]="
                      verificationStatus() === 'verified'
                        ? 'text-emerald-700'
                        : verificationStatus() === 'failed'
                          ? 'text-red-700'
                          : 'text-amber-700'
                    "
                  >
                    {{ verificationMessage() }}
                  </p>

                  @if (verificationStatus() !== 'verified') {
                    <div class="flex gap-2">
                      <input
                        type="text"
                        [(ngModel)]="verificationCode"
                        name="verificationCode"
                        placeholder="Enter 6-digit code"
                        maxlength="6"
                        class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        (click)="verifyExternalTransfer()"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  }
                </app-card>
              }
            </form>
          }

          <!-- Recent Transfers -->
          <div class="mt-6">
            <h3 class="font-semibold text-slate-900 mb-3">Recent Transfers</h3>
            <div class="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              @for (tx of recentTransfers(); track tx._id) {
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"
                    >
                      <lucide-icon
                        [img]="tx.type === 'deposit' ? piggyBank : send"
                        class="w-5 h-5 text-slate-600"
                      ></lucide-icon>
                    </div>
                    <div>
                      <p class="font-medium text-slate-900">{{ tx.description || 'Transfer' }}</p>
                      <p class="text-xs text-slate-500">{{ tx.createdAt | date: 'mediumDate' }}</p>
                    </div>
                  </div>
                  <p class="font-semibold text-slate-600">{{ tx.amount | currency }}</p>
                </div>
              } @empty {
                <div class="p-6 text-center text-slate-500 text-sm">No recent transfers</div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems" (onMoreClick)="moreMenuOpen = true"></app-bottom-nav>

      <!-- Confirmation Modal -->
      <app-bottom-sheet [(isOpen)]="confirmModalOpen" title="Confirm Transfer">
        <div class="text-center mb-4">
          <div
            class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <lucide-icon [img]="send" class="w-8 h-8 text-blue-600"></lucide-icon>
          </div>
          <p class="text-slate-500 text-sm mt-1">Confirm your transfer to Savings Account?</p>
        </div>
        <div class="bg-slate-50 rounded-xl p-4 mb-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-slate-500">From</span>
            <span class="font-medium text-slate-900">{{ getAccountLabel(internalFrom) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">To</span>
            <span class="font-medium text-slate-900">{{ getAccountLabel(internalTo) }}</span>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            (click)="confirmModalOpen = false"
            class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="confirmTransfer()"
            class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </app-bottom-sheet>

      <!-- More Menu Modal -->
      <app-bottom-sheet [(isOpen)]="moreMenuOpen" title="More">
        <div class="grid grid-cols-3 gap-4 mb-4">
          @if (loansEnabled) {
            <a
              routerLink="/user/loans"
              class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="landmark" class="w-6 h-6 text-amber-600"></lucide-icon>
              </div>
              <span class="text-sm text-slate-700">Loans</span>
            </a>
          }
          <a
            routerLink="/user/notifications"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="bell" class="w-6 h-6 text-blue-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Notifications</span>
          </a>
          <a
            routerLink="/user/support"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="headphones" class="w-6 h-6 text-emerald-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Support</span>
          </a>
        </div>
        <button
          (click)="moreMenuOpen = false"
          class="w-full py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </app-bottom-sheet>
    </div>
  `,
})
export class UserTransfersComponent implements OnInit {
  transferType: 'internal' | 'external' = 'internal';

  private toast = inject(ToastService);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private transferService = inject(TransferService);
  private transactionService = inject(TransactionService);
  private beneficiaryService = inject(BeneficiaryService);

  accounts = signal<Account[]>([]);
  recentTransfers = signal<Transaction[]>([]);

  // Internal transfer form
  internalFrom = '';
  internalTo = '';
  internalAmount: number | null = null;
  internalNote = '';

  // External transfer form
  externalFrom = '';
  externalAmount: number | null = null;
  externalNote = '';
  recipientSearch = '';
  externalRequestId = signal('');
  externalIdempotencyKey = '';
  verificationCode = '';
  verificationStatus = signal<'idle' | 'pending' | 'verified' | 'failed'>('idle');
  verificationMessage = signal('');
  loansEnabled = environment.features.loansEnabled;

  ngOnInit() {
    this.accountService.getAccounts().subscribe({
      next: (data: Account[]) => {
        this.accounts.set(data);
        if (data.length > 0) {
          this.internalFrom = data[0]._id;
          this.externalFrom = data[0]._id;
          if (data.length > 1) {
            this.internalTo = data[1]._id;
          } else {
            this.internalTo = data[0]._id; // fallback
          }
        }
      },
      error: () => this.toast.error('Failed to load accounts'),
    });

    this.transactionService.getTransactions().subscribe({
      next: (txs) => {
        const allTxs = this.normalizeTransactionsResponse(txs);
        const transfers = allTxs
          .filter((tx: any) => tx.type === 'transfer' || tx.type === 'transfer_in')
          .slice(0, 5);
        this.recentTransfers.set(transfers);
      },
      error: () => console.error('Failed to load transfers'),
    });
    this.loadRecipients();
  }

  private normalizeTransactionsResponse(txsData: unknown): Transaction[] {
    if (Array.isArray(txsData)) {
      return txsData;
    }
    if (txsData && typeof txsData === 'object' && Array.isArray((txsData as any).data)) {
      return (txsData as any).data as Transaction[];
    }
    return [];
  }

  confirmModalOpen = false;
  moreMenuOpen = false;
  displayAmount = '0.00';

  recipients = signal<any[]>([]);
  banks = signal<BankDirectoryEntry[]>([]);
  filteredBanks = signal<BankDirectoryEntry[]>([]);
  selectedBankCode = signal('');
  accountFormatError = signal('');
  bankSelectionError = signal('');
  recipientNamePreview = signal('');
  validatingRecipientName = signal(false);
  private recipientValidationTimer: ReturnType<typeof setTimeout> | null = null;
  bankSearch = '';

  // Icons
  arrowLeft = ArrowLeft;
  send = Send;
  search = Search;
  piggyBank = PiggyBank;
  landmark = Landmark;
  bell = Bell;
  headphones = Headphones;
  checkCircle2 = CheckCircle2;
  alertCircle = AlertCircle;
  clock3 = Clock3;

  navItems: NavItem[] = [
    { label: 'Home', icon: Home, route: '/user/dashboard' },
    { label: 'Accounts', icon: Wallet, route: '/user/accounts' },
    { label: 'Transfer', icon: Send, route: '/user/transfer' },
    { label: 'Cards', icon: CreditCard, route: '/user/cards' },
  ];

  loadRecipients() {
    this.beneficiaryService.getBeneficiaries().subscribe({
      next: (res: { success: boolean; data: Beneficiary[] }) => {
        const beneficiaries: Beneficiary[] = res?.data ?? [];
        this.recipients.set(beneficiaries.slice(0, 10));
      },
      error: () => {
        this.recipients.set([]);
      },
    });
  }

  getAvatar(name: string): string {
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}&size=48`;
  }

  selectRecipient(name: string): void {
    this.recipientSearch = name;
    this.toast.info(`Selected ${name}`);
    this.onRecipientSearchChange(name);
  }

  submitInternalTransfer(): void {
    if (!this.internalAmount || this.internalAmount <= 0) {
      this.toast.error('Please enter a valid amount');
      return;
    }
    this.displayAmount = this.internalAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.confirmModalOpen = true;
  }

  submitExternalTransfer(): void {
    if (!this.externalAmount || this.externalAmount <= 0) {
      this.toast.error('Please enter a valid amount');
      return;
    }
    if (!this.recipientSearch.trim()) {
      this.toast.error('Please select or enter a recipient');
      return;
    }
    const normalizedDestination = this.normalizeAccountInput(this.recipientSearch);
    const strictValidationEnabled = this.banks().length > 0 || !!this.selectedBankCode();
    if (strictValidationEnabled && !this.isValidDestinationAccount(this.recipientSearch)) {
      this.toast.error('Please provide a valid IBAN or account number');
      return;
    }
    if (this.banks().length > 0 && !this.selectedBankCode()) {
      this.toast.error('Please choose a destination bank');
      return;
    }

    if (!this.externalIdempotencyKey) {
      this.externalIdempotencyKey =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    this.transferService
      .requestTransfer({
        fromAccount: this.externalFrom,
        toAccount: strictValidationEnabled ? normalizedDestination : this.recipientSearch.trim(),
        amount: this.externalAmount,
        description: this.externalNote || 'External Transfer',
        bankName: this.bankSearch,
        accountNumber: strictValidationEnabled
          ? normalizedDestination
          : this.recipientSearch.trim(),
        recipientName: this.recipientNamePreview(),
        idempotencyKey: this.externalIdempotencyKey,
        type: 'external',
      })
      .subscribe({
        next: (response: any) => {
          const requestId =
            response?.requestId ||
            response?._id ||
            response?.data?.requestId ||
            response?.data?._id ||
            '';
          if (!requestId) {
            this.verificationStatus.set('failed');
            this.verificationMessage.set(
              response?.message || 'Transfer request was created but request ID is missing',
            );
            this.toast.error('Unable to continue verification: missing request ID');
            return;
          }

          this.externalRequestId.set(requestId);
          this.verificationStatus.set('pending');
          this.verificationMessage.set(
            response?.duplicate
              ? 'Duplicate request detected. Verification is required for this pending deduction.'
              : 'Transfer initiated. Funds have been deducted and are pending bank verification.',
          );
          this.verificationCode = '';
          this.toast.info('Transfer initiated. Please verify with the code sent to your email.');
          // Route to transaction history where pending transfer can be verified
          this.router.navigate(['/user/history'], {
            queryParams: { pendingTransfer: requestId },
          });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.error?.error || 'Failed to request transfer';
          this.verificationStatus.set('failed');
          this.verificationMessage.set(msg);
          this.toast.error(msg);
        },
      });
  }

  switchTransferType(type: 'internal' | 'external'): void {
    this.transferType = type;
    if (type === 'external' && this.banks().length === 0) {
      this.loadBanks();
    }
  }

  canSubmitExternalTransfer(externalFormInvalid: boolean): boolean {
    const strictValidationEnabled = this.banks().length > 0;
    return (
      !externalFormInvalid &&
      !this.validatingRecipientName() &&
      (!strictValidationEnabled || !this.accountFormatError()) &&
      (!strictValidationEnabled || (!!this.selectedBankCode() && !this.bankSelectionError()))
    );
  }

  onBankSearchChange(value: string): void {
    this.bankSearch = value;
    const query = value.trim().toLowerCase();
    if (!query) {
      this.filteredBanks.set(this.banks());
      this.selectedBankCode.set('');
      this.bankSelectionError.set('');
      return;
    }
    const matches = this.banks().filter((bank) => bank.name.toLowerCase().includes(query));
    this.filteredBanks.set(matches);

    // Exact match (case insensitive)
    let matchedBank = this.banks().find((bank) => bank.name.toLowerCase() === query);

    // If no exact match, but there's a match that starts with the query
    // and the query is at least 3 chars long, and it's the only such match
    if (!matchedBank && query.length >= 3) {
      const startsWith = matches.filter((bank) => bank.name.toLowerCase().startsWith(query));
      if (startsWith.length === 1) {
        matchedBank = startsWith[0];
      }
    }

    this.selectedBankCode.set(matchedBank?.code ?? '');

    // Resolve error message
    // If we have a selected bank, or if we have potential matches, don't show error yet
    if (query.length > 0 && !matchedBank && matches.length === 0) {
      this.bankSelectionError.set('Please select a valid bank from the directory');
    } else {
      this.bankSelectionError.set('');
    }

    if (this.selectedBankCode()) {
      // If we auto-selected or found exact, update the search field to full name
      if (matchedBank && matchedBank.name.toLowerCase() !== query) {
        this.bankSearch = matchedBank.name;
      }
      this.onRecipientSearchChange(this.recipientSearch);
    }
  }

  onRecipientSearchChange(value: string): void {
    this.recipientSearch = value;
    const normalized = this.normalizeAccountInput(value);
    this.recipientNamePreview.set('');
    if (!normalized) {
      this.accountFormatError.set('');
      return;
    }
    if (!this.isValidDestinationAccount(normalized)) {
      this.accountFormatError.set('Enter a valid account number (6-20 digits) or IBAN.');
      return;
    }
    this.accountFormatError.set('');
    // Proceed with validation even if bank not selected (for auto-detect)
    if (this.recipientValidationTimer) {
      clearTimeout(this.recipientValidationTimer);
    }
    this.recipientValidationTimer = setTimeout(() => {
      this.validatingRecipientName.set(true);
      this.transferService
        .validateTransferRecipient({
          accountNumber: normalized,
          bankCode: this.selectedBankCode() || undefined,
        })
        .subscribe({
          next: (response: any) => {
            this.validatingRecipientName.set(false);
            if (response?.valid) {
              if (response.accountName) {
                this.recipientNamePreview.set(response.accountName);
              }
              // Auto-detect internal bank
              if (
                response.bankName &&
                response.bankCode === environment.bankCode &&
                !this.selectedBankCode()
              ) {
                this.onBankSearchChange(response.bankName);
              }
            } else {
              this.recipientNamePreview.set('');
            }
          },
          error: () => {
            this.validatingRecipientName.set(false);
            this.recipientNamePreview.set('');
          },
        });
    }, 500);
  }

  private loadBanks(): void {
    this.transferService.getBanks().subscribe({
      next: (banks) => {
        const normalizedBanks = Array.isArray(banks)
          ? banks
              .filter((bank) => !!bank?.name && !!bank?.code)
              .map((bank) => ({
                code: bank.code,
                name: bank.name,
              }))
          : [];
        this.banks.set(normalizedBanks);
        this.filteredBanks.set(normalizedBanks);
      },
      error: () => {
        this.banks.set([]);
        this.filteredBanks.set([]);
      },
    });
  }

  private isValidDestinationAccount(input: string): boolean {
    const value = this.normalizeAccountInput(input);
    if (!value) {
      return false;
    }
    // Support local account numbers (6-20 digits) and standard IBANs (11-34 chars)
    const localPattern = /^\d{6,20}$/;
    const ibanPattern = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
    return localPattern.test(value) || ibanPattern.test(value);
  }

  private normalizeAccountInput(value: string): string {
    return (value || '').replace(/\s+/g, '').toUpperCase();
  }

  verifyExternalTransfer(): void {
    if (!this.externalRequestId()) {
      this.toast.error('No pending transfer request found');
      return;
    }
    if (!/^\d{6}$/.test(this.verificationCode.trim())) {
      this.toast.error('Please enter the 6-digit verification code');
      return;
    }

    this.transferService
      .verifyTransferRequest({
        requestId: this.externalRequestId(),
        code: this.verificationCode.trim(),
      })
      .subscribe({
        next: (res: any) => {
          const returnedStatus = res?.status;
          if (returnedStatus === 'pending_admin') {
            this.verificationStatus.set('pending');
            this.verificationMessage.set(
              res?.message || 'Transfer verified. Awaiting bank approval.',
            );
            this.toast.info('Transfer verified. Awaiting bank approval.');
            this.refreshTransferStatus();
            return;
          }

          this.verificationStatus.set('verified');
          this.verificationMessage.set(res?.message || 'Transfer verified successfully');
          this.toast.success('Transfer verified successfully');
          this.refreshTransferStatus();

          this.transferService.getTransactionByRequestId(this.externalRequestId()).subscribe({
            next: () => {
              this.externalIdempotencyKey = '';
              this.router.navigate(['/user/dashboard']);
            },
            error: () => {
              this.externalIdempotencyKey = '';
              this.router.navigate(['/user/dashboard']);
            },
          });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Verification failed';
          this.verificationStatus.set('failed');
          this.verificationMessage.set(msg);
          this.toast.error(msg);
        },
      });
  }

  private refreshTransferStatus(): void {
    if (!this.externalRequestId()) return;
    this.transferService.getTransferRequestStatus(this.externalRequestId()).subscribe({
      next: (res) => {
        const status = (res as any)?.status ?? res?.data?.status;
        if (status === 'approved') {
          this.verificationStatus.set('verified');
          this.verificationMessage.set('Transfer status: approved');
        } else if (status === 'rejected') {
          this.verificationStatus.set('failed');
          this.verificationMessage.set('Transfer status: rejected');
        } else if (status === 'pending_admin') {
          this.verificationStatus.set('pending');
          this.verificationMessage.set('Transfer verified. Awaiting bank approval.');
        } else if (status === 'pending' && this.verificationStatus() !== 'failed') {
          this.verificationStatus.set('pending');
          this.verificationMessage.set('Transfer status: pending verification');
        }
      },
      error: () => {},
    });
  }

  confirmTransfer(): void {
    if (!this.internalAmount) return;

    this.transferService
      .createTransfer({
        fromAccount: this.internalFrom,
        toAccount: this.internalTo,
        amount: this.internalAmount,
        description: this.internalNote || 'Internal Transfer',
        type: 'internal',
      })
      .subscribe({
        next: () => {
          this.confirmModalOpen = false;
          this.toast.success('Transfer successful!');
          this.router.navigate(['/user/dashboard']);
        },
        error: () => {
          this.confirmModalOpen = false;
          this.toast.error('Failed to process transfer');
        },
      });
  }

  getAccountLabel(id: string): string {
    const account = this.accounts().find((a) => a._id === id);
    if (!account) return 'Select Account';
    const type = account.type.charAt(0).toUpperCase() + account.type.slice(1);
    return `${type} ****${account.accountNumber.slice(-4)}`;
  }

  getFormattedAmount(): string {
    if (!this.internalAmount) return '0.00';
    return this.internalAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  get formattedAmount(): string {
    return this.getFormattedAmount();
  }
}
