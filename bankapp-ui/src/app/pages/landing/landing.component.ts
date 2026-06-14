import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Landmark,
  ShieldCheck,
  Zap,
  Smartphone,
  Download,
} from 'lucide-angular';

import { AppConfigService } from '../../services/app-config/app-config.service';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, ButtonComponent],
  template: `
    <div class="bg-slate-50 min-h-screen">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-blue-600"></div>

      <!-- Hero Section -->
      <div
        class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 pt-12 pb-16 rounded-b-3xl"
      >
        <div class="max-w-sm mx-auto text-center">
          <!-- Logo -->
          <div
            class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <lucide-icon [img]="landmark" class="w-8 h-8"></lucide-icon>
          </div>
          <h1 class="text-2xl font-bold mb-2">{{ bankName() }}</h1>
          <p class="text-blue-100 text-sm">Modern banking at your fingertips</p>
        </div>
      </div>

      <!-- Features -->
      <div class="px-6 -mt-8">
        <div class="max-w-sm mx-auto">
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Why {{ bankName() }}?</h2>
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <lucide-icon [img]="shieldCheck" class="w-5 h-5 text-emerald-600"></lucide-icon>
                </div>
                <div>
                  <h3 class="font-medium text-slate-900">Secure Banking</h3>
                  <p class="text-sm text-slate-500">
                    Bank-grade encryption protects every transaction
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <lucide-icon [img]="zap" class="w-5 h-5 text-blue-600"></lucide-icon>
                </div>
                <div>
                  <h3 class="font-medium text-slate-900">Instant Transfers</h3>
                  <p class="text-sm text-slate-500">Send money in seconds, not hours</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <lucide-icon [img]="smartphone" class="w-5 h-5 text-purple-600"></lucide-icon>
                </div>
                <div>
                  <h3 class="font-medium text-slate-900">Mobile First</h3>
                  <p class="text-sm text-slate-500">Install as an app on your phone or computer</p>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="space-y-3">
            <app-button variant="primary" size="lg" [fullWidth]="true" routerLink="/login">
              Sign In
            </app-button>
            <app-button variant="secondary" size="lg" [fullWidth]="true" routerLink="/open-account">
              Open an Account
            </app-button>
          </div>

          <!-- Install PWA -->
          <div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div class="flex items-center gap-2 text-blue-700 mb-1">
              <lucide-icon [img]="download" class="w-4 h-4"></lucide-icon>
              <span class="text-sm font-semibold">Install {{ bankName() }}</span>
            </div>
            <p class="text-xs text-blue-600 mb-3">
              Add to your home screen for quick access and a native app experience.
            </p>
            <button
              (click)="installPwa()"
              class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              <lucide-icon [img]="download" class="w-4 h-4"></lucide-icon>
              <span>Install App</span>
            </button>
          </div>

          <!-- Additional Links -->
          <div class="flex justify-center gap-6 mt-6 text-sm">
            <a routerLink="/products" class="text-slate-500 hover:text-blue-600">Products</a>
            <a routerLink="/support" class="text-slate-500 hover:text-blue-600">Support</a>
          </div>
        </div>
      </div>

      <!-- Safe area bottom -->
      <div class="h-8 safe-bottom"></div>
    </div>
  `,
})
export class LandingComponent {
  private appConfig = inject(AppConfigService);
  readonly bankName = this.appConfig.bankName;
  landmark = Landmark;
  shieldCheck = ShieldCheck;
  zap = Zap;
  smartphone = Smartphone;
  download = Download;

  installPwa(): void {
    // Trigger the browser's PWA install prompt if available
    if ((window as any).deferredPrompt) {
      (window as any).deferredPrompt.prompt();
      (window as any).deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User installed the PWA');
        }
        (window as any).deferredPrompt = null;
      });
    } else {
      // Fallback instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMac = /Macintosh/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      let instructions = 'To install this app:';
      if (isIOS) {
        instructions = 'Tap the Share button (square with arrow) → Add to Home Screen';
      } else if (isAndroid) {
        instructions = 'Tap the menu (⋮) → Install app';
      } else if (isMac) {
        instructions = 'Click the install icon in the address bar → Install';
      } else {
        instructions = 'Click the install icon in your browser address bar to add to your device.';
      }
      alert(instructions);
    }
  }
}
