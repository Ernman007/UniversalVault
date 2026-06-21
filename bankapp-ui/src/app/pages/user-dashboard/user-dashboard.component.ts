import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Bell,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Send,
  History,
  CreditCard,
  Landmark,
  Wallet,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Headphones,
  Settings,
  LogOut,
  Store,
  HelpCircle,
  Home,
  Download,
} from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AccountService, Account } from '../../services/account/account.service';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { ToastService } from '../../services/notification/toast.service';
import { Transaction } from '../../services/transaction/transaction.service';
import { TransactionStateService } from '../../services/transaction/transaction-state.service';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../../ui/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../ui/card/card.component';

import { TransactionItemComponent } from '../../ui/transaction-item/transaction-item.component';
import { isIncomingTransaction } from '../../core/transaction-direction.util';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    AvatarComponent,
    CardComponent,
    TransactionItemComponent,
    BottomSheetComponent,
    BottomNavComponent,
  ],
  template: `
    <div class="bg-slate-50 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Header -->
      <div
        class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-4 pb-24 rounded-b-3xl"
      >
        <div class="max-w-lg mx-auto">
          <!-- Top row -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <app-avatar
                src="https://api.dicebear.com/9.x/avataaars/svg?seed={{ user()?.name }}&size=40"
                alt="Avatar"
                size="md"
              ></app-avatar>
              <div>
                <p class="text-blue-100 text-xs">{{ greeting() }}</p>
                <h2 class="font-semibold">{{ user()?.name || 'Valued Customer' }}</h2>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a
                routerLink="/user/notifications"
                [attr.aria-label]="notificationAriaLabel()"
                class="relative p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <lucide-icon [img]="bell" class="w-5 h-5"></lucide-icon>
                @if (notificationCount() > 0) {
                  <span
                    class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
                    aria-hidden="true"
                  ></span>
                }
                <span class="sr-only">{{ notificationAriaLabel() }}</span>
              </a>
              <button
                (click)="profileMenuOpen = true"
                class="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <lucide-icon [img]="moreVertical" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
          </div>

          <!-- Balance Card -->
          <div class="text-center">
            <p class="text-blue-100 text-sm mb-1">Total Balance</p>
            <h1 class="text-3xl font-bold mb-2">{{ totalBalance() | currency }}</h1>
            @if (monthlyChange() !== 0) {
              <div
                class="inline-flex items-center gap-1 text-sm"
                [ngClass]="monthlyChange() > 0 ? 'text-emerald-300' : 'text-red-300'"
              >
                <lucide-icon
                  [img]="monthlyChange() > 0 ? trendingUp : trendingDown"
                  class="w-4 h-4"
                ></lucide-icon>
                <span
                  >{{ monthlyChange() > 0 ? '+' : ''
                  }}{{ monthlyChangePercentage() | number: '1.1-1' }}% this month</span
                >
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 -mt-16">
        <div class="max-w-lg mx-auto">
          <!-- Quick Actions -->
          <app-card padding="md">
            <div class="grid grid-cols-4 gap-2">
              <a
                routerLink="/user/transfer"
                class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="send" class="w-6 h-6 text-blue-600"></lucide-icon>
                </div>
                <span class="text-xs font-medium text-slate-700">Transfer</span>
              </a>
              <a
                routerLink="/user/history"
                class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="history" class="w-6 h-6 text-emerald-600"></lucide-icon>
                </div>
                <span class="text-xs font-medium text-slate-700">History</span>
              </a>
              <a
                routerLink="/user/cards"
                class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors touch-active"
              >
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <lucide-icon [img]="creditCard" class="w-6 h-6 text-purple-600"></lucide-icon>
                </div>
                <span class="text-xs font-medium text-slate-700">Cards</span>
              </a>
              @if (loansEnabled) {
                <a
                  routerLink="/user/loans"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors touch-active"
                >
                  <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <lucide-icon [img]="landmark" class="w-6 h-6 text-amber-600"></lucide-icon>
                  </div>
                  <span class="text-xs font-medium text-slate-700">Loans</span>
                </a>
              }
            </div>
          </app-card>

          <!-- Accounts -->
          <div class="mb-4 mt-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-slate-900">My Accounts</h3>
              <a routerLink="/user/accounts" class="text-sm text-blue-600 font-medium">See all</a>
            </div>

            <!-- Accounts Swipe Carousel -->
            <div class="relative group">
              <div
                class="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-4"
                (scroll)="onAccountScroll($event)"
              >
                @for (acc of accounts(); track acc._id) {
                  <div class="flex-shrink-0 w-[92%] snap-center">
                    <a
                      [routerLink]="['/user/account', acc._id]"
                      class="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all border border-slate-100 touch-active"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div
                            class="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                            [ngClass]="acc.type === 'savings' ? 'bg-emerald-50' : 'bg-blue-50'"
                          >
                            <lucide-icon
                              [img]="acc.type === 'savings' ? piggyBank : wallet"
                              class="w-6 h-6"
                              [ngClass]="
                                acc.type === 'savings' ? 'text-emerald-600' : 'text-blue-600'
                              "
                            ></lucide-icon>
                          </div>
                          <div>
                            <p class="font-bold text-slate-900 text-lg">
                              {{ acc.type | titlecase }}
                            </p>
                            <p class="text-xs text-slate-500 font-medium tracking-wider uppercase">
                              ****{{ acc.accountNumber.slice(-4) }}
                            </p>
                          </div>
                        </div>
                        <div class="text-right">
                          <p class="text-2xl font-bold text-slate-900">
                            {{ acc.balance | currency }}
                          </p>
                          <p class="text-[10px] text-slate-400 font-medium uppercase mt-1">
                            Available Balance
                          </p>
                        </div>
                      </div>
                    </a>
                  </div>
                } @empty {
                  <div
                    class="w-full p-8 text-center bg-white rounded-2xl shadow-sm border border-dashed border-slate-300"
                  >
                    <p class="text-slate-500 text-sm">No accounts found</p>
                  </div>
                }
              </div>

              <!-- Indicators (only show if multiple accounts) -->
              @if (accounts().length > 1) {
                <div class="flex justify-center gap-1.5 mt-2">
                  @for (acc of accounts(); track acc._id; let i = $index) {
                    <div
                      class="h-1.5 rounded-full transition-all duration-300"
                      [ngClass]="
                        activeAccountIndex() === i ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300'
                      "
                    ></div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Monthly Summary -->
          <app-card title="This Month" padding="md">
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-emerald-50 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-1">
                  <lucide-icon [img]="arrowDownLeft" class="w-4 h-4 text-emerald-600"></lucide-icon>
                  <span class="text-xs text-slate-600">Income</span>
                </div>
                <p class="font-semibold text-emerald-700">{{ monthlyIncome() | currency }}</p>
              </div>
              <div class="bg-red-50 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-1">
                  <lucide-icon [img]="arrowUpRight" class="w-4 h-4 text-red-600"></lucide-icon>
                  <span class="text-xs text-slate-600">Expenses</span>
                </div>
                <p class="font-semibold text-red-700">{{ monthlyExpenses() | currency }}</p>
              </div>
            </div>
          </app-card>

          <!-- Recent Transactions -->
          <div class="mb-4 mt-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-slate-900">Recent Transactions</h3>
              <a routerLink="/user/history" class="text-sm text-blue-600 font-medium">See all</a>
            </div>

            <div class="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              @for (tx of recentTransactions(); track tx._id) {
                <app-transaction-item
                  [title]="tx.description || (tx.type === 'transfer' ? 'Transfer' : 'Payment')"
                  [subtitle]="(tx.createdAt | date: 'medium') || ''"
                  [amount]="tx.amount"
                  [type]="
                    tx.type === 'deposit'
                      ? 'deposit'
                      : tx.type === 'withdrawal'
                        ? 'withdrawal'
                        : tx.type === 'transfer'
                          ? 'transfer'
                          : 'payment'
                  "
                  [isIncoming]="isIncomingTransaction(tx)"
                  [category]="tx.type | titlecase"
                  [icon]="getTxIcon(tx.type)"
                  [status]="tx.status"
                  [transferStatus]="tx.transferStatus || ''"
                ></app-transaction-item>
              } @empty {
                <div class="p-6 text-center text-slate-500 text-sm">No recent transactions</div>
              }
            </div>
          </div>

          <!-- Loans Overview (Hidden since real API not connected) -->
          <!--
          <div class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 mb-4 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-amber-100 text-sm">Active Loan</p>
                <p class="font-semibold text-lg">Personal Loan</p>
                <p class="text-amber-100 text-sm mt-1">Remaining: $8,420.00</p>
              </div>
              <a routerLink="/user/loans/detail" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Details
              </a>
            </div>
            <div class="mt-3">
              <app-progress-bar [percentage]="58" color="gradient"></app-progress-bar>
            </div>
          </div>
          -->
        </div>
      </div>

      <!-- PWA Install Banner -->
      @if (showInstallBanner()) {
        <div class="px-5 mb-4">
          <div
            class="max-w-lg mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 flex items-center justify-between shadow-lg"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <lucide-icon [img]="download" class="w-5 h-5"></lucide-icon>
              </div>
              <div>
                <p class="font-semibold text-sm">Install BankApp</p>
                <p class="text-blue-100 text-xs">Add to home screen for quick access</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                (click)="dismissInstall()"
                class="text-xs text-blue-200 hover:text-white px-2"
              >
                Later
              </button>
              <button
                (click)="installPwa()"
                class="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems" (onMoreClick)="moreMenuOpen = true"></app-bottom-nav>

      <!-- Profile Menu Modal -->
      <app-bottom-sheet [(isOpen)]="profileMenuOpen" title="Profile">
        <div class="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
          <app-avatar
            src="https://api.dicebear.com/9.x/avataaars/svg?seed={{ user()?.name }}&size=48"
            alt="Avatar"
            size="lg"
          ></app-avatar>
          <div>
            <p class="font-semibold text-slate-900">{{ user()?.name || 'User' }}</p>
            <p class="text-sm text-slate-500">{{ user()?.email || 'user@example.com' }}</p>
          </div>
        </div>
        <div class="space-y-1">
          <a
            routerLink="/user/support"
            class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <lucide-icon [img]="headphones" class="w-5 h-5 text-slate-600"></lucide-icon>
            <span class="text-slate-700">Support</span>
          </a>
          <button
            (click)="logout()"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-red-600"
          >
            <lucide-icon [img]="logOut" class="w-5 h-5"></lucide-icon>
            <span>Sign Out</span>
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
          <a
            routerLink="/products"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="store" class="w-6 h-6 text-purple-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Products</span>
          </a>
          <a
            routerLink="/help"
            class="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <lucide-icon [img]="helpCircle" class="w-6 h-6 text-slate-600"></lucide-icon>
            </div>
            <span class="text-sm text-slate-700">Help</span>
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
export class UserDashboardComponent implements OnInit {
  profileMenuOpen = false;
  moreMenuOpen = false;
  activeAccountIndex = signal<number>(0);

  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private accountService = inject(AccountService);
  private txState = inject(TransactionStateService);
  private notificationService = inject(NotificationService);

  user = this.authService.currentUser;
  greeting = signal<string>('Hello');
  totalBalance = this.accountService.totalBalanceState;
  monthlyChange = this.txState.monthlyChange;
  monthlyChangePercentage = signal<number>(0);
  accounts = this.accountService.accountsState;
  recentTransactions = this.txState.recentTransactions;
  monthlyIncome = this.txState.monthlyIncome;
  monthlyExpenses = this.txState.monthlyExpenses;
  notificationCount = signal<number>(0);
  loansEnabled = environment.features.loansEnabled;

  showInstallBanner = signal(false);
  private deferredPrompt: any = null;
  private dashboardLoadId = 0;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredPrompt = event;
    this.showInstallBanner.set(true);
  }

  ngOnInit() {
    this.dashboardLoadId += 1;
    const loadId = this.dashboardLoadId;
    const startedAt = Date.now();
    console.log('[UserDashboard] ngOnInit start', {
      loadId,
      userId: this.user()?._id,
      at: new Date().toISOString(),
    });
    this.updateGreeting();
    this.loadNotificationCount(loadId);
    console.log('[UserDashboard] Requesting accounts', { loadId });
    this.accountService.loadAccountsIntoState().subscribe({
      next: (data: Account[]) => {
        console.log('[UserDashboard] Accounts loaded', {
          loadId,
          count: data.length,
          elapsedMs: Date.now() - startedAt,
        });
        // Recalculate monthly change % after accounts arrive
        this.updateMonthlyChangePercentage();
      },
      error: (err) => {
        console.error('[UserDashboard] Accounts load error', {
          loadId,
          status: err?.status,
          message: err?.message,
          elapsedMs: Date.now() - startedAt,
        });
        this.toast.error('Failed to load accounts');
      },
    });

    console.log('[UserDashboard] Requesting transactions via shared state', { loadId });
    this.txState.loadTransactions().subscribe({
      next: (txs) => {
        console.log('[UserDashboard] Transactions loaded via shared state', {
          loadId,
          count: txs.length,
          elapsedMs: Date.now() - startedAt,
        });
        // Monthly income / expenses / recentTransactions are now computed signals
        // from txState – just update the change percentage
        this.updateMonthlyChangePercentage();
      },
      error: (err) => {
        console.error('[UserDashboard] Transactions load error', {
          loadId,
          status: err?.status,
          message: err?.message,
          elapsedMs: Date.now() - startedAt,
        });
        this.toast.error('Failed to load recent transactions');
      },
    });
  }

  private updateMonthlyChangePercentage(): void {
    const netChange = this.monthlyChange();
    if (this.totalBalance() > 0) {
      const previousBalance = this.totalBalance() - netChange;
      if (previousBalance > 0) {
        this.monthlyChangePercentage.set((netChange / previousBalance) * 100);
      } else {
        this.monthlyChangePercentage.set(100);
      }
    } else {
      this.monthlyChangePercentage.set(0);
    }
  }

  // normalizeTransactionsResponse removed – handled by TransactionStateService

  updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting.set('Good morning');
    else if (hour < 17) this.greeting.set('Good afternoon');
    else this.greeting.set('Good evening');
  }

  async installPwa() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showInstallBanner.set(false);
      }
      this.deferredPrompt = null;
    }
  }

  dismissInstall() {
    this.showInstallBanner.set(false);
  }

  // Icons
  bell = Bell;
  moreVertical = MoreVertical;
  trendingUp = TrendingUp;
  trendingDown = TrendingDown;
  send = Send;
  history = History;
  creditCard = CreditCard;
  landmark = Landmark;
  wallet = Wallet;
  piggyBank = PiggyBank;
  arrowDownLeft = ArrowDownLeft;
  arrowUpRight = ArrowUpRight;
  headphones = Headphones;
  logOut = LogOut;
  store = Store;
  helpCircle = HelpCircle;
  download = Download;

  navItems: NavItem[] = [
    { label: 'Home', icon: Home, route: '/user/dashboard' },
    { label: 'Accounts', icon: Wallet, route: '/user/accounts' },
    { label: 'Transfer', icon: Send, route: '/user/transfer' },
    { label: 'Cards', icon: CreditCard, route: '/user/cards' },
  ];

  private loadNotificationCount(loadId?: number): void {
    console.log('[UserDashboard] Requesting unread notification count', { loadId });
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        console.log('[UserDashboard] Unread count loaded', { loadId, count });
        this.notificationCount.set(Math.max(0, count || 0));
      },
      error: (err) => {
        console.error('[UserDashboard] Unread count load error', {
          loadId,
          status: err?.status,
          message: err?.message,
        });
        this.notificationCount.set(0);
      },
    });
  }

  notificationAriaLabel(): string {
    const count = this.notificationCount();
    return count > 0 ? `${count} unread notifications` : 'No unread notifications';
  }

  onAccountScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const index = Math.round(element.scrollLeft / element.offsetWidth);
    if (this.activeAccountIndex() !== index) {
      this.activeAccountIndex.set(index);
    }
  }

  getTxIcon(type: string): string {
    switch (type) {
      case 'deposit':
        return 'arrow-down-left';
      case 'withdrawal':
        return 'arrow-up-right';
      case 'transfer':
        return 'arrow-right-left';
      case 'payment':
        return 'shopping-bag';
      default:
        return 'history';
    }
  }

  isIncomingTransaction(tx: Transaction): boolean {
    return isIncomingTransaction(tx);
  }

  logout(): void {
    this.authService.logout();
  }
}
