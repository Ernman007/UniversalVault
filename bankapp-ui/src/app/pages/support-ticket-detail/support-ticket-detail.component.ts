import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Send,
  User,
  Shield,
  Clock,
  Paperclip,
  CheckCircle,
} from 'lucide-angular';

import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { SupportService } from '../../services/support/support.service';
import { SupportSocketService } from '../../services/socket/support-socket.service';
import { AdminService } from '../../services/admin/admin.service';

interface TicketMessage {
  _id: string;
  sender: { _id: string; name: string; email: string; role: string };
  body: string;
  createdAt: string;
  attachments?: string[];
}

interface TicketDetail {
  _id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority?: string;
  createdBy: { _id: string; name: string; email: string; role: string };
  assignee?: { _id: string; name: string; email: string; role: string };
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-support-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="bg-slate-50 min-h-screen pb-24">
      <div class="bg-white shadow-sm">
        <div class="px-5 py-4">
          <div class="max-w-lg mx-auto">
            <div class="flex items-center gap-4 mb-4">
              <a
                routerLink="/user/support"
                class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
              >
                <lucide-icon [img]="arrowLeft" class="w-5 h-5 text-slate-600"></lucide-icon>
              </a>
              <h1 class="text-lg font-bold text-slate-900">Ticket Details</h1>
            </div>

