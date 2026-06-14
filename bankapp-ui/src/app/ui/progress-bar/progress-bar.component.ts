import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      @if (showLabel) {
        <div class="flex justify-between text-sm mb-1">
          <span class="text-slate-500">{{ label }}</span>
          <span class="font-medium text-slate-900">{{ percentage }}%</span>
        </div>
      }
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden" [class.h-3]="size === 'lg'">
        <div
          class="h-full rounded-full transition-all duration-300"
          [class.bg-blue-600]="color === 'blue'"
          [class.bg-emerald-600]="color === 'emerald'"
          [class.bg-amber-500]="color === 'amber'"
          [class.bg-red-600]="color === 'red'"
          [class.bg-gradient-to-r]="color === 'gradient'"
          [class.from-blue-600]="color === 'gradient'"
          [class.to-purple-600]="color === 'gradient'"
          [style.width.%]="percentage"
        ></div>
      </div>
    </div>
  `,
})
export class ProgressBarComponent {
  @Input() percentage = 0;
  @Input() label = '';
  @Input() showLabel = false;
  @Input() color: 'blue' | 'emerald' | 'amber' | 'red' | 'gradient' = 'blue';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
