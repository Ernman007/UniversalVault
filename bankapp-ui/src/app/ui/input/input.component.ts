import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div>
      @if (label) {
        <label class="block text-sm font-medium text-slate-700 mb-1">{{ label }}</label>
      }
      <div class="relative">
        @if (icon) {
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <ng-content select="[input-icon]"></ng-content>
          </div>
        }
        <input
          [type]="showPassword ? 'text' : type"
          [value]="value"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [class.pl-11]="icon"
          [class.pl-10]="icon"
          [class.pr-11]="type === 'password'"
          class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400 bg-slate-50"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        @if (type === 'password') {
          <button
            type="button"
            (click)="togglePassword()"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            @if (showPassword) {
              <lucide-icon [img]="eyeOff" class="w-5 h-5"></lucide-icon>
            } @else {
              <lucide-icon [img]="eye" class="w-5 h-5"></lucide-icon>
            }
          </button>
        }
      </div>
      @if (error) {
        <p class="mt-1 text-sm text-red-600">{{ error }}</p>
      }
      @if (hint && !error) {
        <p class="mt-1 text-xs text-slate-500">{{ hint }}</p>
      }
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' = 'text';
  @Input() icon = false;
  @Input() disabled = false;
  @Input() error = '';
  @Input() hint = '';

  value = '';
  showPassword = false;

  eye = Eye;
  eyeOff = EyeOff;

  private onChange: (_value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(_value: string): void {
    this.value = _value || '';
  }

  registerOnChange(fn: (_value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
