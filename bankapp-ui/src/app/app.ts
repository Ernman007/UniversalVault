import { Component, OnDestroy, inject, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth/auth.service';
import { SocketService } from './services/socket/socket.service';
import { ToastContainerComponent } from './ui/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected readonly title = signal('bankapp-ui');

  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  constructor() {
    // Reactively connect/disconnect socket based on auth state
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.socketService.connect();
      } else {
        this.socketService.disconnect();
      }
    });
  }

  ngOnDestroy() {
    this.socketService.disconnect();
  }
}
