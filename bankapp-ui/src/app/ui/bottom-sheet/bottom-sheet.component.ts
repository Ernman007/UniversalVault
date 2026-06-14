import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        (click)="onBackdropClick($event)"
        (keydown.escape)="close()"
      >
        <div
          class="bg-white w-full max-w-lg rounded-t-2xl p-4 slide-up"
          (click)="$event.stopPropagation()"
        >
          @if (title) {
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-slate-900">{{ title }}</h3>
              @if (showClose) {
                <button (click)="close()" class="p-1 hover:bg-slate-100 rounded-lg">
                  <lucide-icon [img]="xIcon" class="w-5 h-5 text-slate-500"></lucide-icon>
                </button>
              }
            </div>
          }
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
})
export class BottomSheetComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showClose = true;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  xIcon = X;

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.closed.emit();
  }

  open(): void {
    this.isOpen = true;
    this.isOpenChange.emit(true);
  }
}
