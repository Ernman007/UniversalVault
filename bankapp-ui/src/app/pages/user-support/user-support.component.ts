import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, MessageSquare, Plus } from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';
import { SupportService, SupportTicket } from '../../services/support/support.service';

@Component({
  selector: 'app-user-support',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-4">
              <a
                routerLink="/user/dashboard"
                class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors"
              >
                <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
              </a>
              <h1 class="text-lg font-bold">Support</h1>
            </div>
            <button
              (click)="isCreating.set(true)"
              *ngIf="!isCreating()"
              class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <lucide-icon [img]="plus" class="w-5 h-5"></lucide-icon>
            </button>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-4">
          @if (isCreating()) {
            <div class="bg-white rounded-xl shadow-sm p-4">
              <h2 class="font-bold text-slate-900 mb-4">Create Support Ticket</h2>
              <form [formGroup]="ticketForm" (ngSubmit)="createTicket()" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    formControlName="subject"
                    class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    formControlName="category"
                    class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="account">Account Issue</option>
                    <option value="card">Card Issue</option>
                    <option value="loan">Loan Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    formControlName="description"
                    rows="3"
                    class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  ></textarea>
                </div>
                <div class="flex gap-3">
                  <button
                    type="button"
                    (click)="isCreating.set(false)"
                    class="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    [disabled]="ticketForm.invalid || isSubmitting"
                    type="submit"
                    class="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl disabled:bg-slate-300"
                  >
                    {{ isSubmitting ? 'Creating...' : 'Submit Ticket' }}
                  </button>
                </div>
              </form>
            </div>
          } @else {
            @if (isLoading()) {
              <p class="text-center text-slate-500 py-10">Loading...</p>
            } @else if (loadError()) {
              <div class="text-center py-10 bg-white rounded-xl">
                <div
                  class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <lucide-icon [img]="messageSquare" class="w-6 h-6 text-red-400"></lucide-icon>
                </div>
                <p class="text-slate-700 font-medium mb-1">Could not load tickets</p>
                <p class="text-sm text-slate-500 mb-4">{{ loadError() }}</p>
                <button
                  (click)="loadTickets()"
                  class="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            } @else if (tickets().length === 0) {
              <div class="text-center py-10 bg-white rounded-xl">
                <lucide-icon
                  [img]="messageSquare"
                  class="w-10 h-10 text-slate-300 mx-auto mb-3"
                ></lucide-icon>
                <p class="text-slate-500 font-medium whitespace-pre-wrap">
                  You don't have any support tickets.
                </p>
              </div>
            } @else {
              @for (ticket of tickets(); track ticket._id) {
                <a
                  [routerLink]="['/user/support', ticket._id]"
                  class="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-100"
                >
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-slate-900">{{ ticket.subject }}</h3>
                    <span
                      class="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shrink-0"
                      [ngClass]="{
                        'bg-amber-100 text-amber-700': ticket.status === 'open',
                        'bg-blue-100 text-blue-700': ticket.status === 'pending',
                        'bg-emerald-100 text-emerald-700': ticket.status === 'resolved',
                        'bg-slate-100 text-slate-600': ticket.status === 'closed',
                      }"
                    >
                      {{ ticket.status }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mb-2">
                    {{ ticket.category | titlecase }} &bull;
                    {{ ticket.createdAt | date: 'mediumDate' }}
                  </p>
                  <p class="text-sm text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded">
                    {{ ticket.description }}
                  </p>
                </a>
              }
              <div class="flex items-center justify-between pt-1">
                <button
                  type="button"
                  (click)="goToPreviousPage()"
                  [disabled]="currentPage() === 1 || isLoading()"
                  class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <p class="text-xs text-slate-500">{{ pageSummary() }}</p>
                <button
                  type="button"
                  (click)="goToNextPage()"
                  [disabled]="!hasNextPage() || isLoading()"
                  class="px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class UserSupportComponent implements OnInit {
  arrowLeft = ArrowLeft;
  messageSquare = MessageSquare;
  plus = Plus;

  private fb = inject(FormBuilder);
  private supportService = inject(SupportService);
  private toastService = inject(ToastService);

  tickets = signal<SupportTicket[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  loadError = signal('');
  currentPage = signal(1);
  totalTickets = signal(0);
  hasNextPage = signal(false);
  isSubmitting = false;
  readonly pageSize = 10;

  ticketForm = this.fb.group({
    subject: ['', Validators.required],
    description: ['', Validators.required],
    category: ['technical', Validators.required],
  });

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.loadError.set('');
    this.supportService
      .getUserTickets({ page: this.currentPage(), limit: this.pageSize })
      .subscribe({
        next: (res: any) => {
          console.log('[UserSupportComponent] loadTickets raw response:', res);
          let list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && typeof res === 'object') {
            list = res.items || res.data?.tickets || res.tickets || res.data || [];
          }
          console.log('[UserSupportComponent] parsed ticket array:', list);
          const totalFromMeta = Number(res?.meta?.total);
          const total = Number.isFinite(totalFromMeta) ? totalFromMeta : list.length;
          this.tickets.set(list);
          this.totalTickets.set(total);
          this.hasNextPage.set(this.currentPage() * this.pageSize < total);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.loadError.set(err.error?.message || 'Failed to load support tickets.');
        },
      });
  }

  createTicket() {
    if (this.ticketForm.invalid) return;
    this.isSubmitting = true;

    // Using explicit unknown and cast to avoid deep type checking issues since value can contain nulls
    const val: unknown = this.ticketForm.value;
    this.supportService.createTicket(val as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Ticket created successfully');
        this.ticketForm.reset({ category: 'technical' });
        this.isCreating.set(false);
        this.currentPage.set(1);
        this.loadTickets();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastService.error(err.error?.message || 'Failed to create ticket');
      },
    });
  }

  goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }
    this.currentPage.update((value) => value + 1);
    this.loadTickets();
  }

  goToPreviousPage(): void {
    if (this.currentPage() <= 1 || this.isLoading()) {
      return;
    }
    this.currentPage.update((value) => Math.max(1, value - 1));
    this.loadTickets();
  }

  pageSummary(): string {
    if (this.isLoading()) {
      return 'Loading...';
    }
    const total = this.totalTickets();
    if (total === 0) {
      return 'No results';
    }
    const from = (this.currentPage() - 1) * this.pageSize + 1;
    const to = Math.min(this.currentPage() * this.pageSize, total);
    return `${from}-${to} of ${total}`;
  }
}
