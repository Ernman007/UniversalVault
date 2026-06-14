import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      class="flex items-center justify-center rounded-xl transition-colors touch-active"
      [class.w-10]="size === 'md'"
      [class.h-10]="size === 'md'"
      [class.w-12]="size === 'lg'"
      [class.h-12]="size === 'lg'"
      [class.w-8]="size === 'sm'"
      [class.h-8]="size === 'sm'"
      [class.bg-blue-100]="variant === 'primary' && !disabled"
      [class.text-blue-600]="variant === 'primary'"
      [class.hover:bg-blue-200]="variant === 'primary' && !disabled"
      [class.bg-emerald-100]="variant === 'success' && !disabled"
      [class.text-emerald-600]="variant === 'success'"
      [class.hover:bg-emerald-200]="variant === 'success' && !disabled"
      [class.bg-amber-100]="variant === 'warning' && !disabled"
      [class.text-amber-600]="variant === 'warning'"
      [class.hover:bg-amber-200]="variant === 'warning' && !disabled"
      [class.bg-red-100]="variant === 'danger' && !disabled"
      [class.text-red-600]="variant === 'danger'"
      [class.hover:bg-red-200]="variant === 'danger' && !disabled"
      [class.bg-purple-100]="variant === 'purple' && !disabled"
      [class.text-purple-600]="variant === 'purple'"
      [class.hover:bg-purple-200]="variant === 'purple' && !disabled"
      [class.bg-slate-100]="variant === 'default' && !disabled"
      [class.text-slate-600]="variant === 'default'"
      [class.hover:bg-slate-200]="variant === 'default' && !disabled"
      [class.opacity-50]="disabled"
      [class.cursor-not-allowed]="disabled"
    >
      @if (icon) {
        <lucide-icon
          [img]="icon"
          [class.w-5]="size === 'md'"
          [class.h-5]="size === 'md'"
          [class.w-6]="size === 'lg'"
          [class.h-6]="size === 'lg'"
          [class.w-4]="size === 'sm'"
          [class.h-4]="size === 'sm'"
        ></lucide-icon>
      }
    </button>
  `,
})
export class IconButtonComponent {
  @Input() icon: LucideIconData | null = null;
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'default' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
}
