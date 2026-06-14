import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-full bg-slate-100 flex items-center justify-center overflow-hidden"
      [class.w-8]="size === 'sm'"
      [class.h-8]="size === 'sm'"
      [class.w-10]="size === 'md'"
      [class.h-10]="size === 'md'"
      [class.w-12]="size === 'lg'"
      [class.h-12]="size === 'lg'"
      [class.w-16]="size === 'xl'"
      [class.h-16]="size === 'xl'"
    >
      @if (src) {
        <img [src]="src" [alt]="alt" class="w-full h-full object-cover" loading="lazy" />
      } @else {
        <span
          class="font-medium text-slate-600"
          [class.text-xs]="size === 'sm'"
          [class.text-sm]="size === 'md'"
          [class.text-base]="size === 'lg'"
          [class.text-lg]="size === 'xl'"
          >{{ initials }}</span
        >
      }
    </div>
  `,
})
export class AvatarComponent {
  @Input() src = '';
  @Input() alt = '';
  @Input() name = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  get initials(): string {
    if (!this.name) return '?';
    return this.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
