import { CommonModule, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <button [type]="type" [disabled]="disabled || loading" [ngClass]="buttonClasses">
      @if (loading) {
        <svg
          class="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;

  get buttonClasses(): string {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors touch-active';
    const sizeClasses = this.sizeClasses;
    const variantClasses = this.variantClasses;
    const stateClasses = this.stateClasses;
    return `${base} ${sizeClasses} ${variantClasses} ${stateClasses}`.trim();
  }

  private get sizeClasses(): string {
    switch (this.size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  }

  private get variantClasses(): string {
    switch (this.variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'secondary':
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
      case 'ghost':
        return 'bg-transparent text-slate-600 hover:bg-slate-100';
      case 'destructive':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'outline':
        return 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';
      default:
        return '';
    }
  }

  private get stateClasses(): string {
    const classes: string[] = [];
    if (this.fullWidth) classes.push('w-full');
    if (this.disabled || this.loading)
      classes.push('opacity-50 cursor-not-allowed pointer-events-none');
    return classes.join(' ');
  }
}
