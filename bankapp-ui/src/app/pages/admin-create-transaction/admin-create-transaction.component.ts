import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Loader } from 'lucide-angular';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppConfigService } from '../../services/app-config/app-config.service';

import { AccountService } from '../../services/account/account.service';
import { CardService } from '../../services/card/card.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService } from '../../services/transaction/transaction.service';

type AccountDropdownType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer-from'
  | 'transfer-to'
  | 'payment-from'
  | 'payment-to';

@Component({
  selector: 'app-admin-create-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule, TitleCasePipe],
  templateUrl: 'admin-create-transaction.component.html',
})
export class AdminCreateTransactionComponent {
  private fb = inject(FormBuilder);
  private appConfig = inject(AppConfigService);
  private accountService = inject(AccountService);
  private cardService = inject(CardService);
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly environment = environment;

  arrowLeft = ArrowLeft;
  loader = Loader;

  transactionForm: FormGroup = this.fb.group({
    type: ['deposit', Validators.required],
    fromAccountId: [''],
    toAccountId: [''],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
    // Transfer-specific fields
    recipientType: ['internal'],
    receiverIdentifier: [''],
    bankName: [this.appConfig.bankName()],
    accountHolderName: [''],
    // Payment-specific fields (source can be internal or external)
    sourceType: ['internal'],
    externalSourceAccount: [''],
    externalSourceBank: [''],
    externalSourceHolder: [''],
    // Card transaction fields
    cardId: [''],
    cardTransactionType: ['purchase'],
    merchantDetails: [''],
    // Date/Time fields
    date: [this.formatDate(new Date())],
    time: [''],
    // Depositor info (for deposit transactions)
    depositorName: [''],
    depositorId: [''],
  });

  accounts = signal<any[]>([]);
  cards = signal<any[]>([]);
  loading = signal(false);

  // Search functionality for account dropdowns
  accountSearchQuery = signal('');
  accountSearchResults = signal<any[]>([]);
  accountSearching = signal(false);
  showAccountDropdown = signal(false);
  accountInputByDropdown = signal<Record<AccountDropdownType, string>>({
    deposit: '',
    withdrawal: '',
    'transfer-from': '',
    'transfer-to': '',
    'payment-from': '',
    'payment-to': '',
  });
  private searchTimeout: any;

  // Search functionality for card dropdown
  cardSearchQuery = signal('');
  cardSearchResults = signal<any[]>([]);
  cardSearching = signal(false);
  showCardDropdown = signal(false);
  selectedCardDisplay = signal('');
  private cardSearchTimeout: any;

  // Track which dropdown is active
  activeDropdown = signal<AccountDropdownType | null>(null);

