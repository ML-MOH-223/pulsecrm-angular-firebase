import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';
import { CRM_STORE } from '../../core/state/crm.store';

export type ActiveTab = 'pipeline' | 'contacts';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CurrencyPipe, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #sidebarBody>
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Espace Commercial
        </p>

        <button
          type="button"
          (click)="tabSelected.emit('pipeline')"
          [class]="activeTab() === 'pipeline'
            ? 'flex w-full items-center justify-between rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30'
            : 'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'"
        >
          <span class="flex items-center gap-3">
            <svg class="h-4 w-4" [class]="activeTab() === 'pipeline' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Pipeline Kanban
          </span>
          <span
            [class]="activeTab() === 'pipeline'
              ? 'rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 tabular-nums dark:bg-sky-500/20 dark:text-sky-300'
              : 'rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 tabular-nums dark:bg-slate-800 dark:text-slate-400'"
          >
            {{ store.deals().length }}
          </span>
        </button>

        <button
          type="button"
          (click)="tabSelected.emit('contacts')"
          [class]="activeTab() === 'contacts'
            ? 'flex w-full items-center justify-between rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30'
            : 'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'"
        >
          <span class="flex items-center gap-3">
            <svg class="h-4 w-4" [class]="activeTab() === 'contacts' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Contacts
          </span>
          <span
            [class]="activeTab() === 'contacts'
              ? 'rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 tabular-nums dark:bg-sky-500/20 dark:text-sky-300'
              : 'rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 tabular-nums dark:bg-slate-800 dark:text-slate-400'"
          >
            {{ store.contacts().length }}
          </span>
        </button>

        <div class="pt-5">
          <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Analytique & Cloud
          </p>

          <button
            type="button"
            (click)="forecastRequested.emit()"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
          >
            <svg class="h-4 w-4 text-sky-500 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Prévisions mensuelles
          </button>

          @if (store.syncMode() === 'firestore' && store.deals().length === 0) {
            <button
              type="button"
              (click)="seedRequested.emit()"
              class="mt-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-sky-300 px-3 py-2.5 text-xs font-medium text-sky-700 transition hover:border-sky-500 hover:bg-sky-50 dark:border-slate-700 dark:text-sky-300 dark:hover:border-sky-500 dark:hover:bg-sky-500/10"
            >
              <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Importer données démo
            </button>
          }
        </div>

        <div class="pt-5">
          <div class="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800/90 dark:bg-slate-800/40">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Revenu pondéré actif
            </p>
            <p class="mt-1 font-display text-lg font-bold text-slate-900 tabular-nums dark:text-white">
              {{ store.pipelineMetrics().weightedRevenue | currency:'EUR':'symbol':'1.0-0':'fr' }}
            </p>
            <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {{ store.activities().length }} activités enregistrées
            </p>
          </div>
        </div>
      </nav>

      <div class="space-y-2 border-t border-slate-200/80 p-3.5 dark:border-slate-800/80">
        <div class="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 text-xs font-bold uppercase text-white">
            {{ getUserInitials() }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {{ authStore.user()?.displayName }}
            </p>
            <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {{ authStore.user()?.email || 'Session démo' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          (click)="signOutRequested.emit()"
          class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 sm:min-h-[36px]"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </ng-template>

    @if (mobileOpen()) {
      <div
        class="fixed inset-0 z-50 flex lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
      >
        <div
          class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          (click)="mobileClosed.emit()"
        ></div>

        <aside class="relative z-10 flex h-[100dvh] w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white text-slate-700 shadow-2xl dark:border-slate-800/80 dark:bg-[#0d1424] dark:text-slate-300">
          <div class="flex h-14 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800/80">
            <div class="flex items-center gap-2.5">
              <img src="pulsecrm-icon.png" alt="PulseCRM" width="32" height="32" class="h-8 w-8 shrink-0 object-contain" />
              <div class="min-w-0">
                <span class="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  pulse<span class="text-sky-500">CRM</span>
                </span>
                <div class="flex items-center gap-1.5">
                  <span [class]="store.syncMode() === 'firestore' ? 'h-1.5 w-1.5 rounded-full bg-emerald-400' : 'h-1.5 w-1.5 rounded-full bg-amber-400'"></span>
                  <span [class]="store.syncMode() === 'firestore' ? 'text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400' : 'text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400'">
                    {{ store.syncMode() === 'firestore' ? 'Synchronisé' : 'Mode Démo' }}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              (click)="mobileClosed.emit()"
              aria-label="Fermer le menu"
              class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ng-container *ngTemplateOutlet="sidebarBody" />
        </aside>
      </div>
    }

    <aside class="hidden border-r border-slate-200/80 bg-white text-slate-700 transition-colors duration-200 dark:border-slate-800/80 dark:bg-[#0d1424] dark:text-slate-300 lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-64 lg:shrink-0 lg:flex-col">
      <div class="flex h-16 items-center gap-2.5 border-b border-slate-200/80 px-5 dark:border-slate-800/80">
        <img src="pulsecrm-icon.png" alt="PulseCRM" width="36" height="36" class="h-9 w-9 shrink-0 object-contain" />
        <div class="min-w-0">
          <span class="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
            pulse<span class="text-sky-500">CRM</span>
          </span>
          <div class="flex items-center gap-1.5">
            @if (store.syncMode() === 'firestore') {
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Synchronisé
              </span>
            } @else {
              <span class="h-2 w-2 rounded-full bg-amber-400"></span>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Mode Démo Local
              </span>
            }
          </div>
        </div>
      </div>
      <ng-container *ngTemplateOutlet="sidebarBody" />
    </aside>
  `,
})
export class AppSidebarComponent {
  readonly authStore = inject(AuthStore);
  readonly store = inject(CRM_STORE);

  readonly activeTab = input.required<ActiveTab>();
  readonly mobileOpen = input<boolean>(false);

  readonly tabSelected = output<ActiveTab>();
  readonly mobileClosed = output<void>();
  readonly forecastRequested = output<void>();
  readonly seedRequested = output<void>();
  readonly signOutRequested = output<void>();

  getUserInitials(): string {
    const name = this.authStore.user()?.displayName?.trim() || 'U';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
