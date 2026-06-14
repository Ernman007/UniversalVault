import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Upload, Loader, X } from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';
import { SupportService } from '../../services/support/support.service';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-open-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule, ButtonComponent],
  template: `
    <div class="bg-slate-50 min-h-screen pb-8">
      <div class="status-bar-spacer bg-blue-600"></div>

      <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-6 pb-20">
        <div class="max-w-2xl mx-auto">
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6"
          >
            <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            <span class="text-sm">Back</span>
          </a>
          <div class="text-center">
            <div
              class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <lucide-icon [img]="uploadIcon" class="w-8 h-8"></lucide-icon>
            </div>
            <h1 class="text-2xl font-bold">Open a New Account</h1>
            <p class="text-blue-100 mt-1">Complete the form below to start your banking journey</p>
          </div>
        </div>
      </div>

      <div class="px-5 -mt-12">
        <div class="max-w-2xl mx-auto">
          <form
            [formGroup]="accountForm"
            (ngSubmit)="onSubmit()"
            class="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Personal Information -->
              <div class="space-y-5">
                <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <h3 class="text-lg font-bold text-slate-900">Personal Information</h3>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      formControlName="name"
                      placeholder="Enter your full name"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900 placeholder-slate-400"
                    />
                    @if (accountForm.get('name')?.touched && accountForm.get('name')?.invalid) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Name is required (min 3 characters)</span>
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      formControlName="email"
                      placeholder="Enter your email"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900 placeholder-slate-400"
                    />
                    @if (accountForm.get('email')?.touched && accountForm.get('email')?.invalid) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Please enter a valid email</span>
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <input
                      type="password"
                      formControlName="password"
                      placeholder="Create a password"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900 placeholder-slate-400"
                    />
                    @if (
                      accountForm.get('password')?.touched && accountForm.get('password')?.invalid
                    ) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Minimum 8 chars with uppercase, lowercase & number</span>
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5"
                      >Phone Number</label
                    >
                    <input
                      type="tel"
                      formControlName="phone"
                      placeholder="Enter your phone number"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900 placeholder-slate-400"
                    />
                    @if (accountForm.get('phone')?.touched && accountForm.get('phone')?.invalid) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Please enter a valid phone number</span>
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                    <textarea
                      formControlName="address"
                      rows="3"
                      placeholder="Enter your full address"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none text-slate-900 placeholder-slate-400"
                    ></textarea>
                    @if (
                      accountForm.get('address')?.touched && accountForm.get('address')?.invalid
                    ) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Address is required</span>
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1.5"
                      >Date of Birth</label
                    >
                    <input
                      type="date"
                      formControlName="dob"
                      class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900"
                    />
                    @if (accountForm.get('dob')?.touched && accountForm.get('dob')?.invalid) {
                      <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <span>Date of birth is required</span>
                      </p>
                    }
                  </div>
                </div>
              </div>

              <!-- Account Details -->
              <div class="space-y-5">
                <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <h3 class="text-lg font-bold text-slate-900">Account Details</h3>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5"
                    >Account Type</label
                  >
                  <select
                    formControlName="accountType"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-slate-900"
                  >
                    <option value="">Select account type</option>
                    <option value="savings">Savings Account</option>
                    <option value="checking">Checking Account</option>
                    <option value="investment">Investment Account</option>
                  </select>
                  @if (
                    accountForm.get('accountType')?.touched &&
                    accountForm.get('accountType')?.invalid
                  ) {
                    <p class="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <span>Please select an account type</span>
                    </p>
                  }
                </div>

                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h4 class="text-base font-semibold text-slate-900">Identification Document</h4>
                  </div>
                  <p class="text-xs text-slate-500">
                    Upload a clear photo of your government-issued ID
                  </p>

                  <div
                    class="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer transition-all hover:border-blue-500 hover:bg-slate-50"
                    [class.border-red-500]="
                      accountForm.get('image')?.touched && accountForm.get('image')?.invalid
                    "
                    [class.bg-red-50]="
                      accountForm.get('image')?.touched && accountForm.get('image')?.invalid
                    "
                    (click)="fileInput.click()"
                  >
                    <input
                      type="file"
                      #fileInput
                      accept="image/*"
                      (change)="onFileSelected($event)"
                      class="hidden"
                    />

                    @if (!imagePreview) {
                      <div class="text-center">
                        <lucide-icon
                          [img]="uploadIcon"
                          class="w-12 h-12 text-blue-600 mx-auto mb-2"
                        ></lucide-icon>
                        <p class="text-sm font-medium text-slate-700 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <span class="text-xs text-slate-500">JPG, PNG (max 5MB)</span>
                      </div>
                    }

                    @if (imagePreview) {
                      <div class="relative">
                        <img
                          [src]="imagePreview"
                          alt="ID Preview"
                          class="w-full rounded-lg shadow-sm max-h-48 object-contain"
                        />
                        <button
                          type="button"
                          (click)="removeImage($event)"
                          class="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 shadow-lg"
                        >
                          <lucide-icon [img]="xIcon" class="w-4 h-4"></lucide-icon>
                        </button>
                      </div>
                    }
                  </div>
                  @if (accountForm.get('image')?.touched && accountForm.get('image')?.invalid) {
                    <p class="text-red-600 text-xs flex items-center gap-1">
                      <span>Please upload an identification document</span>
                    </p>
                  }
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                routerLink="/"
                class="px-6 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <app-button
                type="submit"
                variant="primary"
                size="lg"
                [loading]="loading"
                [disabled]="accountForm.invalid || loading"
              >
                <lucide-icon [img]="loader" class="w-5 h-5"></lucide-icon>
                <span>Submit Application</span>
              </app-button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class OpenAccountComponent {
  private fb = inject(FormBuilder);
  private supportService = inject(SupportService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  arrowLeft = ArrowLeft;
  uploadIcon = Upload;
  loader = Loader;
  xIcon = X;

  accountForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/),
      ],
    ],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    dob: ['', [Validators.required]],
    accountType: ['', [Validators.required]],
    image: [null, [Validators.required]],
  });

  imagePreview: string | null = null;
  selectedFile: File | null = null;
  loading = false;

  private setLoadingState(value: boolean): void {
    setTimeout(() => {
      this.loading = value;
      this.cdr.detectChanges();
    }, 0);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type.match(/image\/*/) && file.size <= 5 * 1024 * 1024) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreview = reader.result as string;
          this.accountForm.patchValue({ image: true });
          this.accountForm.get('image')?.markAsTouched();
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      } else {
        this.toast.error('Please select a valid image file under 5MB');
      }
    }
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.imagePreview = null;
    this.selectedFile = null;
    this.accountForm.patchValue({ image: null });
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      Object.values(this.accountForm.controls).forEach((control) => {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          Object.values(control.controls).forEach((c) => c.markAsTouched());
        }
      });
      return;
    }

    this.setLoadingState(true);
    const formData = this.accountForm.value;

    const messageText = `New account opening request from ${formData.name}.\n\nAccount Details:\n- Account Type: ${formData.accountType}\n- Phone: ${formData.phone}\n- Address: ${formData.address}\n- Date of Birth: ${formData.dob}`;

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('email', formData.email);
    dataToSend.append('password', formData.password);
    dataToSend.append('phone', formData.phone);
    dataToSend.append('address', formData.address);
    dataToSend.append('dob', formData.dob);
    dataToSend.append('accountType', formData.accountType);
    dataToSend.append('subject', 'New Account Opening Request');
    dataToSend.append('message', messageText);
    dataToSend.append('messageType', 'account-request');
    if (this.selectedFile) {
      dataToSend.append('image', this.selectedFile);
    }

    this.supportService.submitOpenAccountRequest(dataToSend).subscribe({
      next: () => {
        this.setLoadingState(false);
        this.toast.success(
          'Account request submitted successfully! We will review your application and contact you soon.',
        );
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
      error: (err) => {
        this.setLoadingState(false);
        this.toast.error(
          err.error?.message || 'Failed to submit account request. Please try again.',
        );
      },
    });
  }
}
