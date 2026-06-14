import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, NgZone, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { finalize, timeout, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  LucideAngularModule,
  Wifi,
  Eye,
  Lock,
  Settings,
  Sliders,
  Key,
  Copy,
  CheckCircle,
  ShoppingBag,
  Coffee,
  Utensils,
  Home,
  Wallet,
  Send,
  CreditCard,
  Landmark,
  Bell,
  Headphones,
} from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AccountService, Account } from '../../services/account/account.service';
import { CardService, Card } from '../../services/card/card.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService, Transaction } from '../../services/transaction/transaction.service';
import { CardPinService } from '../../services/card-pin/card-pin.service';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../../ui/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../ui/card/card.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { PinEntryModalComponent } from '../../ui/pin-entry-modal/pin-entry-modal.component';
import { PinSetupModalComponent } from '../../ui/pin-setup-modal/pin-setup-modal.component';

@Component({
  selector: 'app-user-cards',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    CardComponent,
    ProgressBarComponent,
    BottomSheetComponent,
    BottomNavComponent,
    PinEntryModalComponent,
    PinSetupModalComponent,
  ],
  template: `
    <div class="bg-slate-50 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Header -->
      <div class="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto flex items-center justify-between">
          <h1 class="text-xl font-bold text-slate-900">My Cards</h1>
          <button
            (click)="requestCardOpen = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Card
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          <!-- Cards Carousel -->
          <div class="mb-6">
            <div
              class="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-2"
            >
              <!-- Cards from API -->
              @for (card of cards(); track card._id; let idx = $index) {
                <div class="flex-shrink-0 w-full snap-center">
                  <div
                    class="rounded-2xl p-5 text-white relative overflow-hidden cursor-pointer"
                    [ngClass]="
                      card.cardType === 'credit'
                        ? 'bg-gradient-to-br from-blue-600 to-purple-700'
                        : 'bg-gradient-to-br from-slate-800 to-slate-900'
                    "
                    (click)="selectCardByIndex(idx)"
                  >
                    <!-- Pattern overlay -->
                    <div class="absolute inset-0 opacity-10">
                      <div class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white"></div>
                      <div
                        class="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white"
                      ></div>
                    </div>

                    <div class="relative" [class.opacity-50]="card.isFrozen">
                      <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-2">
                          <lucide-icon [img]="wifi" class="w-5 h-5 rotate-90"></lucide-icon>
                          <span class="text-xs font-medium opacity-75">Contactless</span>
                        </div>
                        <span class="text-lg font-bold tracking-wider">{{
                          card.cardType === 'credit' ? 'CREDIT' : 'DEBIT'
                        }}</span>
                      </div>

                      <p class="text-lg tracking-widest mb-6 font-mono">
                        •••• •••• •••• {{ card.cardNumber.slice(-4) || 'XXXX' }}
                      </p>

                      <div class="flex items-end justify-between">
                        <div>
                          <p class="text-xs opacity-75 mb-1">Card Holder</p>
                          <p class="font-medium uppercase">{{ card.cardHolderName || 'User' }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-xs opacity-75 mb-1">Expires</p>
                          <p class="font-medium">{{ card.expiryDate | date: 'MM/yy' }}</p>
                        </div>
                      </div>
                      @if (card.isFrozen) {
                        <div
                          class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm"
                        >
                          <div
                            class="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                          >
                            Locked
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Card Actions -->
                  <div class="flex justify-center gap-4 mt-4">
                    <button
                      (click)="viewCardDetails(card)"
                      class="flex flex-col items-center gap-1 px-4 py-2"
                    >
                      <div
                        class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"
                      >
                        <lucide-icon [img]="eye" class="w-5 h-5 text-blue-600"></lucide-icon>
                      </div>
                      <span class="text-xs text-slate-600">Details</span>
                    </button>
                    <button
                      (click)="openLockCard(card)"
                      class="flex flex-col items-center gap-1 px-4 py-2"
                    >
                      <div
                        class="w-10 h-10 rounded-xl flex items-center justify-center"
                        [ngClass]="card.isFrozen ? 'bg-emerald-100' : 'bg-amber-100'"
                      >
                        <lucide-icon
                          [img]="lock"
                          class="w-5 h-5"
                          [ngClass]="card.isFrozen ? 'text-emerald-600' : 'text-amber-600'"
                        ></lucide-icon>
                      </div>
                      <span class="text-xs text-slate-600">{{
                        card.isFrozen ? 'Unlock' : 'Lock'
                      }}</span>
                    </button>
                    <button
                      (click)="openCardSettings(card)"
                      class="flex flex-col items-center gap-1 px-4 py-2"
                    >
                      <div
                        class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"
                      >
                        <lucide-icon [img]="settings" class="w-5 h-5 text-slate-600"></lucide-icon>
                      </div>
                      <span class="text-xs text-slate-600">Settings</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="w-full text-center py-10 opacity-60">No cards found.</div>
              }
            </div>

            <!-- Carousel Dots -->
            <div class="flex justify-center gap-2 mt-2">
              @for (card of cards(); track card._id; let idx = $index) {
                <div
                  class="w-2 h-2 rounded-full transition-colors"
                  [class.bg-blue-600]="idx === selectedCardIndex"
                  [class.bg-slate-300]="idx !== selectedCardIndex"
                ></div>
              }
            </div>
          </div>

          <!-- Card Details Section -->
          @if (cardDetailsOpen && selectedCard) {
            <app-card title="Card Details" padding="md">
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                  <span class="text-sm text-slate-500">Card Number</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-slate-900">{{
                      selectedCard.cardNumber
                    }}</span>
                    <button (click)="copyCardNumber()" class="text-blue-600">
                      <lucide-icon [img]="copy" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                  <span class="text-sm text-slate-500">CVV</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-slate-900">•••</span>
                    <button (click)="showCVV()" class="text-blue-600 text-xs">Show</button>
                  </div>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-100">
                  <span class="text-sm text-slate-500">Status</span>
                  <span
                    class="inline-flex items-center gap-1 text-sm font-medium"
                    [ngClass]="selectedCard.isFrozen ? 'text-amber-600' : 'text-emerald-600'"
                  >
                    <lucide-icon [img]="checkCircle" class="w-4 h-4"></lucide-icon>
                    {{ selectedCard.isFrozen ? 'Locked' : 'Active' }}
                  </span>
                </div>
                <div class="flex justify-between items-center py-2">
                  <span class="text-sm text-slate-500">Daily Limit</span>
                  <span class="text-sm font-medium text-slate-900">{{
                    selectedCard.creditLimit || 5000 | currency
                  }}</span>
                </div>
              </div>
            </app-card>
          }

          <!-- Spending Summary -->
          <app-card title="This Month's Spending" padding="md">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-slate-500"
                >{{ monthlyCardSpending() | currency }} of {{ totalCreditLimit() | currency }}</span
              >
              <span class="text-sm font-medium text-slate-900"
                >{{ spendingPercentage() | number: '1.0-1' }}%</span
              >
            </div>
            <app-progress-bar
              [percentage]="spendingPercentage()"
              color="gradient"
            ></app-progress-bar>
            <div class="flex justify-between mt-3 text-xs text-slate-500">
              <span>{{ totalCreditLimit() - monthlyCardSpending() | currency }} remaining</span>
              <span>Resets next month</span>
            </div>
          </app-card>

          <!-- Recent Transactions -->
          <div class="mb-4 mt-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-slate-900">Recent Card Transactions</h3>
              <a routerLink="/user/history" class="text-sm text-blue-600 font-medium">See all</a>
            </div>

            <div class="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              @for (tx of cardTransactions(); track tx._id) {
                <div class="flex items-center justify-between p-4 touch-active">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <lucide-icon [img]="shoppingBag" class="w-5 h-5 text-slate-600"></lucide-icon>
                    </div>
                    <div>
                      <p class="font-medium text-slate-900">
                        {{ tx.description || 'Card Payment' }}
                      </p>
                      <p class="text-xs text-slate-500">{{ tx.createdAt | date: 'short' }}</p>
                    </div>
                  </div>
                  <p class="font-semibold text-slate-900">{{ tx.amount | currency }}</p>
                </div>
              } @empty {
                <div class="p-6 text-center text-slate-500 text-sm">
                  No recent card transactions
                </div>
              }
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-3">
            <button
              (click)="openSetLimit()"
              class="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all touch-active flex items-center gap-3"
            >
              <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="sliders" class="w-5 h-5 text-blue-600"></lucide-icon>
              </div>
              <div class="text-left">
                <p class="font-medium text-slate-900 text-sm">Set Limit</p>
                <p class="text-xs text-slate-500">Daily spending</p>
              </div>
            </button>
            <button
              (click)="openChangePinModal()"
              class="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all touch-active flex items-center gap-3"
            >
              <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="key" class="w-5 h-5 text-emerald-600"></lucide-icon>
              </div>
              <div class="text-left">
                <p class="font-medium text-slate-900 text-sm">Change PIN</p>
                <p class="text-xs text-slate-500">Update card PIN</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems" (onMoreClick)="moreMenuOpen = true"></app-bottom-nav>

      <!-- Lock Card Modal -->
      <app-bottom-sheet [(isOpen)]="lockCardOpen" title="Lock Card?">
        <div class="text-center mb-4">
          <div
            class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <lucide-icon [img]="lock" class="w-8 h-8 text-amber-600"></lucide-icon>
          </div>
          <p class="text-slate-500 text-sm mt-1">
            Temporarily freeze your card. You can unlock it anytime.
          </p>
        </div>
        <div class="flex gap-3">
          <button
            (click)="lockCardOpen = false"
            class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="lockCard()"
            class="flex-1 py-3 bg-amber-500 rounded-xl text-white font-medium hover:bg-amber-600 transition-colors"
          >
            Lock Card
          </button>
        </div>
      </app-bottom-sheet>

      <!-- Card Settings Modal -->
      <app-bottom-sheet [(isOpen)]="settingsOpen" title="Card Settings">
        @if (selectedCard) {
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p class="text-sm font-medium text-slate-900">Card</p>
                <p class="text-xs text-slate-500">•••• {{ selectedCard.cardNumber.slice(-4) }}</p>
              </div>
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                [ngClass]="
                  selectedCard.isFrozen
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                "
              >
                {{ selectedCard.isFrozen ? 'Locked' : 'Active' }}
              </span>
            </div>
            @if (selectedCard.cardType === 'credit') {
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-slate-50 rounded-xl">
                  <p class="text-xs text-slate-500 mb-1">Credit Limit</p>
                  <p class="font-semibold text-slate-900">
                    {{ cardCreditLimit() || 0 | currency }}
                  </p>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl">
                  <p class="text-xs text-slate-500 mb-1">Available Credit</p>
                  <p class="font-semibold text-emerald-600">
                    {{ cardAvailableCredit() || 0 | currency }}
                  </p>
                </div>
              </div>
            }
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >Daily Spending Limit</label
              >
              <input
                type="number"
                [(ngModel)]="cardDailyLimit"
                min="0"
                step="100"
                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="flex gap-3">
              <button
                (click)="settingsOpen = false"
                class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="saveCardSettings()"
                [disabled]="savingSettings"
                class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {{ savingSettings ? 'Saving...' : 'Save Settings' }}
              </button>
            </div>
          </div>
        }
      </app-bottom-sheet>

      <!-- Request Card Modal -->
      <app-bottom-sheet [(isOpen)]="requestCardOpen" title="Request New Card">
        @if (requestStep === 1) {
          <div class="space-y-3 mb-4">
            <label
              class="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
              [ngClass]="
                cardTypeReq === 'debit' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
              "
            >
              <input
                type="radio"
                name="cardType"
                value="debit"
                [(ngModel)]="cardTypeReq"
                class="w-5 h-5 text-blue-600"
              />
              <div class="flex-1">
                <p class="font-medium text-slate-900">Debit Card</p>
                <p class="text-sm text-slate-500">Linked to your checking account</p>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
              [ngClass]="
                cardTypeReq === 'credit' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
              "
            >
              <input
                type="radio"
                name="cardType"
                value="credit"
                [(ngModel)]="cardTypeReq"
                class="w-5 h-5 text-blue-600"
              />
              <div class="flex-1">
                <p class="font-medium text-slate-900">Credit Card</p>
                <p class="text-sm text-slate-500">Subject to credit approval</p>
              </div>
            </label>
          </div>
          <div class="flex gap-3">
            <button
              (click)="requestCardOpen = false; requestStep = 1"
              class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="requestStep = 2"
              class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        } @else {
          <p class="text-sm text-slate-500 mb-3">
            Select an account to link your new {{ cardTypeReq }} card:
          </p>
          <div class="space-y-2 mb-4">
            @for (acct of accounts(); track acct._id) {
              <label
                class="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                [ngClass]="
                  selectedAccountId === acct._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                "
              >
                <input
                  type="radio"
                  name="accountSelect"
                  [value]="acct._id"
                  [(ngModel)]="selectedAccountId"
                  class="w-5 h-5 text-blue-600"
                />
                <div class="flex-1">
                  <p class="font-medium text-slate-900">{{ acct.type | titlecase }} Account</p>
                  <p class="text-sm text-slate-500">{{ acct.balance | currency }}</p>
                </div>
              </label>
            } @empty {
              <p class="text-center text-slate-400 py-4">No accounts found.</p>
            }
          </div>
          <div class="flex gap-3">
            <button
              (click)="requestStep = 1"
              class="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Back
            </button>
            <button
              (click)="requestCard()"
              [disabled]="!selectedAccountId || requestingCard"
              class="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ requestingCard ? 'Requesting...' : 'Request Card' }}
            </button>
          </div>
        }
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

      <!-- PIN Setup Modal -->
      @if (pinSetupOpen()) {
        <app-pin-setup-modal
          (onSuccess)="onPinSetupSuccess()"
          (onCancelCallback)="onPinSetupCancel()"
        />
      }

      <!-- PIN Entry Modal -->
      @if (pinEntryOpen()) {
        <app-pin-entry-modal
          (onSuccess)="onPinEntrySuccess()"
          (onCancelCallback)="onPinEntryCancel()"
          (onPinNotSet)="onPinNotSet()"
          (onForgotPinCallback)="onForgotPin()"
        />
      }
    </div>
  `,
})
export class UserCardsComponent implements OnInit {
  cardDetailsOpen = false;
  lockCardOpen = false;
  settingsOpen = false;
  requestCardOpen = false;
  moreMenuOpen = false;
  requestStep = 1;
  requestingCard = false;
  savingSettings = false;
  cardDailyLimit = 0;
  cardCreditLimit = signal<number | null>(null);
  cardAvailableCredit = signal<number | null>(null);

