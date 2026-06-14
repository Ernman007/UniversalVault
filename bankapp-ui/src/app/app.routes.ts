import { Routes } from '@angular/router';

import { adminGuard } from './guards/admin/admin.guard';
import { authGuard } from './guards/auth/auth.guard';
import { cardPinGuard } from './guards/card-pin/card-pin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  {
    path: 'landing',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'open-account',
    loadComponent: () =>
      import('./pages/open-account/open-account.component').then((m) => m.OpenAccountComponent),
  },
  {
    path: 'user/open-account',
    loadComponent: () =>
      import('./pages/open-account/open-account.component').then((m) => m.OpenAccountComponent),
    canActivate: [authGuard],
  },
  { path: 'products', redirectTo: 'user/dashboard', pathMatch: 'full' },
  {
    path: 'user/dashboard',
    loadComponent: () =>
      import('./pages/user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent,
      ),
    canActivate: [authGuard],
  },
  { path: 'help', redirectTo: 'user/support', pathMatch: 'full' },
  {
    path: 'user/cards',
    loadComponent: () =>
      import('./pages/user-cards/user-cards.component').then((m) => m.UserCardsComponent),
    canActivate: [authGuard, cardPinGuard],
  },
  {
    path: 'user/cards/pin-setup',
    loadComponent: () =>
      import('./pages/user-cards/user-cards.component').then((m) => m.UserCardsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'user/cards/pin-entry',
    loadComponent: () =>
      import('./pages/user-cards/user-cards.component').then((m) => m.UserCardsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'user/transfers',
    redirectTo: 'user/transfer',
    pathMatch: 'full',
  },
  {
    path: 'user/transfer',
    loadComponent: () =>
      import('./pages/user-transfers/user-transfers.component').then(
        (m) => m.UserTransfersComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user/transactions',
    redirectTo: 'user/history',
    pathMatch: 'full',
  },
  {
    path: 'user/history',
    loadComponent: () =>
      import('./pages/user-transactions/user-transactions.component').then(
        (m) => m.UserTransactionsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user/loans',
    loadComponent: () =>
      import('./pages/user-loans/user-loans.component').then((m) => m.UserLoansComponent),
    canActivate: [authGuard],
  },
  {
    path: 'user/notifications',
    loadComponent: () =>
      import('./pages/user-notifications/user-notifications.component').then(
        (m) => m.UserNotificationsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user/notifications/:id',
    loadComponent: () =>
      import('./pages/notification-detail/notification-detail.component').then(
        (m) => m.NotificationDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user/support',
    loadComponent: () =>
      import('./pages/user-support/user-support.component').then((m) => m.UserSupportComponent),
    canActivate: [authGuard],
  },
  {
    path: 'user/support/:id',
    loadComponent: () =>
      import('./pages/support-ticket-detail/support-ticket-detail.component').then(
        (m) => m.SupportTicketDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    canActivate: [adminGuard],
  },

  // Admin sub-routes
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./pages/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/edit-user/:id',
    loadComponent: () =>
      import('./pages/admin-edit-user/admin-edit-user.component').then((m) => m.AdminEditUserComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/create-user',
    loadComponent: () =>
      import('./pages/admin-create-user/admin-create-user.component').then(
        (m) => m.AdminCreateUserComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/create-account',
    loadComponent: () =>
      import('./pages/admin-create-account/admin-create-account.component').then(
        (m) => m.AdminCreateAccountComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/create-transaction',
    loadComponent: () =>
      import('./pages/admin-create-transaction/admin-create-transaction.component').then(
        (m) => m.AdminCreateTransactionComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/transfer-requests',
    loadComponent: () =>
      import('./pages/admin-transfer-requests/admin-transfer-requests.component').then(
        (m) => m.AdminTransferRequestsComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/card-requests',
    loadComponent: () =>
      import('./pages/admin-card-requests/admin-card-requests.component').then(
        (m) => m.AdminCardRequestsComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/support-messages',
    loadComponent: () =>
      import('./pages/admin-support-messages/admin-support-messages.component').then(
        (m) => m.AdminSupportMessagesComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/tickets',
    loadComponent: () =>
      import('./pages/admin-support-tickets/admin-support-tickets.component').then(
        (m) => m.AdminSupportTicketsComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/tickets/:id',
    loadComponent: () =>
      import('./pages/support-ticket-detail/support-ticket-detail.component').then(
        (m) => m.SupportTicketDetailComponent,
      ),
    canActivate: [adminGuard],
  },

  // Legacy/user redirect
  {
    path: 'user/accounts',
    loadComponent: () =>
      import('./pages/user-accounts/user-accounts.component').then((m) => m.UserAccountsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'user/account/:id',
    loadComponent: () =>
      import('./pages/account-detail/account-detail.component').then(
        (m) => m.AccountDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user/accounts/:id',
    loadComponent: () =>
      import('./pages/account-detail/account-detail.component').then(
        (m) => m.AccountDetailComponent,
      ),
    canActivate: [authGuard],
  },

  // Wildcard — catch-all for undefined routes
  { path: '**', redirectTo: 'landing' },
];
