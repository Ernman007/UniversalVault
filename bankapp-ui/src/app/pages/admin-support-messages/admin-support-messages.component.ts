import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Send, Image } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AccountService } from '../../services/account/account.service';
import { AdminService } from '../../services/admin/admin.service';
import { ToastService } from '../../services/notification/toast.service';
import { PendingAccountService } from '../../services/pending-account/pending-account.service';
import { ImagePreviewModalComponent } from '../../ui/image-preview-modal/image-preview-modal.component';

@Component({
  selector: 'app-admin-support-messages',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, FormsModule, ImagePreviewModalComponent],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center gap-4 mb-3">
            <a
              routerLink="/admin/dashboard"
              class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors touch-active"
            >
              <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            </a>
            <h1 class="text-lg font-bold">Support Tickets</h1>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-4">
          @if (isLoading()) {
            <p class="text-center text-slate-500 py-10">Loading...</p>
          } @else if (tickets().length === 0) {
            <p class="text-center text-slate-500 py-10 bg-white rounded-xl">
              No open support tickets.
            </p>
          } @else {
            @for (ticket of tickets(); track ticket._id) {
              <div class="bg-white rounded-xl shadow-sm p-4">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-bold text-slate-900">{{ ticket.subject }}</h3>
                    <p class="text-xs text-slate-500">
                      From: {{ ticket.name || 'Guest' }} | {{ ticket.email }}
                    </p>
                  </div>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    [class.bg-amber-100]="ticket.status === 'open'"
                    [class.text-amber-700]="ticket.status === 'open'"
                    [class.bg-emerald-100]="ticket.status !== 'open'"
                    [class.text-emerald-700]="ticket.status !== 'open'"
                  >
                    {{ ticket.status | titlecase }}
                  </span>
                </div>

                @if (ticket.message) {
                  <p
                    class="text-sm text-slate-700 mb-4 bg-slate-50 p-3 rounded-lg whitespace-pre-line"
                  >
                    {{ ticket.message }}
                  </p>
                }

                <!-- Account Request Details - Different UI for existing vs new users -->
                @if (ticket.messageType === 'account-request') {
                  @if (ticket.metadata?.isExistingUser || ticket.user) {
                    <!-- Existing User Request -->
                    <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
                      <div class="flex items-center gap-2 mb-3">
                        <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Existing User</span>
                        <h4 class="text-sm font-semibold text-emerald-800">Additional Account Request</h4>
                      </div>
                      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div class="flex justify-between">
                          <span class="text-emerald-600">User ID:</span>
                          <span class="text-slate-700 font-medium text-xs truncate max-w-[120px]">{{
                            ticket.metadata?.userId || ticket.user?._id || ticket.user || 'N/A'
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-emerald-600">Account Type:</span>
                          <span class="text-slate-700 font-medium capitalize">{{
                            ticket.metadata?.accountType || getParsedField(ticket, 'type')
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-emerald-600">Initial Deposit:</span>
                          <span class="text-slate-700 font-medium">{{ getInitialDeposit(ticket) | currency }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-emerald-600">Source Account:</span>
                          <span class="text-slate-700 font-medium text-xs">{{
                            getSourceAccountDisplay(ticket)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <!-- New User Request -->
                    <div class="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                      <div class="flex items-center gap-2 mb-3">
                        <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">New User</span>
                        <h4 class="text-sm font-semibold text-blue-800">New Account Opening Request</h4>
                      </div>
                      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div class="flex justify-between">
                          <span class="text-blue-600">Phone:</span>
                          <span class="text-slate-700 font-medium">{{
                            getParsedField(ticket, 'phone')
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-blue-600">Account Type:</span>
                          <span class="text-slate-700 font-medium capitalize">{{
                            getParsedField(ticket, 'type')
                          }}</span>
                        </div>
                        <div class="col-span-2 flex justify-between">
                          <span class="text-blue-600">Address:</span>
                          <span class="text-slate-700 font-medium text-right">{{
                            getParsedField(ticket, 'address')
                          }}</span>
                        </div>
                        @if (getParsedField(ticket, 'dob')) {
                          <div class="col-span-2 flex justify-between">
                            <span class="text-blue-600">Date of Birth:</span>
                            <span class="text-slate-700 font-medium">{{
                              getParsedField(ticket, 'dob')
                            }}</span>
                          </div>
                        }
                      </div>

                      @if (ticket.metadata?.identificationDocument) {
                        <div class="mt-3 pt-3 border-t border-blue-200">
                          <button
                            (click)="openImagePreview(ticket.metadata.identificationDocument)"
                            class="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            <lucide-icon [img]="imageIcon" class="w-4 h-4"></lucide-icon>
                            View Submitted ID Document
                          </button>
                        </div>
                      }
                    </div>
                  }
                }

                <!-- Reply Input -->
                @if (ticket.status !== 'closed') {
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="replyTexts[ticket._id]"
                      placeholder="Type your reply..."
                      class="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700"
                      (click)="reply(ticket._id)"
                    >
                      <lucide-icon [img]="sendIcon" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>

                  @if (ticket.messageType === 'account-request') {
                    <div class="flex gap-2 mt-2">
                      <button
                        class="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
                        (click)="approveAndCreateAccount(ticket)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Approve & Create Account
                      </button>
                      <button
                        class="px-3 py-2.5 bg-rose-100 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-200"
                        (click)="reject(ticket._id)"
                      >
                        Reject
                      </button>
                    </div>
                  }
                }
              </div>
            }
          }
        </div>
      </div>

      <!-- Image Preview Modal -->
      <app-image-preview-modal
        [isOpen]="showImagePreview()"
        [imageUrl]="selectedImage()"
        (closed)="closeImagePreview()"
      >
      </app-image-preview-modal>
    </div>
  `,
})
export class AdminSupportMessagesComponent implements OnInit {
  arrowLeft = ArrowLeft;
  sendIcon = Send;
  imageIcon = Image;

  private adminService = inject(AdminService);
  private accountService = inject(AccountService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private pendingAccountService = inject(PendingAccountService);

  tickets = signal<any[]>([]);
  isLoading = signal(true);
  replyTexts: Record<string, string> = {};
  showImagePreview = signal(false);
  selectedImage = signal('');

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.adminService.getSupportMessages().subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && typeof res === 'object') {
          list = res.data || res.messages || [];
        }
        if (!Array.isArray(list)) {
          list = [];
        }
        this.tickets.set(list.filter((t: any) => !['closed', 'approved', 'rejected'].includes(t.status)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load support messages:', err);
        this.isLoading.set(false);
      },
    });
  }

  getParsedField(ticket: any, field: string): string {
    const metadata = ticket?.metadata || {};
    if (field === 'phone' && metadata.phone) return metadata.phone;
    if (field === 'type' && metadata.accountType) return metadata.accountType;
    if (field === 'address' && metadata.address) return metadata.address;
    if (field === 'dob' && metadata.dob) return metadata.dob;

    if (!ticket.message) return field === 'dob' ? '' : 'N/A';
    const msg = ticket.message;

    switch (field) {
      case 'phone':
        const phoneMatch = msg.match(/Phone:\s*([^\n-]+)/);
        return phoneMatch ? phoneMatch[1].trim() : 'N/A';
      case 'type':
        const typeMatch = msg.match(/Account Type:\s*([^\n-]+)/);
        return typeMatch ? typeMatch[1].trim() : 'N/A';
      case 'address':
        const addressMatch = msg.match(/Address:\s*([^\n-]+)/);
        return addressMatch ? addressMatch[1].trim() : 'N/A';
      case 'dob':
        const dobMatch = msg.match(/Date of Birth:\s*([^\n-]+)/);
        return dobMatch ? dobMatch[1].trim() : '';
      default:
        return 'N/A';
    }
  }

  openImagePreview(imageUrl: string) {
    // The backend serves files at /uploads/:filename (not under /api)
    // imageUrl is stored as '/uploads/filename.jpg' in the database
    let normalizedUrl: string;
    if (imageUrl.startsWith('/uploads/')) {
      // Remove /api prefix from apiUrl to get base URL, then append /uploads path
      const baseUrl = environment.apiUrl.replace('/api', '');
      normalizedUrl = `${baseUrl}${imageUrl}`;
    } else {
      normalizedUrl = imageUrl;
    }
    console.log('[AdminSupportMessages] Opening image preview:', {
      originalUrl: imageUrl,
      normalizedUrl,
      apiUrl: environment.apiUrl
    });
    this.selectedImage.set(normalizedUrl);
    this.showImagePreview.set(true);
  }

  closeImagePreview() {
    this.showImagePreview.set(false);
    this.selectedImage.set('');
  }

  getInitialDeposit(ticket: any): number {
    // Handle both string and number values
    const deposit = ticket.metadata?.initialDeposit;
    if (deposit === undefined || deposit === null) return 0;
    return typeof deposit === 'string' ? parseFloat(deposit) || 0 : deposit;
  }

  getSourceAccountDisplay(ticket: any): string {
    const sourceId = ticket.metadata?.sourceAccountId;
    if (!sourceId) return 'No transfer needed';
    // Show truncated account ID - in future could fetch account details
    return `Account ****${sourceId.slice(-4)}`;
  }

  reply(id: string) {
    const txt = this.replyTexts[id];
    if (!txt?.trim()) return;
    this.adminService.replyToSupportMessage(id, txt).subscribe({
      next: () => {
        this.toast.success('Reply sent');
        this.replyTexts[id] = '';
      },
      error: () => this.toast.error('Failed to send reply'),
    });
  }

  resolve(id: string) {
    this.adminService.resolveMessage(id).subscribe({
      next: () => {
        this.toast.success('Message dismissed');
        this.tickets.update((t) => t.filter((x) => x._id !== id));
      },
      error: () => this.toast.error('Failed to dismiss message'),
    });
  }

  reject(id: string) {
    const reason = prompt('Please provide a reason for rejecting this account request:');
    if (reason === null) return;
    this.adminService.rejectMessage(id, reason).subscribe({
      next: () => {
        this.toast.success('Account request rejected');
        this.tickets.update((t) => t.filter((x) => x._id !== id));
      },
      error: () => this.toast.error('Failed to reject request'),
    });
  }

  approveAndCreateAccount(ticket: any) {
    // Handle existing user differently - create account directly
    // Check both metadata and user field at document level
    const isExistingUser = ticket.metadata?.isExistingUser || ticket.user;
    const userId = ticket.metadata?.userId || ticket.user?._id || ticket.user;

    if (isExistingUser && userId) {
      this.adminService.setAccountRequestStatus(ticket._id, 'approved').subscribe({
        next: () => {
          // Create account for existing user
          const accountData = {
            userId: typeof userId === 'string' ? userId : userId._id,
            type: ticket.metadata?.accountType || 'checking',
            initialDeposit: ticket.metadata?.initialDeposit || 0,
            sourceAccountId: ticket.metadata?.sourceAccountId,
            supportMessageId: ticket._id,
          };

          this.accountService.createAccount(accountData).subscribe({
            next: () => {
              this.toast.success('Account created successfully for existing user');
              this.tickets.update((t) => t.filter((x) => x._id !== ticket._id));
            },
            error: (err: any) => {
              this.toast.error(err?.error?.message || 'Failed to create account');
            },
          });
        },
        error: () => {
          this.toast.error('Failed to update request status');
        },
      });
      return;
    }

    // New user - redirect to create-account page
    // Don't change status yet - will be set to 'approved' when account is actually created
    let parsedData: any = {};

    if (ticket.metadata?.phone && ticket.metadata?.accountType) {
      parsedData = {
        name: ticket.name,
        email: ticket.email,
        password: ticket.password || '',
        phone: ticket.metadata.phone || '',
        address: ticket.metadata.address || '',
        dob: ticket.metadata.dob || '',
        accountType: ticket.metadata.accountType || 'checking',
        initialDeposit: ticket.metadata.initialDeposit || 0,
        supportMessageId: ticket._id,
      };
    } else if (ticket.message) {
      const msg = ticket.message;
      const phoneMatch = msg.match(/Phone:\s*([^\n-]+)/);
      const typeMatch = msg.match(/Account Type:\s*([^\n-]+)/);
      const addressMatch = msg.match(/Address:\s*([^\n-]+)/);
      const dobMatch = msg.match(/Date of Birth:\s*([^\n-]+)/);
      const depositMatch = msg.match(/Initial Deposit:\s*([\d.]+)/);

      parsedData = {
        name: ticket.name,
        email: ticket.email,
        password: ticket.password || '',
        phone: phoneMatch ? phoneMatch[1].trim() : '',
        address: addressMatch ? addressMatch[1].trim() : '',
        dob: dobMatch ? dobMatch[1].trim() : '',
        accountType: typeMatch ? typeMatch[1].trim() : 'checking',
        initialDeposit: depositMatch ? parseFloat(depositMatch[1]) : 0,
        supportMessageId: ticket._id,
      };
    } else {
      parsedData = {
        name: ticket.name,
        email: ticket.email,
        password: ticket.password || '',
        phone: '',
        address: '',
        dob: '',
        accountType: 'checking',
        initialDeposit: 0,
        supportMessageId: ticket._id,
      };
    }

    this.pendingAccountService.setPendingData(parsedData);
    this.router.navigate(['/admin/create-account']);
  }
}