            @if (ticket(); as t) {
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full"
                  [class]="statusClass(t.status)"
                >
                  {{ t.status | titlecase }}
                </span>
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600"
                >
                  {{ t.category | titlecase }}
                </span>
                <span class="text-xs text-slate-400">#{{ t._id.slice(-6) }}</span>
                
                @if (isAdmin && t.status !== 'closed' && t.status !== 'resolved') {
                  <button
                    (click)="resolveTicket()"
                    [disabled]="resolving()"
                    class="ml-auto px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1.5"
                  >
                    @if (resolving()) {
                      <span class="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                    } @else {
                      <lucide-icon [img]="checkCircle" class="w-3.5 h-3.5"></lucide-icon>
                    }
                    Resolve Ticket
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          @if (loading()) {
            <div class="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p class="text-slate-500">Loading ticket...</p>
            </div>
          } @else if (ticket(); as t) {
            <div class="space-y-4">
              <div class="bg-white rounded-2xl shadow-sm p-5">
                <h2 class="text-base font-bold text-slate-900 mb-2">{{ t.subject }}</h2>
                <p class="text-sm text-slate-600 leading-relaxed">{{ t.description }}</p>
                <div class="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                  <div class="flex items-center gap-1.5 text-xs text-slate-400">
                    <lucide-icon [img]="clock" class="w-3.5 h-3.5"></lucide-icon>
                    <span>{{ t.createdAt | date: 'medium' }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-slate-400">
                    <lucide-icon [img]="user" class="w-3.5 h-3.5"></lucide-icon>
                    <span>{{ t.createdBy.name }}</span>
                  </div>
                </div>
              </div>

              @for (message of t.messages; track message._id) {
                <div
                  class="bg-white rounded-2xl shadow-sm p-4"
                  [class]="message.sender._id === currentUserId ? 'ml-8' : 'mr-8'"
                >
                  <div class="flex items-start gap-3">
                    <div
                      [class]="
                        message.sender._id === currentUserId ? 'bg-blue-100' : 'bg-slate-100'
                      "
                      class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    >
                      <lucide-icon
                        [img]="message.sender.role === 'admin' ? shield : user"
                        [class]="
                          message.sender._id === currentUserId
                            ? 'w-4 h-4 text-blue-600'
                            : 'w-4 h-4 text-slate-500'
                        "
                      >
                      </lucide-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-slate-900">{{
                          message.sender.role === 'admin' ? agentDisplayName(t.category) : message.sender.name
                        }}</span>
                        @if (message.sender.role === 'admin') {
                          <span class="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded font-medium"
                            >{{ agentBadge(t.category) }}</span
                          >
                        }
                        <span class="text-xs text-slate-400">{{
                          message.createdAt | date: 'short'
                        }}</span>
                      </div>
                      <p class="text-sm text-slate-700 leading-relaxed">{{ message.body }}</p>
                      @if (message.attachments && message.attachments.length > 0) {
                        <div class="flex items-center gap-1 mt-2 text-xs text-blue-600">
                          <lucide-icon [img]="paperclip" class="w-3.5 h-3.5"></lucide-icon>
                          <span>{{ message.attachments.length }} attachment(s)</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              @if (t.status !== 'closed' && t.status !== 'resolved') {
                <div class="bg-white rounded-2xl shadow-sm p-4 sticky bottom-20">
                  <form (ngSubmit)="sendReply()" class="flex items-end gap-3">
                    <div class="flex-1">
                      <textarea
                        [ngModel]="replyText()"
                        (ngModelChange)="replyText.set($event)"
                        name="replyText"
                        rows="2"
                        placeholder="Type your reply..."
                        class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm text-slate-900 placeholder-slate-400"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      [disabled]="!replyText().trim() || sending()"
                      class="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      @if (sending()) {
                        <div
                          class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        ></div>
                      } @else {
                        <lucide-icon [img]="send" class="w-5 h-5"></lucide-icon>
                      }
                    </button>
                  </form>
                </div>
              } @else {
                <div class="bg-slate-100 rounded-2xl p-4 text-center">
                  <p class="text-sm text-slate-500">This ticket has been resolved or closed</p>
                </div>
              }
            </div>
          } @else {
            <div class="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p class="text-slate-500">Ticket not found</p>
              <a
                routerLink="/user/support"
                class="mt-3 inline-block text-blue-600 hover:text-blue-700 text-sm"
                >Back to support</a
              >
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SupportTicketDetailComponent implements OnInit, OnDestroy {
  ticket = signal<TicketDetail | null>(null);
  loading = signal<boolean>(true);
  replyText = signal<string>('');
  sending = signal<boolean>(false);
  resolving = signal<boolean>(false);
  currentUserId = '';
  isAdmin = false;
  
  private destroy$ = new Subject<void>();

  private route = inject(ActivatedRoute);
  private supportService = inject(SupportService);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private supportSocket = inject(SupportSocketService);

  arrowLeft = ArrowLeft;
  send = Send;
  user = User;
  shield = Shield;
  clock = Clock;
  paperclip = Paperclip;
  checkCircle = CheckCircle;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const user = this.authService.currentUser();
    this.currentUserId = user?._id || '';
    this.isAdmin = user?.role === 'admin';

    if (!id) {
      this.loading.set(false);
      return;
    }
    this.loadTicket(id);

    this.supportSocket.joinTicket(id);

    this.supportSocket.onTicketMessage((data) => {
      if (data.ticketId === id) {
        this.ticket.update((currentTicket: TicketDetail | null) => {
          if (!currentTicket) return currentTicket;
          const messageExists = currentTicket.messages.some((m: any) => m._id === data.message._id);
          if (!messageExists) {
            return {
              ...currentTicket,
              messages: [...currentTicket.messages, data.message]
            };
          }
          return currentTicket;
        });
      }
    });

    this.supportSocket.onTicketStatusChanged((data) => {
      if (data.ticketId === id) {
        this.ticket.update((currentTicket: TicketDetail | null) => {
          if (!currentTicket) return currentTicket;
          const updated = { ...currentTicket, status: data.status };
          if (data.assignee) updated.assignee = data.assignee;
          return updated;
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.supportSocket.leaveTicket(id);
    }
    this.supportSocket.offTicketEvents();
  }

  loadTicket(id: string): void {
    this.loading.set(true);
    console.log(`[SupportTicketDetailComponent] calling supportService.getTicketDetails(${id})`);
    this.supportService.getTicketDetails(id).subscribe({
      next: (response: any) => {
        console.log(`[SupportTicketDetailComponent] getTicketDetails RESPONSE:`, response);
        if (response && response.ticket && response.messages !== undefined) {
          this.ticket.set({ ...response.ticket, messages: response.messages });
        } else {
          this.ticket.set(response);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error(`[SupportTicketDetailComponent] getTicketDetails ERROR:`, err);
        this.loading.set(false);
        this.toast.error('Failed to load ticket');
      },
    });
  }

  sendReply(): void {
    const currentText = this.replyText();
    const currentTicket = this.ticket();
    if (!currentText.trim() || !currentTicket || this.sending()) return;
    
    this.sending.set(true);
    this.supportService.replyToTicket(currentTicket._id, currentText.trim()).subscribe({
      next: () => {
        this.sending.set(false);
        this.replyText.set('');
        this.loadTicket(currentTicket._id);
        this.toast.success('Reply sent');
      },
      error: () => {
        this.sending.set(false);
        this.toast.error('Failed to send reply');
      },
    });
  }

  resolveTicket(): void {
    const currentTicket = this.ticket();
    if (!currentTicket || this.resolving()) return;
    
    this.resolving.set(true);
    this.adminService.resolveTicket(currentTicket._id).subscribe({
      next: () => {
        this.resolving.set(false);
        this.toast.success('Ticket marked as resolved');
      },
      error: () => {
        this.resolving.set(false);
        this.toast.error('Failed to resolve ticket');
      }
    });
  }

  private readonly agentNames: Record<string, string> = {
    account: 'Account Support',
    card: 'Card Services',
    loan: 'Loan Advisory',
    technical: 'Technical Support',
    other: 'Customer Support',
  };

  private readonly agentBadges: Record<string, string> = {
    account: 'Accounts Team',
    card: 'Cards Team',
    loan: 'Loans Team',
    technical: 'Tech Team',
    other: 'Support Team',
  };

  agentDisplayName(category: string): string {
    return this.agentNames[category] || 'Customer Support';
  }

  agentBadge(category: string): string {
    return this.agentBadges[category] || 'Support Team';
  }

  statusClass(status: string): string {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-blue-100 text-blue-700';
      case 'closed':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
