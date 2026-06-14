import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white rounded-xl shadow-sm"
      [class.p-4]="padding === 'md'"
      [class.p-5]="padding === 'lg'"
      [class.p-3]="padding === 'sm'"
    >
      @if (title) {
        <h3 class="font-semibold text-slate-900 mb-3">{{ title }}</h3>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  @Input() title = '';
  @Input() padding: 'sm' | 'md' | 'lg' = 'md';
}
