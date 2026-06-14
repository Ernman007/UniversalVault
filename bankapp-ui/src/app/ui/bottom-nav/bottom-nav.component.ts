import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Menu, LucideIconData } from 'lucide-angular';

export interface NavItem {
  label: string;
  icon: LucideIconData;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <nav
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 safe-bottom z-40"
    >
      <div class="max-w-lg mx-auto flex items-center justify-around py-2">
        @for (item of items; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="text-blue-600"
            [routerLinkActiveOptions]="{ exact: true }"
            class="relative flex flex-col items-center gap-1 px-3 py-2 text-slate-400 hover:text-slate-600"
          >
            <lucide-icon [img]="item.icon" class="w-5 h-5"></lucide-icon>
            @if (item.badge && item.badge > 0) {
              <span
                class="absolute -top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {{ item.badge > 99 ? '99+' : item.badge }}
              </span>
            }
            <span class="text-xs font-medium">{{ item.label }}</span>
          </a>
        }
        @if (showMore) {
          <button
            (click)="onMoreClick.emit()"
            class="flex flex-col items-center gap-1 px-3 py-2 text-slate-400 hover:text-slate-600"
          >
            <lucide-icon [img]="menuIcon" class="w-5 h-5"></lucide-icon>
            <span class="text-xs font-medium">More</span>
          </button>
        }
      </div>
    </nav>
  `,
})
export class BottomNavComponent {
  @Input() items: NavItem[] = [];
  @Input() showMore = true;
  @Output() onMoreClick = new EventEmitter<void>();

  menuIcon = Menu;
}
