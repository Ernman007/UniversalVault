import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class SupportSocketService {
  private socket: Socket;
  private authService = inject(AuthService);

  constructor() {
    this.socket = io(`${environment.wsUrl}/support`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.auth = { token: this.authService.token() };
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  joinTicket(ticketId: string) {
    if (!this.socket.connected) {
      this.connect();
    }
    this.socket.emit('joinTicket', { ticketId });
  }

  leaveTicket(ticketId: string) {
    this.socket.emit('leaveTicket', { ticketId });
  }

  onTicketMessage(callback: (_data: any) => void) {
    this.socket.on('support_message', callback);
  }

  onTicketStatusChanged(callback: (_data: any) => void) {
    this.socket.on('support_ticket_updated', callback);
  }

  offTicketEvents() {
    this.socket.off('support_message');
    this.socket.off('support_ticket_updated');
  }
}