  // PIN modal state
  pinEntryOpen = signal(false);
  pinSetupOpen = signal(false);
  pinChangeOpen = signal(false);
  hasPinSession = signal(false);

  selectedCard: Card | null = null;
  selectedCardIndex = 0;
  cardTypeReq = 'debit';
  primaryAccountId: string = '';
  selectedAccountId: string = '';

  toast = inject(ToastService);
  private cardService = inject(CardService);
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private cardPinService = inject(CardPinService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  cards = signal<Card[]>([]);
  accounts = signal<Account[]>([]);
  cardTransactions = signal<Transaction[]>([]);
  monthlyCardSpending = signal<number>(0);
  totalCreditLimit = signal<number>(5000); // Default limit if none available
  spendingPercentage = signal<number>(0);
  loansEnabled = environment.features.loansEnabled;

  ngOnInit() {
    // Check if we're on PIN setup or entry route
    const currentUrl = this.router.url;
    if (currentUrl.includes('/pin-setup')) {
      this.pinSetupOpen.set(true);
    } else if (currentUrl.includes('/pin-entry')) {
      this.pinEntryOpen.set(true);
    } else {
      // Check PIN session status
      this.hasPinSession.set(this.cardPinService.hasPinSession());
    }

    this.accountService.getAccounts().subscribe({
      next: (data) => {
        this.accounts.set(data);
        if (data.length > 0) {
          this.primaryAccountId = data[0]._id;
          this.selectedAccountId = data[0]._id;
          this.loadCards(this.primaryAccountId);
        }
      },
    });
  }

  loadCards(accountId: string) {
    this.cardService.getCardsByAccountId(accountId).subscribe({
      next: (cards) => {
        this.cards.set(cards);

        let limit = 0;
        cards.forEach((c) => (limit += c.creditLimit || 5000));
        this.totalCreditLimit.set(limit > 0 ? limit : 5000);

        this.loadCardTransactions();
      },
      error: () => this.toast.error('Failed to load cards'),
    });
  }

  loadCardTransactions() {
    const cards = this.cards();
    if (cards.length === 0) {
      this.cardTransactions.set([]);
      return;
    }

    // Fetch card transactions for each card and combine
    const txObservables = cards.map(card => 
      this.cardService.getCardTransactions(card._id).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin(txObservables)
      .pipe(
        map((txArrays: any[][]) => txArrays.flat()),
        map((allTxs: any[]) => {
          // Normalize card transactions to match Transaction interface
          return allTxs.map(ctx => ({
            _id: ctx._id || ctx.transactionId,
            amount: ctx.amount,
            type: ctx.transactionType || 'card_purchase',
            status: 'Completed',
            description: ctx.merchantDetails || 'Card Transaction',
            createdAt: ctx.date || ctx.createdAt,
            senderName: undefined,
            receiverName: ctx.merchantDetails,
          }));
        }),
        map((normalized: any[]) => {
          // Sort by date descending and take 5 most recent
          return normalized
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
        }),
        catchError(() => of([]))
      )
      .subscribe({
        next: (cardTxs: any[]) => {
          this.cardTransactions.set(cardTxs);

          // Calculate monthly spending
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          let spending = 0;

          cardTxs.forEach((tx: any) => {
            const txDate = new Date(tx.createdAt);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
              spending += tx.amount;
            }
          });

          this.monthlyCardSpending.set(spending);
          this.spendingPercentage.set(Math.min(100, (spending / this.totalCreditLimit()) * 100));
        },
        error: () => console.error('Failed to load card transactions'),
      });
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

  // Icons
  wifi = Wifi;
  eye = Eye;
  lock = Lock;
  settings = Settings;
  sliders = Sliders;
  key = Key;
  copy = Copy;
  checkCircle = CheckCircle;
  shoppingBag = ShoppingBag;
  coffee = Coffee;
  utensils = Utensils;
  landmark = Landmark;
  bell = Bell;
  headphones = Headphones;

  navItems: NavItem[] = [
    { label: 'Home', icon: Home, route: '/user/dashboard' },
    { label: 'Accounts', icon: Wallet, route: '/user/accounts' },
    { label: 'Transfer', icon: Send, route: '/user/transfer' },
    { label: 'Cards', icon: CreditCard, route: '/user/cards' },
  ];

  viewCardDetails(card: Card) {
    this.selectedCard = card;
    this.cardDetailsOpen = true;
  }

  openLockCard(card: Card) {
    this.selectedCard = card;
    this.lockCardOpen = true;
  }

  copyCardNumber(): void {
    if (this.selectedCard) {
      navigator.clipboard.writeText(this.selectedCard.cardNumber);
      this.toast.success('Card number copied');
    }
  }

  showCVV(): void {
    if (this.selectedCard) {
      this.toast.info(`CVV: ${this.selectedCard.cvv || '***'}`);
    }
  }

  lockCard(): void {
    if (this.selectedCard) {
      const nextFrozenState = !this.selectedCard.isFrozen;
      this.cardService.toggleFreezeCard(this.selectedCard._id, nextFrozenState).subscribe({
        next: () => {
          this.toast.success(nextFrozenState ? 'Card locked successfully' : 'Card unlocked successfully');
          this.lockCardOpen = false;
          this.loadCards(this.primaryAccountId);
        },
        error: () => this.toast.error('Failed to update card status'),
      });
    }
  }

  requestCard(): void {
    if (this.selectedAccountId) {
      this.requestingCard = true;
      this.cardService
        .requestNewCard({
          cardType: this.cardTypeReq,
          accountId: this.selectedAccountId,
        })
        .pipe(
          timeout(15000),
          finalize(() => {
            this.ngZone.run(() => {
              this.requestingCard = false;
            });
          }),
        )
        .subscribe({
        next: () => {
          this.toast.success('Card request submitted successfully!');
          this.requestCardOpen = false;
          this.requestStep = 1;
          this.loadCards(this.selectedAccountId);
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to request card');
        },
        });
    }
  }

  openCardSettings(card: Card): void {
    this.selectedCard = card;
    this.cardDailyLimit = (card as any).dailyLimit || 0;
    this.settingsOpen = true;
    if (card.cardType === 'credit') {
      this.cardCreditLimit.set(null);
      this.cardAvailableCredit.set(null);
      this.cardService.getCreditLimit(card._id).subscribe({
        next: (res) => this.cardCreditLimit.set(res.creditLimit),
        error: () => this.cardCreditLimit.set(null),
      });
      this.cardService.getAvailableCredit(card._id).subscribe({
        next: (res) => this.cardAvailableCredit.set(res.availableCredit),
        error: () => this.cardAvailableCredit.set(null),
      });
    }
  }

  selectCardByIndex(index: number): void {
    const cardArray = this.cards();
    if (index >= 0 && index < cardArray.length) {
      this.selectedCardIndex = index;
      this.selectedCard = cardArray[index];
    }
  }

  openSetLimit(): void {
    if (this.selectedCard) {
      this.openCardSettings(this.selectedCard);
    } else {
      const firstCard = this.cards()[0];
      if (firstCard) {
        this.selectCardByIndex(0);
        this.openCardSettings(firstCard);
      } else {
        this.toast.info('No cards available to set limit on');
      }
    }
  }

  // PIN Modal Handlers
  openChangePinModal(): void {
    this.cardPinService.getPinStatus().subscribe({
      next: (status) => {
        if (!status.hasPin) {
          // No PIN set, show setup modal
          this.pinSetupOpen.set(true);
        } else {
          // PIN exists, show change modal (reuse entry modal with change mode)
          this.pinChangeOpen.set(true);
        }
      },
      error: () => {
        this.toast.error('Failed to check PIN status');
      }
    });
  }

  onPinSetupSuccess(): void {
    this.pinSetupOpen.set(false);
    this.hasPinSession.set(true);
    // Navigate to cards page
    this.router.navigate(['/user/cards']);
  }

  onPinEntrySuccess(): void {
    this.pinEntryOpen.set(false);
    this.hasPinSession.set(true);
    // Navigate to the intended destination or cards page
    const redirectUrl = sessionStorage.getItem('pinRedirectUrl') || '/user/cards';
    sessionStorage.removeItem('pinRedirectUrl');
    this.router.navigate([redirectUrl]);
  }

  onPinEntryCancel(): void {
    this.pinEntryOpen.set(false);
    // Navigate back to dashboard
    this.router.navigate(['/user/dashboard']);
  }

  onPinSetupCancel(): void {
    this.pinSetupOpen.set(false);
    // Navigate back to dashboard
    this.router.navigate(['/user/dashboard']);
  }

  onPinNotSet(): void {
    this.pinEntryOpen.set(false);
    this.pinSetupOpen.set(true);
  }

  onForgotPin(): void {
    this.pinEntryOpen.set(false);
    this.cardPinService.requestPinReset().subscribe({
      next: (response) => {
        this.toast.success(response.message || 'PIN reset email sent');
      },
      error: () => {
        this.toast.error('Failed to request PIN reset');
      }
    });
  }

  saveCardSettings(): void {
    if (!this.selectedCard) return;
    this.savingSettings = true;
    this.cardService
      .updateCardSettings(this.selectedCard._id, { dailyLimit: this.cardDailyLimit })
      .subscribe({
        next: (updated) => {
          this.savingSettings = false;
          this.settingsOpen = false;
          this.toast.success('Card settings saved successfully');
          const cards = this.cards().map((c) => (c._id === updated._id ? updated : c));
          this.cards.set(cards);
        },
        error: (err) => {
          this.savingSettings = false;
          this.toast.error(err.error?.message || 'Failed to save card settings');
        },
      });
  }
}
