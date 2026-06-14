import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, MessageSquare, Clock, Trash2 } from 'lucide-angular';

import { AdminService } from '../../services/admin/admin.service';
import { ToastService } from '../../services/notification/toast.service';

@Component({
  selector: 'app-admin-support-tickets',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
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
            <h1 class="text-lg font-bold">Support Conversations</h1>
          </div>
        </div>
      </div>
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto space-y-4">
          @if (isLoading()) {
            <p class="text-center text-slate-500 py-10">Loading tickets...</p>
          } @else if (tickets().length === 0) {
            <p class="text-center text-slate-500 py-10 bg-white rounded-xl">
              No support tickets found.
            </p>
          } @else {
            @for (ticket of tickets(); track ticket._id) {
              <div class="bg-white rounded-xl shadow-sm p-4 hover:bg-slate-50 transition-colors">
                <a [routerLink]="['/admin/tickets', ticket._id]" class="block">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <h3 class="font-bold text-slate-900">{{ ticket.subject }}</h3>
                      <p class="text-xs text-slate-500">
                        From: {{ ticket.createdBy?.name || 'Unknown' }}
                      </p>
                    </div>
                    <span
                      class="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full"
                      [ngClass]="{
                        'bg-amber-100 text-amber-700': ticket.status === 'open',
                        'bg-blue-100 text-blue-700': ticket.status === 'pending',
                        'bg-emerald-100 text-emerald-700': ticket.status === 'resolved',
                        'bg-slate-100 text-slate-600': ticket.status === 'closed'
                      }"
                    >
                      {{ ticket.status }}
                    </span>
                  </div>
                  <p class="text-sm text-slate-700 line-clamp-2 mb-3">
                    {{ ticket.description || 'No description provided.' }}
                  </p>
                  <div class="flex items-center gap-4 pt-3 border-t border-slate-100">
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                      <lucide-icon [img]="clock" class="w-3.5 h-3.5"></lucide-icon>
                      <span>Updated {{ ticket.updatedAt | date: 'short' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                      <lucide-icon [img]="messageSquare" class="w-3.5 h-3.5"></lucide-icon>
                      <span>{{ ticket.category | titlecase }}</span>
                    </div>
                  </div>
                </a>
                @if (ticket.status === 'resolved' || ticket.status === 'closed') {
                  <div class="flex justify-end pt-2 mt-2 border-t border-slate-100">
                    <button
                      (click)="deleteTicket(ticket._id, $event)"
                      [disabled]="deletingId() === ticket._id"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      @if (deletingId() === ticket._id) {
                        <span class="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                      } @else {
                        <lucide-icon [img]="trash2" class="w-3.5 h-3.5"></lucide-icon>
                      }
                      Delete
                    </button>
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminSupportTicketsComponent implements OnInit {
  arrowLeft = ArrowLeft;
  messageSquare = MessageSquare;
  clock = Clock;
  trash2 = Trash2;

  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  tickets = signal<any[]>([]);
  isLoading = signal(true);
  deletingId = signal<string | null>(null);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading.set(true);
    this.adminService.getSupportTickets().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data?.tickets || res?.tickets || res?.data || []);
        // Show open/pending at top
        list.sort((a: any, b: any) => {
          if (a.status === 'open' && b.status !== 'open') return -1;
          if (a.status !== 'open' && b.status === 'open') return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        this.tickets.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tickets', err);
        this.isLoading.set(false);
      }
    });
  }

  deleteTicket(id: string, event: Event) {
    event.stopPropagation();
    if (this.deletingId()) return;

    this.deletingId.set(id);
    this.adminService.deleteTicket(id).subscribe({
      next: () => {
        this.tickets.update(list => list.filter(t => t._id !== id));
        this.deletingId.set(null);
        this.toast.success('Ticket deleted');
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Failed to delete ticket');
      }
    });
  }
}
