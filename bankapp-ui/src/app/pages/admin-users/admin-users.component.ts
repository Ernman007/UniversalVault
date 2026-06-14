import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Plus,
  Search,
  LayoutDashboard,
  Users,
  FileCheck,
  MessageSquare,
} from 'lucide-angular';

import { ToastService } from '../../services/notification/toast.service';
import { UsersService, UserResponse } from '../../services/users/users.service';
import { BottomNavComponent, NavItem } from '../../ui/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, BottomNavComponent],
  template: `
    <div class="bg-slate-100 min-h-screen pb-20">
      <!-- Status bar spacer for PWA -->
      <div class="status-bar-spacer bg-slate-800 h-6 w-full"></div>

      <!-- Header -->
      <div class="bg-slate-800 text-white px-5 py-4 sticky top-0 z-30">
        <div class="max-w-lg mx-auto">
          <div class="flex items-center justify-between mb-3">
            <a
              routerLink="/admin/dashboard"
              class="w-10 h-10 flex items-center justify-center hover:bg-slate-700 rounded-xl transition-colors touch-active"
            >
              <lucide-icon [img]="arrowLeft" class="w-5 h-5"></lucide-icon>
            </a>
            <h1 class="text-lg font-bold">User Management</h1>
            <a
              routerLink="/admin/create-user"
              class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors touch-active"
            >
              <lucide-icon [img]="plus" class="w-5 h-5"></lucide-icon>
            </a>
          </div>

          <!-- Search -->
          <div class="relative">
            <lucide-icon
              [img]="search"
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            ></lucide-icon>
            <input
              type="text"
              placeholder="Search users by name or email..."
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              class="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="px-5 py-4">
        <div class="max-w-lg mx-auto">
          <!-- Stats -->
          <div class="flex gap-3 mb-4 overflow-x-auto hide-scrollbar -mx-1 px-1">
            <div class="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm min-w-[100px]">
              <p class="text-xs text-slate-500">Total</p>
              <p class="text-lg font-bold text-slate-900">{{ metrics().total }}</p>
            </div>
            <div class="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm min-w-[100px]">
              <p class="text-xs text-slate-500">Active</p>
              <p class="text-lg font-bold text-emerald-600">{{ metrics().active }}</p>
            </div>
            <div class="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm min-w-[100px]">
              <p class="text-xs text-slate-500">Admin</p>
              <p class="text-lg font-bold text-purple-600">{{ metrics().admin }}</p>
            </div>
            <div class="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm min-w-[100px]">
              <p class="text-xs text-slate-500">New Today</p>
              <p class="text-lg font-bold text-blue-600">{{ metrics().newToday }}</p>
            </div>
          </div>

          <!-- Filter Chips -->
          <div class="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
            <button
              (click)="filterType.set('all')"
              [ngClass]="
                filterType() === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border text-slate-600'
              "
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            >
              All Users
            </button>
            <button
              (click)="filterType.set('user')"
              [ngClass]="
                filterType() === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border text-slate-600'
              "
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            >
              Customers
            </button>
            <button
              (click)="filterType.set('admin')"
              [ngClass]="
                filterType() === 'admin'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border text-slate-600'
              "
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            >
              Admins
            </button>
          </div>

          <!-- Users List -->
          <div class="space-y-3">
            @for (user of filteredUsers(); track user._id) {
              <div class="bg-white rounded-xl shadow-sm p-4">
                <div class="flex items-center gap-3 mb-3">
                  <img
                    [src]="
                      'https://api.dicebear.com/9.x/avataaars/svg?seed=' + user.name + '&size=48'
                    "
                    alt="Avatar"
                    class="w-12 h-12 rounded-full bg-slate-100"
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-slate-900">{{ user.name }}</p>
                      <span
                        class="px-2 py-0.5 text-xs font-medium rounded-full"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-700':
                            user.status === 'active' && user.role !== 'admin',
                          'bg-purple-100 text-purple-700': user.role === 'admin',
                          'bg-amber-100 text-amber-700': user.status === 'pending',
                          'bg-slate-100 text-slate-700': user.status === 'inactive',
                        }"
                      >
                        {{ user.role === 'admin' ? 'Admin' : (user.status | titlecase) }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-500">{{ user.email }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center text-sm">
                  <div class="bg-slate-50 rounded-lg p-2">
                    <p class="text-xs text-slate-500">Joined</p>
                    <p class="font-semibold text-slate-900">
                      {{ user.createdAt | date: 'shortDate' }}
                    </p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-2">
                    <p class="text-xs text-slate-500">Role</p>
                    <p
                      class="font-semibold"
                      [ngClass]="user.role === 'admin' ? 'text-purple-600' : 'text-slate-900'"
                    >
                      {{ user.role | titlecase }}
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <a
                    [routerLink]="['/admin/edit-user', user._id]"
                    class="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors text-center"
                  >
                    Edit
                  </a>
                  <button
                    (click)="deleteUser(user._id)"
                    class="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-10 bg-white rounded-xl shadow-sm">
                <p class="text-slate-500 text-sm">No users found</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <app-bottom-nav [items]="navItems" [showMore]="false"></app-bottom-nav>
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  arrowLeft = ArrowLeft;
  plus = Plus;
  search = Search;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
    { label: 'Users', icon: Users, route: '/admin/users' },
    { label: 'Requests', icon: FileCheck, route: '/admin/transfer-requests' },
    { label: 'Support', icon: MessageSquare, route: '/admin/support-messages' },
  ];

  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  users = signal<UserResponse[]>([]);
  searchQuery = signal('');
  filterType = signal<'all' | 'user' | 'admin'>('all');

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const filter = this.filterType();

    return this.users().filter((u) => {
      const matchQuery =
        !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      const matchFilter = filter === 'all' || u.role === filter;
      return matchQuery && matchFilter;
    });
  });

  metrics = computed(() => {
    const list = this.users();
    const today = new Date().toDateString();
    return {
      total: list.length,
      active: list.filter((u) => u.status === 'active' || !u.status).length,
      admin: list.filter((u) => u.role === 'admin').length,
      newToday: list.filter((u) => new Date(u.createdAt).toDateString() === today).length,
    };
  });

  onSearchInput(event: any) {
    this.searchQuery.set(event.target.value);
  }

  deleteUser(id: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.deleteUser(id).subscribe({
        next: () => {
          this.toastService.success('User deleted successfully');
          this.users.update((list) => list.filter((u) => u._id !== id));
        },
        error: (err) => {
          this.toastService.error(err?.error?.message || 'Failed to delete user');
        },
      });
    }
  }

  ngOnInit() {
    this.usersService.getUsers().subscribe({
      next: (data) => {
        // Backend user model doesn't explicitly expose status unless we added it globally,
        // we map it if absent.
        this.users.set(data.map((u) => ({ ...u, status: u.status || 'active' })));
      },
      error: (err) => console.error('Failed to fetch users', err),
    });
  }
}