  transactionTypes: { value: string; label: string; icon: string }[] = [
    { value: 'deposit', label: 'Deposit', icon: 'D' },
    { value: 'withdrawal', label: 'Withdrawal', icon: 'W' },
    { value: 'transfer', label: 'Transfer', icon: 'T' },
    { value: 'payment', label: 'Payment', icon: 'P' },
    { value: 'card', label: 'Card', icon: 'C' },
  ];

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCards();
  }

  loadAccounts(): void {
    // Load initial accounts (limited set for display)
    this.accountService.getAllAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.accountSearchResults.set(accounts.slice(0, 20)); // Initial 20 for dropdown
      },
      error: () => {
        this.toast.error('Failed to load accounts');
      },
    });
  }

  private setAccountInputValue(dropdownType: AccountDropdownType, value: string): void {
    this.accountInputByDropdown.update((current) => ({
      ...current,
      [dropdownType]: value,
    }));
  }

  accountInputValue(dropdownType: AccountDropdownType): string {
    return this.accountInputByDropdown()[dropdownType] || '';
  }

  onAccountInput(dropdownType: AccountDropdownType, query: string): void {
    this.activeDropdown.set(dropdownType);
    this.showAccountDropdown.set(true);
    this.setAccountInputValue(dropdownType, query);
    this.searchAccounts(query);
  }

  searchAccounts(query: string): void {
    this.accountSearchQuery.set(query);

    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (query.length < 2) {
      // Show first 20 accounts if query too short
      this.accountSearchResults.set(this.accounts().slice(0, 20));
      this.accountSearching.set(false);
      return;
    }

    this.accountSearching.set(true);

    this.searchTimeout = setTimeout(() => {
      this.accountService.searchAccounts(query).subscribe({
        next: (results) => {
          this.accountSearchResults.set(results);
          this.accountSearching.set(false);
        },
        error: () => {
          this.accountSearching.set(false);
          this.toast.error('Search failed');
        },
      });
    }, 300);
  }

  selectAccount(accountId: string, dropdownType: AccountDropdownType): void {
    const account = this.accountSearchResults().find((a) => a._id === accountId);
    if (!account) return;

    // Update the appropriate form control
    if (dropdownType === 'deposit') {
      this.transactionForm.patchValue({ toAccountId: accountId });
    } else if (dropdownType === 'withdrawal') {
      this.transactionForm.patchValue({ fromAccountId: accountId });
    } else if (dropdownType === 'transfer-from' || dropdownType === 'payment-from') {
      this.transactionForm.patchValue({ fromAccountId: accountId });
    } else if (dropdownType === 'transfer-to' || dropdownType === 'payment-to') {
      this.transactionForm.patchValue({ toAccountId: accountId });
    }

    this.setAccountInputValue(dropdownType, this.getAccountDisplay(account));
    this.showAccountDropdown.set(false);
    this.activeDropdown.set(null);
  }

  getAccountDisplay(account: any): string {
    const userName = account.userName || account.user?.name || 'Unknown';
    const userEmail = account.userEmail || account.user?.email || '';
    const type = account.type || 'Account';
    const last4 = account.accountNumber?.slice(-4) || '****';
    return `${userName} (${userEmail}) - ${type} ****${last4}`;
  }

  openDropdown(type: AccountDropdownType): void {
    this.activeDropdown.set(type);
    this.showAccountDropdown.set(true);
    const query = this.accountInputValue(type).trim();
    if (query.length >= 2) {
      this.searchAccounts(query);
      return;
    }
    this.accountSearchQuery.set('');
    this.accountSearchResults.set(this.accounts().slice(0, 20));
  }

  closeDropdown(): void {
    this.showAccountDropdown.set(false);
    this.activeDropdown.set(null);
  }

  loadCards(): void {
    this.cardService.getAllCards().subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.cardSearchResults.set(cards.slice(0, 20));
      },
      error: () => {
        this.toast.error('Failed to load cards');
      },
    });
  }

  searchCards(query: string): void {
    this.cardSearchQuery.set(query);

    if (this.cardSearchTimeout) {
      clearTimeout(this.cardSearchTimeout);
    }

    // If query is empty, show initial cards
    if (!query.trim()) {
      this.cardSearchResults.set(this.cards().slice(0, 20));
      this.cardSearching.set(false);
      return;
    }

    this.cardSearching.set(true);

    this.cardSearchTimeout = setTimeout(() => {
      this.cardService.searchCards(query).subscribe({
        next: (results) => {
          this.cardSearchResults.set(results);
          this.cardSearching.set(false);
        },
        error: () => {
          this.cardSearching.set(false);
          this.toast.error('Card search failed');
        },
      });
    }, 300);
  }

  selectCard(cardId: string): void {
    const card = this.cardSearchResults().find((c) => c._id === cardId);
    if (!card) return;

    this.transactionForm.patchValue({ cardId: cardId });

    // Update display
    const userName = card.userName || 'Unknown';
    const cardType = card.cardType || 'Card';
    const last4 = card.cardNumber?.slice(-4) || '****';
    this.selectedCardDisplay.set(`${userName} - ${cardType} ****${last4}`);

    this.showCardDropdown.set(false);
  }

  openCardDropdown(): void {
    this.showCardDropdown.set(true);
    this.cardSearchQuery.set('');
    this.cardSearchResults.set(this.cards().slice(0, 20));
  }

  closeCardDropdown(): void {
    this.showCardDropdown.set(false);
  }

  getCardDisplay(card: any): string {
    const lastFour = card.cardNumber?.slice(-4) || '****';
    const type = card.cardType || 'Unknown';
    const holder = card.account?.user
      ? `${card.account.user.firstName || ''} ${card.account.user.lastName || ''}`.trim()
      : '';
    return `${type} (****${lastFour})${holder ? ` - ${holder}` : ''}`;
  }

  setAmount(amount: number): void {
    this.transactionForm.patchValue({ amount });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      Object.values(this.transactionForm.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    // Additional validation based on type
    const type = this.transactionForm.get('type')?.value;
    if (!this.isFormValidForType(type)) {
      this.toast.error('Please fill in all required fields for this transaction type');
      return;
    }

    this.loading.set(true);
    const formValue = this.transactionForm.value;

    // Handle different transaction types
    if (type === 'card') {
      this.submitCardTransaction(formValue);
    } else {
      this.submitAccountTransaction(formValue);
    }
  }

  private isFormValidForType(type: string): boolean {
    const form = this.transactionForm;

    switch (type) {
      case 'deposit':
        // Deposit: toAccountId is the receiving account
        const toAccountId = form.get('toAccountId')?.value;
        console.log('[ADMIN-CREATE-TRANSACTION] Deposit validation:', {
          toAccountId,
          toAccountIdType: typeof toAccountId,
          toAccountIdTruthy: !!toAccountId,
          amount: form.get('amount')?.value,
        });
        return !!(toAccountId && form.get('amount')?.value > 0);
      case 'withdrawal':
        // Withdrawal: fromAccountId is the source account
        return !!(form.get('fromAccountId')?.value && form.get('amount')?.value > 0);
      case 'transfer':
        // Transfer: fromAccountId is source, recipient can be internal (toAccountId) or external (receiverIdentifier)
        if (!form.get('fromAccountId')?.value || form.get('amount')?.value <= 0) return false;
        const transferRecipientType = form.get('recipientType')?.value;
        if (transferRecipientType === 'internal') {
          return !!form.get('toAccountId')?.value;
        } else {
          return !!form.get('receiverIdentifier')?.value;
        }
      case 'payment':
        // Payment: flexible source and recipient (both can be internal or external)
        if (form.get('amount')?.value <= 0) return false;

        // Check source (from)
        const sourceType = form.get('sourceType')?.value;
        const sourceValid =
          sourceType === 'internal'
            ? !!form.get('fromAccountId')?.value
            : !!form.get('externalSourceAccount')?.value;

        // Check recipient (to)
        const paymentRecipientType = form.get('recipientType')?.value;
        const recipientValid =
          paymentRecipientType === 'internal'
            ? !!form.get('toAccountId')?.value
            : !!form.get('receiverIdentifier')?.value;

        return sourceValid && recipientValid;
      case 'card':
        return !!(
          form.get('cardId')?.value &&
          form.get('amount')?.value > 0 &&
          form.get('merchantDetails')?.value
        );
      default:
        return false;
    }
  }

  private submitCardTransaction(formValue: any): void {
    const selectedCard = this.cards().find((c) => c._id === formValue.cardId);
    if (!selectedCard) {
      this.loading.set(false);
      this.toast.error('Selected card not found');
      return;
    }

    // Format expiry date as MM/YY (backend expects this format)
    let expiryDateFormatted = '';
    if (selectedCard.expiryDate) {
      const expDate = new Date(selectedCard.expiryDate);
      const month = String(expDate.getMonth() + 1).padStart(2, '0');
      const year = String(expDate.getFullYear()).slice(-2);
      expiryDateFormatted = `${month}/${year}`;
    }

    const payload = {
      cardId: formValue.cardId,
      accountId: selectedCard.account?._id || selectedCard.account,
      cardNumber: selectedCard.cardNumber,
      expiryDate: expiryDateFormatted,
      cvv: selectedCard.cvv,
      amount: formValue.amount,
      merchantDetails: formValue.merchantDetails,
      transactionType: formValue.cardTransactionType,
    };

    console.log('[ADMIN-CREATE-TRANSACTION] Submitting card transaction:', {
      hasCardNumber: !!payload.cardNumber,
      hasExpiryDate: !!payload.expiryDate,
      expiryDateValue: payload.expiryDate,
      hasCvv: !!payload.cvv,
      amount: payload.amount,
      hasMerchantDetails: !!payload.merchantDetails,
      transactionType: payload.transactionType,
      cardId: payload.cardId,
    });

    // Validate before sending
    if (!payload.cardNumber || !payload.expiryDate || !payload.cvv) {
      console.error('[ADMIN-CREATE-TRANSACTION] Missing card details:', {
        cardNumber: payload.cardNumber,
        expiryDate: payload.expiryDate,
        cvv: payload.cvv ? '[REDACTED]' : undefined,
      });
      this.loading.set(false);
      this.toast.error('Card details incomplete. Please select a valid card.');
      return;
    }

    this.transactionService.createCardTransaction(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Card transaction processed successfully!');
        this.resetForm();
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 1500);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to process card transaction');
      },
    });
  }

  private submitAccountTransaction(formValue: any): void {
    // Combine date and time
    let transactionDate = formValue.date ? new Date(formValue.date) : new Date();
    if (formValue.time) {
      const [hours, minutes] = formValue.time.split(':').map(Number);
      transactionDate.setHours(hours, minutes);
    }

    const payload: any = {
      amount: formValue.amount,
      description: formValue.description || '',
      type: formValue.type,
      date: transactionDate.toISOString(),
    };

    if (formValue.type === 'transfer' || formValue.type === 'payment') {
      const requests = this.buildSettlementRequests(formValue, transactionDate);
      if (!requests.length) {
        this.loading.set(false);
        this.toast.error('Invalid payment/transfer account setup');
        return;
      }
      const request$ = requests.length === 1 ? requests[0] : forkJoin(requests);
      this.submitAccountRequest(request$);
      return;
    }

    // Debug: Log form values before building payload
    console.log('[ADMIN-CREATE-TRANSACTION] Form values:', {
      type: formValue.type,
      toAccountId: formValue.toAccountId,
      fromAccountId: formValue.fromAccountId,
      amount: formValue.amount,
    });

    // Set accountId based on transaction type
    if (formValue.type === 'deposit') {
      // Deposit: accountId is the receiving account (toAccountId)
      if (!formValue.toAccountId) {
        console.error('[ADMIN-CREATE-TRANSACTION] Deposit missing toAccountId!');
        this.loading.set(false);
        this.toast.error('Please select a receiving account for the deposit');
        return;
      }
      payload.accountId = formValue.toAccountId;
      // Include depositor info for record-keeping
      if (formValue.depositorName) {
        payload.depositorName = formValue.depositorName;
      }
      if (formValue.depositorId) {
        payload.depositorId = formValue.depositorId;
      }
    } else if (formValue.type === 'withdrawal') {
      // Withdrawal: accountId is the source account (fromAccountId)
      payload.accountId = formValue.fromAccountId;
    }

    console.log('[ADMIN-CREATE-TRANSACTION] Sending payload:', JSON.stringify(payload, null, 2));

    this.submitAccountRequest(this.transactionService.createTransaction(payload));
  }

  private submitAccountRequest(request$: Observable<any>): void {
    request$.subscribe({
      next: (response: any) => {
        console.log('[ADMIN-CREATE-TRANSACTION] Success response:', response);
        this.loading.set(false);
        this.toast.success('Transaction created successfully!');
        this.resetForm();
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 1500);
      },
      error: (err: any) => {
        console.error('[ADMIN-CREATE-TRANSACTION] Error response:', err);
        console.error('[ADMIN-CREATE-TRANSACTION] Error status:', err.status);
        console.error('[ADMIN-CREATE-TRANSACTION] Error body:', err.error);
        this.loading.set(false);
        const errorMsg = err.error?.message || 'Failed to create transaction';
        const errorDetails = err.error?.details || '';
        console.error('[ADMIN-CREATE-TRANSACTION] Error details:', errorMsg, errorDetails);
        this.toast.error(errorMsg);
      },
    });
  }

  private buildSettlementRequests(formValue: any, transactionDate: Date): Observable<any>[] {
    const amount = Number(formValue.amount);
    const date = transactionDate.toISOString();
    const description = (formValue.description || '').trim();
    const requests: Observable<any>[] = [];
    const typeLabel = formValue.type === 'transfer' ? 'Transfer' : 'Payment';

    const fromAccountId = formValue.fromAccountId;
    const toAccountId = formValue.toAccountId;
    const sourceType = formValue.sourceType || 'internal';
    const recipientType = formValue.recipientType || 'internal';
    const isInternalSource = formValue.type === 'transfer' ? true : sourceType === 'internal';
    const isInternalRecipient = recipientType === 'internal';

    if (
      isInternalSource &&
      isInternalRecipient &&
      fromAccountId &&
      toAccountId &&
      fromAccountId === toAccountId
    ) {
      return [];
    }

    if (isInternalSource && fromAccountId) {
      const counterpartySuffix = isInternalRecipient ? this.getAccountSuffix(toAccountId) : '';
      const debitDescription =
        description ||
        `${typeLabel} debit${counterpartySuffix ? ` to account ${counterpartySuffix}` : ''}`;
      requests.push(
        this.transactionService.createTransaction({
          amount,
          description: debitDescription,
          type: 'withdrawal',
          date,
          accountId: fromAccountId,
        }),
      );
    }

    if (isInternalRecipient && toAccountId) {
      const counterpartySuffix = isInternalSource ? this.getAccountSuffix(fromAccountId) : '';
      const creditDescription =
        description ||
        `${typeLabel} credit${counterpartySuffix ? ` from account ${counterpartySuffix}` : ''}`;
      requests.push(
        this.transactionService.createTransaction({
          amount,
          description: creditDescription,
          type: 'deposit',
          date,
          accountId: toAccountId,
        }),
      );
    }

    return requests;
  }

  private getAccountSuffix(accountId: string): string {
    const account = this.accounts().find((item) => item._id === accountId);
    const accountNumber = account?.accountNumber || '';
    return accountNumber ? `****${accountNumber.slice(-4)}` : '';
  }

  private resetForm(): void {
    this.transactionForm.reset({
      type: 'deposit',
      fromAccountId: '',
      toAccountId: '',
      amount: null,
      description: '',
      recipientType: 'internal',
      receiverIdentifier: '',
      bankName: this.appConfig.bankName(),
      accountHolderName: '',
      sourceType: 'internal',
      externalSourceAccount: '',
      externalSourceBank: '',
      externalSourceHolder: '',
      cardId: '',
      cardTransactionType: 'purchase',
      merchantDetails: '',
      date: this.formatDate(new Date()),
      time: '',
      depositorName: '',
      depositorId: '',
    });
    this.accountInputByDropdown.set({
      deposit: '',
      withdrawal: '',
      'transfer-from': '',
      'transfer-to': '',
      'payment-from': '',
      'payment-to': '',
    });
    this.accountSearchResults.set([]);
  }
}
