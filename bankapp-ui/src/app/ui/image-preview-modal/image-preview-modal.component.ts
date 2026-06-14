import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-image-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        (click)="close()"
      >
        <div
          class="bg-white rounded-2xl overflow-hidden max-w-lg w-full"
          (click)="$event.stopPropagation()"
        >
          <div class="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <h3 class="font-bold">ID Document Preview</h3>
            <button (click)="close()" class="p-1 hover:bg-slate-700 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="p-4 bg-slate-100">
            <img
              [src]="imageUrl"
              alt="ID Document"
              class="w-full rounded-lg shadow-lg max-h-[60vh] object-contain"
            />
          </div>
          <div class="p-4 bg-white flex justify-end">
            <button
              (click)="close()"
              class="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImagePreviewModalComponent {
  @Input() isOpen = false;
  @Input() imageUrl = '';
  @Output() closed = new EventEmitter<void>();

  close() {
    this.isOpen = false;
    this.closed.emit();
  }
}
